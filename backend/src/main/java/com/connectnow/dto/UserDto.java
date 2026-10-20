package com.connectnow.dto;

import com.connectnow.model.PrivacySettings;
import com.connectnow.model.User;
import java.time.Instant;

public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String displayName;
    private String avatarUrl;
    private String statusMessage;
    private boolean isOnline;
    private Instant lastSeenAt;
    private PrivacySettings privacySettings;

    public UserDto() {
    }

    public static UserDto fromEntity(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setDisplayName(user.getDisplayName());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setStatusMessage(user.getStatusMessage());
        dto.setOnline(user.isOnline());
        dto.setLastSeenAt(user.getLastSeenAt());
        dto.setPrivacySettings(user.getPrivacySettings());
        return dto;
    }

    public static UserDto fromEntitySanitized(User user, boolean canViewProfilePhoto, boolean canViewLastSeen) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setDisplayName(user.getDisplayName());
        dto.setStatusMessage(user.getStatusMessage());
        dto.setAvatarUrl(canViewProfilePhoto ? user.getAvatarUrl() : null);
        dto.setOnline(canViewLastSeen && user.isOnline());
        dto.setLastSeenAt(canViewLastSeen ? user.getLastSeenAt() : null);
        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getStatusMessage() {
        return statusMessage;
    }

    public void setStatusMessage(String statusMessage) {
        this.statusMessage = statusMessage;
    }

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public void setLastSeenAt(Instant lastSeenAt) {
        this.lastSeenAt = lastSeenAt;
    }

    public PrivacySettings getPrivacySettings() {
        return privacySettings;
    }

    public void setPrivacySettings(PrivacySettings privacySettings) {
        this.privacySettings = privacySettings;
    }
}
