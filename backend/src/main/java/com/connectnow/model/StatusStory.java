package com.connectnow.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "status_stories")
public class StatusStory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 1000)
    private String content;

    @Column(length = 1000)
    private String mediaUrl;

    @Column(length = 200)
    private String backgroundGradient;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public StatusStory() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public String getBackgroundGradient() { return backgroundGradient; }
    public void setBackgroundGradient(String backgroundGradient) { this.backgroundGradient = backgroundGradient; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
