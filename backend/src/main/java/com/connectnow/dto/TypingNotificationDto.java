package com.connectnow.dto;

public class TypingNotificationDto {
    private Long conversationId;
    private Long userId;
    private String username;
    private boolean isTyping;

    public TypingNotificationDto() {
    }

    public TypingNotificationDto(Long conversationId, Long userId, String username, boolean isTyping) {
        this.conversationId = conversationId;
        this.userId = userId;
        this.username = username;
        this.isTyping = isTyping;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public boolean isTyping() {
        return isTyping;
    }

    public void setTyping(boolean typing) {
        isTyping = typing;
    }
}
