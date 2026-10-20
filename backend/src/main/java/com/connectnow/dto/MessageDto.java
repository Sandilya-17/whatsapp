package com.connectnow.dto;

import com.connectnow.model.Message;
import com.connectnow.model.MessageStatus;
import com.connectnow.model.MessageType;
import java.time.Instant;

public class MessageDto {
    private Long id;
    private Long conversationId;
    private UserDto sender;
    private String clientMessageId;
    private String content;
    private MessageType messageType;
    private MessageStatus status;
    private String mediaUrl;
    private String mediaFileName;
    private Long mediaFileSize;
    private boolean isEdited;
    private boolean isDeletedForEveryone;
    private Long replyToMessageId;
    private String replyToContent;
    private String replyToSenderName;
    private Instant createdAt;
    private Instant updatedAt;

    public MessageDto() {
    }

    public static MessageDto fromEntity(Message message) {
        MessageDto dto = new MessageDto();
        dto.setId(message.getId());
        dto.setConversationId(message.getConversation().getId());
        dto.setSender(UserDto.fromEntity(message.getSender()));
        dto.setClientMessageId(message.getClientMessageId());
        
        if (message.isDeletedForEveryone()) {
            dto.setContent("This message was deleted");
            dto.setDeletedForEveryone(true);
        } else {
            dto.setContent(message.getContent());
            dto.setDeletedForEveryone(false);
            dto.setMediaUrl(message.getMediaUrl());
            dto.setMediaFileName(message.getMediaFileName());
            dto.setMediaFileSize(message.getMediaFileSize());
        }
        
        dto.setMessageType(message.getMessageType());
        dto.setStatus(message.getStatus());
        dto.setEdited(message.isEdited());
        
        if (message.getReplyTo() != null) {
            dto.setReplyToMessageId(message.getReplyTo().getId());
            dto.setReplyToContent(message.getReplyTo().getContent());
            dto.setReplyToSenderName(message.getReplyTo().getSender().getDisplayName());
        }
        
        dto.setCreatedAt(message.getCreatedAt());
        dto.setUpdatedAt(message.getUpdatedAt());
        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public UserDto getSender() {
        return sender;
    }

    public void setSender(UserDto sender) {
        this.sender = sender;
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

    public MessageStatus getStatus() {
        return status;
    }

    public void setStatus(MessageStatus status) {
        this.status = status;
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

    public boolean isEdited() {
        return isEdited;
    }

    public void setEdited(boolean edited) {
        isEdited = edited;
    }

    public boolean isDeletedForEveryone() {
        return isDeletedForEveryone;
    }

    public void setDeletedForEveryone(boolean deletedForEveryone) {
        isDeletedForEveryone = deletedForEveryone;
    }

    public Long getReplyToMessageId() {
        return replyToMessageId;
    }

    public void setReplyToMessageId(Long replyToMessageId) {
        this.replyToMessageId = replyToMessageId;
    }

    public String getReplyToContent() {
        return replyToContent;
    }

    public void setReplyToContent(String replyToContent) {
        this.replyToContent = replyToContent;
    }

    public String getReplyToSenderName() {
        return replyToSenderName;
    }

    public void setReplyToSenderName(String replyToSenderName) {
        this.replyToSenderName = replyToSenderName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
