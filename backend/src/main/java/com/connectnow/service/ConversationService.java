package com.connectnow.service;

import com.connectnow.dto.ConversationDto;
import com.connectnow.model.*;
import com.connectnow.repository.BlockedUserRepository;
import com.connectnow.repository.ConversationMemberRepository;
import com.connectnow.repository.ConversationRepository;
import com.connectnow.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final UserRepository userRepository;
    private final BlockedUserRepository blockedUserRepository;

    public ConversationService(
            ConversationRepository conversationRepository,
            ConversationMemberRepository conversationMemberRepository,
            UserRepository userRepository,
            BlockedUserRepository blockedUserRepository) {
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.userRepository = userRepository;
        this.blockedUserRepository = blockedUserRepository;
    }

    @Transactional
    public ConversationDto getOrCreateDirectConversation(User currentUser, Long targetUserId) {
        if (currentUser.getId().equals(targetUserId)) {
            throw new IllegalArgumentException("Cannot create a conversation with yourself");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found"));

        if (blockedUserRepository.isBlockedBetween(currentUser, target)) {
            throw new IllegalArgumentException("Cannot open conversation with this user");
        }

        Optional<Conversation> existing = conversationRepository.findDirectConversationBetweenUsers(
                ConversationType.DIRECT, currentUser, target);

        if (existing.isPresent()) {
            // Re-opening a chat the user deleted brings it back (history stays cleared)
            for (ConversationMember m : existing.get().getMembers()) {
                if (m.getUser().getId().equals(currentUser.getId()) && m.isHidden()) {
                    m.setHidden(false);
                    conversationMemberRepository.save(m);
                }
            }
            return ConversationDto.fromEntity(existing.get(), currentUser);
        }

        Conversation conv = new Conversation(ConversationType.DIRECT, currentUser);
        conv.getMembers().add(new ConversationMember(conv, currentUser, MemberRole.MEMBER));
        conv.getMembers().add(new ConversationMember(conv, target, MemberRole.MEMBER));
        conv = conversationRepository.save(conv);

        return ConversationDto.fromEntity(conv, currentUser);
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(User currentUser) {
        List<Conversation> list = conversationRepository.findAllByMemberUserOrderByLastMessageAtDesc(currentUser);
        List<ConversationDto> dtos = new ArrayList<>();

        for (Conversation conv : list) {
            dtos.add(ConversationDto.fromEntity(conv, currentUser));
        }

        return dtos;
    }

    /** WhatsApp-style "delete chat": removes it from this user's list and clears their history. The other person is unaffected. */
    @Transactional
    public void deleteConversationForUser(User currentUser, Long conversationId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        ConversationMember member = conversationMemberRepository.findByConversationAndUser(conv, currentUser)
                .orElseThrow(() -> new SecurityException("You are not a member of this conversation"));

        member.setHidden(true);
        member.setClearedAt(Instant.now());
        member.setUnreadCount(0);
        conversationMemberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public ConversationDto getConversation(User currentUser, Long conversationId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        boolean isMember = conv.getMembers().stream()
                .anyMatch(m -> m.getUser().getId().equals(currentUser.getId()));

        if (!isMember) {
            throw new SecurityException("You are not a member of this conversation");
        }

        return ConversationDto.fromEntity(conv, currentUser);
    }

    @Transactional
    public ConversationDto createGroupConversation(User currentUser, String title, String description, List<Long> memberIds) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Group title is required");
        }

        Conversation group = new Conversation(ConversationType.GROUP, currentUser);
        group.setTitle(title.trim());
        group.setDescription(description);
        group.setAvatarUrl("https://api.dicebear.com/7.x/identicon/svg?seed=" + title.trim());

        // Add creator as ADMIN
        group.getMembers().add(new ConversationMember(group, currentUser, MemberRole.ADMIN));

        // Add initial members
        if (memberIds != null) {
            for (Long mId : memberIds) {
                if (!mId.equals(currentUser.getId())) {
                    userRepository.findById(mId).ifPresent(u -> {
                        group.getMembers().add(new ConversationMember(group, u, MemberRole.MEMBER));
                    });
                }
            }
        }

        Conversation saved = conversationRepository.save(group);
        return ConversationDto.fromEntity(saved, currentUser);
    }
}
