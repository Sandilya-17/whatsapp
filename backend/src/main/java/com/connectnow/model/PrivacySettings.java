package com.connectnow.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class PrivacySettings {

    private String profilePhotoVisibility = "EVERYONE"; // EVERYONE, CONTACTS, NOBODY
    private String lastSeenVisibility = "EVERYONE";     // EVERYONE, CONTACTS, NOBODY
    private boolean readReceiptsEnabled = true;
    private boolean allowGroupInvitesFromEveryone = true;

    public PrivacySettings() {
    }

    public PrivacySettings(String profilePhotoVisibility, String lastSeenVisibility, boolean readReceiptsEnabled, boolean allowGroupInvitesFromEveryone) {
        this.profilePhotoVisibility = profilePhotoVisibility;
        this.lastSeenVisibility = lastSeenVisibility;
        this.readReceiptsEnabled = readReceiptsEnabled;
        this.allowGroupInvitesFromEveryone = allowGroupInvitesFromEveryone;
    }

    public String getProfilePhotoVisibility() {
        return profilePhotoVisibility;
    }

    public void setProfilePhotoVisibility(String profilePhotoVisibility) {
        this.profilePhotoVisibility = profilePhotoVisibility;
    }

    public String getLastSeenVisibility() {
        return lastSeenVisibility;
    }

    public void setLastSeenVisibility(String lastSeenVisibility) {
        this.lastSeenVisibility = lastSeenVisibility;
    }

    public boolean isReadReceiptsEnabled() {
        return readReceiptsEnabled;
    }

    public void setReadReceiptsEnabled(boolean readReceiptsEnabled) {
        this.readReceiptsEnabled = readReceiptsEnabled;
    }

    public boolean isAllowGroupInvitesFromEveryone() {
        return allowGroupInvitesFromEveryone;
    }

    public void setAllowGroupInvitesFromEveryone(boolean allowGroupInvitesFromEveryone) {
        this.allowGroupInvitesFromEveryone = allowGroupInvitesFromEveryone;
    }
}
