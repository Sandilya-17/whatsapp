package com.connectnow.dto;

import com.connectnow.model.MessageType;
import jakarta.validation.constraints.Size;

public class SendMessageRequest {

    private Long conversationId;

    private Long recipientId; // Optional: if initiating a direct chat directly

    private String clientMessageId; // UUID for deduplication & retry safety

    @Size(max = 4000, message = "Message content exceeds maximum allowed length")
    private String content;

    private MessageType messageType = MessageType.TEXT;

    private String mediaUrl;
    private String mediaFileName;
    private Long mediaFileSize;

    private Long replyToMessageId;

    public SendMessageRequest() {
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public Long getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(Long recipientId) {
        this.recipientId = recipientId;
    }

    public String getClientMessageId() {
        return clientMessageId;
    }

    public void setClientMessageId(String clientMessageId) {
        this.clientMessageId = clientMessageId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public MessageType getMessageType() {
        return messageType;
    }

    public void setMessageType(MessageType messageType) {
        this.messageType = messageType;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getMediaFileName() {
        return mediaFileName;
    }

    public void setMediaFileName(String mediaFileName) {
        this.mediaFileName = mediaFileName;
    }

    public Long getMediaFileSize() {
        return mediaFileSize;
    }

    public void setMediaFileSize(Long mediaFileSize) {
        this.mediaFileSize = mediaFileSize;
    }

    public Long getReplyToMessageId() {
        return replyToMessageId;
    }

    public void setReplyToMessageId(Long replyToMessageId) {
        this.replyToMessageId = replyToMessageId;
    }
}
