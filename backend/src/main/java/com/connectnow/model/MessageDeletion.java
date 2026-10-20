package com.connectnow.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "message_deletions", uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_message_del", columnNames = {"user_id", "message_id"})
})
public class MessageDeletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @Column(nullable = false, updatable = false)
    private Instant deletedAt = Instant.now();

    public MessageDeletion() {
    }

    public MessageDeletion(User user, Message message) {
        this.user = user;
        this.message = message;
        this.deletedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Message getMessage() {
        return message;
    }

    public void setMessage(Message message) {
        this.message = message;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
