package com.connectnow.dto;

import com.connectnow.model.Conversation;
import com.connectnow.model.ConversationMember;
import com.connectnow.model.ConversationType;
import com.connectnow.model.User;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class ConversationDto {
    private Long id;
    private ConversationType type;
    private String title;
    private String avatarUrl;
    private String description;
    private Instant lastMessageAt;
    private String lastMessagePreview;
    private Long lastMessageSenderId;
    private String lastMessageStatus;
    private int unreadCount;
    private UserDto otherParticipant;
    private List<UserDto> members = new ArrayList<>();

    public ConversationDto() {
    }

    public static ConversationDto fromEntity(Conversation conversation, User currentUser) {
        ConversationDto dto = new ConversationDto();
        dto.setId(conversation.getId());
        dto.setType(conversation.getType());
        dto.setLastMessageAt(conversation.getLastMessageAt());
        dto.setLastMessagePreview(conversation.getLastMessagePreview());
        dto.setLastMessageSenderId(conversation.getLastMessageSenderId());
        dto.setLastMessageStatus(conversation.getLastMessageStatus() != null ? conversation.getLastMessageStatus().name() : null);
        dto.setDescription(conversation.getDescription());

        int unread = 0;
        User otherUser = null;

        for (ConversationMember member : conversation.getMembers()) {
            if (member.getUser().getId().equals(currentUser.getId())) {
                unread = member.getUnreadCount();
                if (member.getClearedAt() != null && conversation.getLastMessageAt() != null
                        && !conversation.getLastMessageAt().isAfter(member.getClearedAt())) {
                    dto.setLastMessagePreview("");
                }
            } else {
                otherUser = member.getUser();
                dto.getMembers().add(UserDto.fromEntity(member.getUser()));
            }
        }
        dto.setUnreadCount(unread);

        if (conversation.getType() == ConversationType.DIRECT && otherUser != null) {
            dto.setTitle(otherUser.getDisplayName());
            dto.setAvatarUrl(otherUser.getAvatarUrl());
            dto.setOtherParticipant(UserDto.fromEntity(otherUser));
        } else {
            dto.setTitle(conversation.getTitle() != null ? conversation.getTitle() : "Group Chat");
            dto.setAvatarUrl(conversation.getAvatarUrl());
        }

        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ConversationType getType() {
        return type;
    }

    public void setType(ConversationType type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(Instant lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }

    public String getLastMessagePreview() {
        return lastMessagePreview;
    }

    public void setLastMessagePreview(String lastMessagePreview) {
        this.lastMessagePreview = lastMessagePreview;
    }

    public Long getLastMessageSenderId() {
        return lastMessageSenderId;
    }

    public void setLastMessageSenderId(Long lastMessageSenderId) {
        this.lastMessageSenderId = lastMessageSenderId;
    }

    public String getLastMessageStatus() {
        return lastMessageStatus;
    }

    public void setLastMessageStatus(String lastMessageStatus) {
        this.lastMessageStatus = lastMessageStatus;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(int unreadCount) {
        this.unreadCount = unreadCount;
    }

    public UserDto getOtherParticipant() {
        return otherParticipant;
    }

    public void setOtherParticipant(UserDto otherParticipant) {
        this.otherParticipant = otherParticipant;
    }

    public List<UserDto> getMembers() {
        return members;
    }

    public void setMembers(List<UserDto> members) {
        this.members = members;
    }
}
