package com.connectnow.dto;

public class UpdatePrivacyRequest {

    private String profilePhotoVisibility; // EVERYONE, CONTACTS, NOBODY
    private String lastSeenVisibility;     // EVERYONE, CONTACTS, NOBODY
    private Boolean readReceiptsEnabled;
    private Boolean allowGroupInvitesFromEveryone;

    public UpdatePrivacyRequest() {
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

    public Boolean getReadReceiptsEnabled() {
        return readReceiptsEnabled;
    }

    public void setReadReceiptsEnabled(Boolean readReceiptsEnabled) {
        this.readReceiptsEnabled = readReceiptsEnabled;
    }

    public Boolean getAllowGroupInvitesFromEveryone() {
        return allowGroupInvitesFromEveryone;
    }

    public void setAllowGroupInvitesFromEveryone(Boolean allowGroupInvitesFromEveryone) {
        this.allowGroupInvitesFromEveryone = allowGroupInvitesFromEveryone;
    }
}
