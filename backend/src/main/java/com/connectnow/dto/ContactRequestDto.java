package com.connectnow.dto;

import com.connectnow.model.ContactRequest;
import com.connectnow.model.ContactRequestStatus;
import java.time.Instant;

public class ContactRequestDto {
    private Long id;
    private UserDto sender;
    private UserDto recipient;
    private ContactRequestStatus status;
    private Instant createdAt;

    public ContactRequestDto() {
    }

    public static ContactRequestDto fromEntity(ContactRequest request) {
        ContactRequestDto dto = new ContactRequestDto();
        dto.setId(request.getId());
        dto.setSender(UserDto.fromEntity(request.getSender()));
        dto.setRecipient(UserDto.fromEntity(request.getRecipient()));
        dto.setStatus(request.getStatus());
        dto.setCreatedAt(request.getCreatedAt());
        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserDto getSender() {
        return sender;
    }

    public void setSender(UserDto sender) {
        this.sender = sender;
    }

    public UserDto getRecipient() {
        return recipient;
    }

    public void setRecipient(UserDto recipient) {
        this.recipient = recipient;
    }

    public ContactRequestStatus getStatus() {
        return status;
    }

    public void setStatus(ContactRequestStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
