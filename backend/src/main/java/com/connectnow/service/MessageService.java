package com.connectnow.service;

import com.connectnow.dto.MessageDto;
import com.connectnow.dto.MessageStatusUpdateDto;
import com.connectnow.dto.SendMessageRequest;
import com.connectnow.model.*;
import com.connectnow.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageDeletionRepository messageDeletionRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageService(
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            ConversationMemberRepository conversationMemberRepository,
            MessageDeletionRepository messageDeletionRepository,
            BlockedUserRepository blockedUserRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.messageDeletionRepository = messageDeletionRepository;
        this.blockedUserRepository = blockedUserRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public MessageDto sendMessage(User sender, SendMessageRequest request) {
        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        // Verify membership
        ConversationMember senderMember = conversationMemberRepository.findByConversationAndUser(conversation, sender)
                .orElseThrow(() -> new SecurityException("You are not a member of this conversation"));

        // Check if recipient has blocked sender in DIRECT conversation
        if (conversation.getType() == ConversationType.DIRECT) {
            for (ConversationMember member : conversation.getMembers()) {
                if (!member.getUser().getId().equals(sender.getId())) {
                    if (blockedUserRepository.isBlockedBetween(sender, member.getUser())) {
                        throw new IllegalStateException("Cannot send message: conversation is blocked");
                    }
                }
            }
        }

        // Idempotency check with clientMessageId to prevent duplicate sends on network retries
        if (request.getClientMessageId() != null && !request.getClientMessageId().trim().isEmpty()) {
            Optional<Message> existing = messageRepository.findByClientMessageId(request.getClientMessageId().trim());
            if (existing.isPresent()) {
                return MessageDto.fromEntity(existing.get());
            }
        }

        Message message = new Message(
                conversation,
                sender,
                request.getClientMessageId(),
                request.getContent(),
                request.getMessageType() != null ? request.getMessageType() : MessageType.TEXT
        );

        if (request.getMediaUrl() != null) {
            message.setMediaUrl(request.getMediaUrl());
            message.setMediaFileName(request.getMediaFileName());
            message.setMediaFileSize(request.getMediaFileSize());
        }

        if (request.getReplyToMessageId() != null) {
            messageRepository.findById(request.getReplyToMessageId()).ifPresent(message::setReplyTo);
        }

        message = messageRepository.save(message);

        // Update conversation summary
        String preview = message.getContent();
        if (message.getMessageType() != MessageType.TEXT) {
            preview = "[" + message.getMessageType() + "]";
        }
        if (preview != null && preview.length() > 60) {
            preview = preview.substring(0, 57) + "...";
        }
        conversation.setLastMessagePreview(preview);
        conversation.setLastMessageAt(Instant.now());
        conversationRepository.save(conversation);

        // Increment unread count for other members
        List<ConversationMember> members = conversationMemberRepository.findByConversation(conversation);
        for (ConversationMember member : members) {
            if (!member.getUser().getId().equals(sender.getId())) {
                member.setUnreadCount(member.getUnreadCount() + 1);
                conversationMemberRepository.save(member);
            }
        }

        MessageDto dto = MessageDto.fromEntity(message);

        // Real-time dispatch via STOMP:
        // 1. Broadcast to conversation topic
        messagingTemplate.convertAndSend("/topic/conversations/" + conversation.getId(), dto);

        // 2. Direct message event to each member's personal user queue
        for (ConversationMember member : members) {
            if (!member.getUser().getId().equals(sender.getId())) {
                try {
                    messagingTemplate.convertAndSendToUser(
                            member.getUser().getUsername(),
                            "/queue/messages",
                            dto
                    );
                } catch (Exception e) {
                    // Ignore offline user dispatch failure
                }
            }
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> getConversationMessages(User currentUser, Long conversationId, int page, int size) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!conversationMemberRepository.existsByConversationAndUser(conversation, currentUser)) {
            throw new SecurityException("You are not authorized to view messages in this conversation");
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findVisibleMessagesForUser(conversation, currentUser.getId(), pageable);
        return messages.map(MessageDto::fromEntity);
    }

    @Transactional
    public void markConversationAsRead(User currentUser, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        ConversationMember member = conversationMemberRepository.findByConversationAndUser(conversation, currentUser)
                .orElseThrow(() -> new SecurityException("You are not a member of this conversation"));

        member.setUnreadCount(0);
        conversationMemberRepository.save(member);

        // Update all incoming messages in DB to READ
        messageRepository.markMessagesAsReadForUser(conversation, currentUser.getId());

        // Broadcast READ status to conversation channel
        MessageStatusUpdateDto update = new MessageStatusUpdateDto(
                null,
                conversationId,
                MessageStatus.READ,
                currentUser.getId()
        );
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId + "/receipts", update);
    }

    @Transactional
    public void deleteMessage(User currentUser, Long messageId, boolean forEveryone) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (forEveryone) {
            if (!message.getSender().getId().equals(currentUser.getId())) {
                throw new SecurityException("Only the sender can delete a message for everyone");
            }
            message.setDeletedForEveryone(true);
            messageRepository.save(message);

            MessageDto dto = MessageDto.fromEntity(message);
            messagingTemplate.convertAndSend("/topic/conversations/" + message.getConversation().getId(), dto);
        } else {
            // Delete for me
            if (!messageDeletionRepository.existsByUserAndMessage(currentUser, message)) {
                MessageDeletion deletion = new MessageDeletion(currentUser, message);
                messageDeletionRepository.save(deletion);
            }
        }
    }

    @Transactional
    public MessageDto editMessage(User currentUser, Long messageId, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getSender().getId().equals(currentUser.getId())) {
            throw new SecurityException("Only the sender can edit their message");
        }

        if (message.isDeletedForEveryone()) {
            throw new IllegalStateException("Cannot edit a deleted message");
        }

        message.setContent(newContent);
        message.setEdited(true);
        message = messageRepository.save(message);

        MessageDto dto = MessageDto.fromEntity(message);
        messagingTemplate.convertAndSend("/topic/conversations/" + message.getConversation().getId(), dto);
        return dto;
    }

    @Transactional
    public void clearConversationMessages(User currentUser, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!conversationMemberRepository.existsByConversationAndUser(conversation, currentUser)) {
            throw new SecurityException("You are not a member of this conversation");
        }

        Page<Message> messages = messageRepository.findVisibleMessagesForUser(conversation, currentUser.getId(), PageRequest.of(0, 1000));
        for (Message msg : messages.getContent()) {
            if (!messageDeletionRepository.existsByUserAndMessage(currentUser, msg)) {
                messageDeletionRepository.save(new MessageDeletion(currentUser, msg));
            }
        }
    }
}
