package com.connectnow.dto;

import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Size(min = 1, max = 50, message = "Display name must be between 1 and 50 characters")
    private String displayName;

    @Size(max = 255, message = "Status message must be at most 255 characters")
    private String statusMessage;

    @Size(max = 500, message = "Avatar URL must be at most 500 characters")
    private String avatarUrl;

    public UpdateProfileRequest() {
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getStatusMessage() {
        return statusMessage;
    }

    public void setStatusMessage(String statusMessage) {
        this.statusMessage = statusMessage;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}
