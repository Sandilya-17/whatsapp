package com.connectnow.dto;

import com.connectnow.model.StatusStory;

public class StatusStoryDto {
    private String id;
    private UserDto user;
    private String content;
    private String mediaUrl;
    private String backgroundGradient;
    private String createdAt;
    private int views;

    public StatusStoryDto() {
    }

    public static StatusStoryDto fromEntity(StatusStory story) {
        StatusStoryDto dto = new StatusStoryDto();
        dto.setId("story-" + story.getId());
        dto.setUser(UserDto.fromEntitySanitized(story.getUser(), true, false));
        dto.setContent(story.getContent() != null ? story.getContent() : "");
        dto.setMediaUrl(story.getMediaUrl());
        dto.setBackgroundGradient(story.getBackgroundGradient());
        dto.setCreatedAt(story.getCreatedAt().toString());
        dto.setViews(0);
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public String getBackgroundGradient() { return backgroundGradient; }
    public void setBackgroundGradient(String backgroundGradient) { this.backgroundGradient = backgroundGradient; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public int getViews() { return views; }
    public void setViews(int views) { this.views = views; }
}
