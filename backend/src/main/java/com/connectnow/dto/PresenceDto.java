package com.connectnow.dto;

import java.time.Instant;

public class PresenceDto {
    private Long userId;
    private String username;
    private boolean isOnline;
    private Instant lastSeenAt;

    public PresenceDto() {
    }

    public PresenceDto(Long userId, String username, boolean isOnline, Instant lastSeenAt) {
        this.userId = userId;
        this.username = username;
        this.isOnline = isOnline;
        this.lastSeenAt = lastSeenAt;
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
}
