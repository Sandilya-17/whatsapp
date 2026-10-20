package com.connectnow.dto;

import com.connectnow.model.MessageStatus;

public class MessageStatusUpdateDto {
    private Long messageId;
    private Long conversationId;
    private MessageStatus status;
    private Long updatedByUserId;

    public MessageStatusUpdateDto() {
    }

    public MessageStatusUpdateDto(Long messageId, Long conversationId, MessageStatus status, Long updatedByUserId) {
        this.messageId = messageId;
        this.conversationId = conversationId;
        this.status = status;
        this.updatedByUserId = updatedByUserId;
    }

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public MessageStatus getStatus() {
        return status;
    }

    public void setStatus(MessageStatus status) {
        this.status = status;
    }

    public Long getUpdatedByUserId() {
        return updatedByUserId;
    }

    public void setUpdatedByUserId(Long updatedByUserId) {
        this.updatedByUserId = updatedByUserId;
    }
}
