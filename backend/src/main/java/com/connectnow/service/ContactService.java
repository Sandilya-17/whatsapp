package com.connectnow.service;

import com.connectnow.dto.ContactRequestDto;
import com.connectnow.dto.UserDto;
import com.connectnow.dto.UserSearchResultDto;
import com.connectnow.model.*;
import com.connectnow.repository.BlockedUserRepository;
import com.connectnow.repository.ContactRequestRepository;
import com.connectnow.repository.ConversationRepository;
import com.connectnow.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ContactService {

    private final UserRepository userRepository;
    private final ContactRequestRepository contactRequestRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final ConversationRepository conversationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ContactService(
            UserRepository userRepository,
            ContactRequestRepository contactRequestRepository,
            BlockedUserRepository blockedUserRepository,
            ConversationRepository conversationRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.userRepository = userRepository;
        this.contactRequestRepository = contactRequestRepository;
        this.blockedUserRepository = blockedUserRepository;
        this.conversationRepository = conversationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public List<UserSearchResultDto> searchUsers(User currentUser, String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        List<User> users = userRepository.searchUsers(query.trim(), currentUser.getId());
        List<UserSearchResultDto> results = new ArrayList<>();

        for (User user : users) {
            boolean isBlocked = blockedUserRepository.isBlockedBetween(currentUser, user);
            if (isBlocked) {
                continue; // Do not show blocked users in search
            }

            UserSearchResultDto dto = new UserSearchResultDto();
            dto.setId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setDisplayName(user.getDisplayName());
            dto.setStatusMessage(user.getStatusMessage());

            PrivacySettings ps = user.getPrivacySettings();
            boolean canSeePhoto = ps == null || "EVERYONE".equalsIgnoreCase(ps.getProfilePhotoVisibility());
            dto.setAvatarUrl(canSeePhoto ? user.getAvatarUrl() : null);

            // Determine relationship status
            Optional<ContactRequest> requestOpt = contactRequestRepository.findBetweenUsers(currentUser, user);
            if (requestOpt.isPresent()) {
                ContactRequest cr = requestOpt.get();
                if (cr.getStatus() == ContactRequestStatus.ACCEPTED) {
                    dto.setRelationshipStatus("CONNECTED");
                } else if (cr.getStatus() == ContactRequestStatus.PENDING) {
                    if (cr.getSender().getId().equals(currentUser.getId())) {
                        dto.setRelationshipStatus("PENDING_SENT");
                    } else {
                        dto.setRelationshipStatus("PENDING_RECEIVED");
                    }
                } else {
                    dto.setRelationshipStatus("NONE");
                }
            } else {
                dto.setRelationshipStatus("NONE");
            }

            results.add(dto);
        }

        return results;
    }

    @Transactional
    public ContactRequestDto sendContactRequest(User currentUser, Long recipientId) {
        if (currentUser.getId().equals(recipientId)) {
            throw new IllegalArgumentException("Cannot send a connection request to yourself");
        }

        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found"));

        if (blockedUserRepository.isBlockedBetween(currentUser, recipient)) {
            throw new IllegalArgumentException("Cannot send request to this user");
        }

        Optional<ContactRequest> existing = contactRequestRepository.findBetweenUsers(currentUser, recipient);
        if (existing.isPresent()) {
            ContactRequest cr = existing.get();
            if (cr.getStatus() == ContactRequestStatus.ACCEPTED) {
                throw new IllegalArgumentException("You are already connected with this user");
            }
            if (cr.getStatus() == ContactRequestStatus.PENDING) {
                if (cr.getSender().getId().equals(currentUser.getId())) {
                    throw new IllegalArgumentException("Connection request already sent and pending");
                } else {
                    // Automatically accept if the other party also requested
                    cr.setStatus(ContactRequestStatus.ACCEPTED);
                    cr = contactRequestRepository.save(cr);
                    ensureDirectConversation(currentUser, recipient);
                    notifyUser(recipient.getUsername(), "CONTACT_ACCEPTED", ContactRequestDto.fromEntity(cr));
                    return ContactRequestDto.fromEntity(cr);
                }
            }
            // If rejected earlier, reactivate
            cr.setSender(currentUser);
            cr.setRecipient(recipient);
            cr.setStatus(ContactRequestStatus.PENDING);
            cr = contactRequestRepository.save(cr);
            notifyUser(recipient.getUsername(), "CONTACT_REQUEST", ContactRequestDto.fromEntity(cr));
            return ContactRequestDto.fromEntity(cr);
        }

        ContactRequest newRequest = new ContactRequest(currentUser, recipient);
        newRequest = contactRequestRepository.save(newRequest);

        ContactRequestDto dto = ContactRequestDto.fromEntity(newRequest);
        notifyUser(recipient.getUsername(), "CONTACT_REQUEST", dto);

        return dto;
    }

    @Transactional
    public ContactRequestDto acceptContactRequest(User currentUser, Long requestId) {
        ContactRequest request = contactRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Contact request not found"));

        if (!request.getRecipient().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("You are not authorized to accept this request");
        }

        request.setStatus(ContactRequestStatus.ACCEPTED);
        request = contactRequestRepository.save(request);

        // Ensure direct conversation exists
        ensureDirectConversation(request.getSender(), request.getRecipient());

        ContactRequestDto dto = ContactRequestDto.fromEntity(request);
        notifyUser(request.getSender().getUsername(), "CONTACT_ACCEPTED", dto);

        return dto;
    }

    @Transactional
    public void rejectContactRequest(User currentUser, Long requestId) {
        ContactRequest request = contactRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Contact request not found"));

        if (!request.getRecipient().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("You are not authorized to reject this request");
        }

        request.setStatus(ContactRequestStatus.REJECTED);
        contactRequestRepository.save(request);
    }

    @Transactional(readOnly = true)
    public List<ContactRequestDto> getPendingReceivedRequests(User currentUser) {
        List<ContactRequest> list = contactRequestRepository.findByRecipientAndStatusOrderByCreatedAtDesc(
                currentUser, ContactRequestStatus.PENDING);
        return list.stream().map(ContactRequestDto::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<ContactRequestDto> getPendingSentRequests(User currentUser) {
        List<ContactRequest> list = contactRequestRepository.findBySenderAndStatusOrderByCreatedAtDesc(
                currentUser, ContactRequestStatus.PENDING);
        return list.stream().map(ContactRequestDto::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDto> getContacts(User currentUser) {
        List<ContactRequest> contacts = contactRequestRepository.findAllAcceptedContactsForUser(currentUser);
        List<UserDto> result = new ArrayList<>();

        for (ContactRequest cr : contacts) {
            User contactUser = cr.getSender().getId().equals(currentUser.getId()) ? cr.getRecipient() : cr.getSender();
            if (!blockedUserRepository.isBlockedBetween(currentUser, contactUser)) {
                result.add(UserDto.fromEntity(contactUser));
            }
        }

        return result;
    }

    @Transactional
    public void blockUser(User currentUser, Long targetUserId) {
        if (currentUser.getId().equals(targetUserId)) {
            throw new IllegalArgumentException("Cannot block yourself");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!blockedUserRepository.existsByBlockerAndBlocked(currentUser, target)) {
            BlockedUser blockedUser = new BlockedUser(currentUser, target);
            blockedUserRepository.save(blockedUser);
        }
    }

    @Transactional
    public void unblockUser(User currentUser, Long targetUserId) {
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        blockedUserRepository.findByBlockerAndBlocked(currentUser, target)
                .ifPresent(blockedUserRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<UserDto> getBlockedUsers(User currentUser) {
        List<BlockedUser> blocked = blockedUserRepository.findByBlockerOrderByCreatedAtDesc(currentUser);
        return blocked.stream().map(b -> UserDto.fromEntity(b.getBlocked())).toList();
    }

    private void ensureDirectConversation(User user1, User user2) {
        Optional<Conversation> direct = conversationRepository.findDirectConversationBetweenUsers(
                ConversationType.DIRECT, user1, user2);

        if (direct.isEmpty()) {
            Conversation conv = new Conversation(ConversationType.DIRECT, user1);
            conv.getMembers().add(new ConversationMember(conv, user1, MemberRole.MEMBER));
            conv.getMembers().add(new ConversationMember(conv, user2, MemberRole.MEMBER));
            conversationRepository.save(conv);
        }
    }

    private void notifyUser(String username, String eventType, Object payload) {
        try {
            messagingTemplate.convertAndSendToUser(username, "/queue/notifications", payload);
        } catch (Exception e) {
            // Ignore if user is offline
        }
    }
}
