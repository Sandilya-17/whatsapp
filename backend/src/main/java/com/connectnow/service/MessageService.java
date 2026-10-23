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
import com.connectnow.push.PushService;
import com.connectnow.push.SessionTracker;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageDeletionRepository messageDeletionRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionTracker sessionTracker;
    private final PushService pushService;

    public MessageService(
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            ConversationMemberRepository conversationMemberRepository,
            MessageDeletionRepository messageDeletionRepository,
            BlockedUserRepository blockedUserRepository,
            SimpMessagingTemplate messagingTemplate,
            SessionTracker sessionTracker,
            PushService pushService) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.messageDeletionRepository = messageDeletionRepository;
        this.blockedUserRepository = blockedUserRepository;
        this.messagingTemplate = messagingTemplate;
        this.sessionTracker = sessionTracker;
        this.pushService = pushService;
    }

    /** Runs the task once the surrounding transaction has committed (so clients never react to rows that aren't visible yet). */
    private void afterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private boolean isOnline(User user) {
        return sessionTracker.isOnline(user.getUsername());
    }

    private void pushReceipt(User target, MessageStatusUpdateDto dto) {
        try {
            messagingTemplate.convertAndSendToUser(target.getUsername(), "/queue/receipts", dto);
        } catch (Exception ignored) {
            // offline user - they'll get the correct status from the DB when they next load the chat
        }
    }

    private String pushPreview(MessageDto dto) {
        MessageType t = dto.getMessageType();
        if (t == null || t == MessageType.TEXT || t == MessageType.SYSTEM) {
            String c = dto.getContent() == null ? "" : dto.getContent();
            return c.length() > 140 ? c.substring(0, 137) + "..." : c;
        }
        switch (t) {
            case IMAGE: return "\uD83D\uDCF7 Photo";
            case VIDEO: return "\uD83C\uDFA5 Video";
            case VOICE: return "\uD83C\uDFA4 Voice message";
            default: return "\uD83D\uDCCE " + (dto.getMediaFileName() != null ? dto.getMediaFileName() : "File");
        }
    }

    private void sendPushNotifications(User sender, String groupTitle, Long conversationId,
                                       List<ConversationMember> members, MessageDto dto) {
        String senderName = sender.getDisplayName() != null ? sender.getDisplayName() : sender.getUsername();
        String body = pushPreview(dto);
        Instant now = Instant.now();
        for (ConversationMember member : members) {
            User recipient = member.getUser();
            if (recipient.getId().equals(sender.getId())) continue;
            if (member.getMutedUntil() != null && member.getMutedUntil().isAfter(now)) continue;
            if (sessionTracker.isForeground(recipient.getUsername())) continue;

            String title = groupTitle != null ? groupTitle : senderName;
            String text = groupTitle != null ? senderName + ": " + body : body;
            long unread = conversationMemberRepository.sumUnreadForUser(recipient.getId());
            pushService.sendToUser(recipient,
                    pushService.messagePayload(title, text, conversationId, unread, null), 86400);
        }
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

        // Delivered (double grey tick) as soon as at least one recipient has a live connection
        List<ConversationMember> members = conversationMemberRepository.findByConversation(conversation);
        boolean anyRecipientOnline = false;
        for (ConversationMember member : members) {
            if (!member.getUser().getId().equals(sender.getId()) && isOnline(member.getUser())) {
                anyRecipientOnline = true;
                break;
            }
        }
        if (anyRecipientOnline) {
            message.setStatus(MessageStatus.DELIVERED);
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
        conversation.setLastMessageId(message.getId());
        conversation.setLastMessageSenderId(sender.getId());
        conversation.setLastMessageStatus(message.getStatus());
        conversation.setLastMessageAt(Instant.now());
        conversationRepository.save(conversation);

        // Unread count for other members; a deleted (hidden) chat reappears when a new message arrives
        for (ConversationMember member : members) {
            if (!member.getUser().getId().equals(sender.getId())) {
                member.setUnreadCount(member.getUnreadCount() + 1);
            }
            member.setHidden(false);
            conversationMemberRepository.save(member);
        }

        final MessageDto dto = MessageDto.fromEntity(message);
        final Long conversationId = conversation.getId();
        final List<User> recipients = members.stream()
                .map(ConversationMember::getUser)
                .filter(u -> !u.getId().equals(sender.getId()))
                .toList();

        // Real-time dispatch via STOMP, only after the row is committed (prevents read-receipt race)
        afterCommit(() -> {
            // 1. Broadcast to conversation topic
            messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, dto);

            // 2. Direct message event to each recipient's personal user queue
            for (User recipient : recipients) {
                try {
                    messagingTemplate.convertAndSendToUser(recipient.getUsername(), "/queue/messages", dto);
                } catch (Exception e) {
                    // Ignore offline user dispatch failure
                }
            }

            // 3. Web Push so people are alerted even when the app is closed (skipped when they are looking at it or muted)
            try {
                sendPushNotifications(sender, conversation.getType() == ConversationType.GROUP ? conversation.getTitle() : null,
                        conversationId, members, dto);
            } catch (Exception ignored) {
                // notifications are best-effort
            }
        });

        return dto;
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> getConversationMessages(User currentUser, Long conversationId, int page, int size) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        ConversationMember viewer = conversationMemberRepository.findByConversationAndUser(conversation, currentUser)
                .orElseThrow(() -> new SecurityException("You are not authorized to view messages in this conversation"));

        Instant clearedAt = viewer.getClearedAt() != null ? viewer.getClearedAt() : Instant.EPOCH;
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findVisibleMessagesForUser(conversation, currentUser.getId(), clearedAt, pageable);
        return messages.map(MessageDto::fromEntity);
    }

    @Transactional
    public void markConversationAsRead(User currentUser, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        ConversationMember member = conversationMemberRepository.findByConversationAndUser(conversation, currentUser)
                .orElseThrow(() -> new SecurityException("You are not a member of this conversation"));

        member.setUnreadCount(0);
        Long maxId = messageRepository.findMaxIdInConversation(conversation);
        if (maxId != null && maxId > 0) {
            member.setLastReadMessageId(maxId);
        }
        conversationMemberRepository.save(member);

        // Like WhatsApp: if I turned read receipts off, nobody gets blue ticks for what I read
        if (!currentUser.getPrivacySettings().isReadReceiptsEnabled()) {
            return;
        }

        List<ConversationMember> allMembers = conversationMemberRepository.findByConversation(conversation);
        List<User> others = allMembers.stream()
                .map(ConversationMember::getUser)
                .filter(u -> !u.getId().equals(currentUser.getId()))
                .toList();

        if (conversation.getType() == ConversationType.GROUP) {
            // Blue ticks in a group only once EVERY other member has read the message
            List<Message> notRead = messageRepository.findNotReadInConversation(conversation);
            List<MessageStatusUpdateDto> updates = new java.util.ArrayList<>();
            List<User> senders = new java.util.ArrayList<>();
            for (Message m : notRead) {
                if (m.getSender().getId().equals(currentUser.getId())) continue;
                boolean everyoneRead = true;
                for (ConversationMember cm : allMembers) {
                    Long uid = cm.getUser().getId();
                    if (uid.equals(m.getSender().getId())) continue;
                    // members who left / read receipts disabled still count via their own lastRead id
                    Long last = cm.getLastReadMessageId();
                    if (last == null || last < m.getId()) {
                        everyoneRead = false;
                        break;
                    }
                }
                if (everyoneRead) {
                    m.setStatus(MessageStatus.READ);
                    messageRepository.save(m);
                    updates.add(new MessageStatusUpdateDto(m.getId(), conversationId, MessageStatus.READ, currentUser.getId()));
                    senders.add(m.getSender());
                }
            }
            refreshLastMessageStatus(conversation);
            afterCommit(() -> {
                for (int i = 0; i < updates.size(); i++) {
                    pushReceipt(senders.get(i), updates.get(i));
                }
            });
            return;
        }

        // Direct chat: update all incoming messages in DB to READ
        messageRepository.markMessagesAsReadForUser(conversation, currentUser.getId());
        refreshLastMessageStatus(conversation);

        MessageStatusUpdateDto update = new MessageStatusUpdateDto(
                null,
                conversationId,
                MessageStatus.READ,
                currentUser.getId()
        );
        afterCommit(() -> {
            messagingTemplate.convertAndSend("/topic/conversations/" + conversationId + "/receipts", update);
            for (User other : others) {
                pushReceipt(other, update);
            }
        });
    }

    /** Called when a user connects: everything sent to them while they were offline becomes DELIVERED. */
    @Transactional
    public void markDeliveredForUser(User user) {
        List<Message> pending = messageRepository.findUndeliveredForUser(user.getId());
        if (pending.isEmpty()) {
            return;
        }

        Set<String> notified = new HashSet<>();
        List<Runnable> pushes = new java.util.ArrayList<>();
        java.util.Map<Long, Conversation> touched = new java.util.LinkedHashMap<>();
        for (Message m : pending) {
            m.setStatus(MessageStatus.DELIVERED);
            messageRepository.save(m);
            touched.put(m.getConversation().getId(), m.getConversation());

            Long convId = m.getConversation().getId();
            User sender = m.getSender();
            if (notified.add(convId + ":" + sender.getId())) {
                MessageStatusUpdateDto update = new MessageStatusUpdateDto(null, convId, MessageStatus.DELIVERED, user.getId());
                pushes.add(() -> pushReceipt(sender, update));
            }
        }
        touched.values().forEach(this::refreshLastMessageStatus);
        afterCommit(() -> pushes.forEach(Runnable::run));
    }

    /** Keeps the chat-list tick in step with the newest message's current delivery status. */
    private void refreshLastMessageStatus(Conversation conversation) {
        if (conversation.getLastMessageId() == null) {
            return;
        }
        messageRepository.findById(conversation.getLastMessageId())
                .ifPresent(m -> conversation.setLastMessageStatus(m.getStatus()));
        conversationRepository.save(conversation);
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

        ConversationMember member = conversationMemberRepository.findByConversationAndUser(conversation, currentUser)
                .orElseThrow(() -> new SecurityException("You are not a member of this conversation"));

        member.setClearedAt(Instant.now());
        member.setUnreadCount(0);
        conversationMemberRepository.save(member);
    }
}
