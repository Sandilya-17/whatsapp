package com.connectnow.repository;

import com.connectnow.model.Conversation;
import com.connectnow.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    Optional<Message> findByClientMessageId(String clientMessageId);

    @Query("SELECT m FROM Message m WHERE m.conversation = :conversation AND m.createdAt > :clearedAt AND m.id NOT IN (SELECT md.message.id FROM MessageDeletion md WHERE md.user.id = :userId) ORDER BY m.createdAt DESC")
    Page<Message> findVisibleMessagesForUser(
            @Param("conversation") Conversation conversation,
            @Param("userId") Long userId,
            @Param("clearedAt") java.time.Instant clearedAt,
            Pageable pageable);

    /** Messages addressed to this user (they are a member, someone else sent them) still at SENT. */
    @Query("SELECT m FROM Message m JOIN m.conversation c JOIN c.members mem WHERE mem.user.id = :userId AND m.sender.id <> :userId AND m.status = com.connectnow.model.MessageStatus.SENT")
    java.util.List<Message> findUndeliveredForUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation = :conversation AND m.id > :lastReadId AND m.sender.id != :userId")
    int countUnreadMessages(
            @Param("conversation") Conversation conversation,
            @Param("lastReadId") Long lastReadId,
            @Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Message m SET m.status = com.connectnow.model.MessageStatus.READ WHERE m.conversation = :conversation AND m.sender.id != :userId AND m.status <> com.connectnow.model.MessageStatus.READ")
    int markMessagesAsReadForUser(
            @Param("conversation") Conversation conversation,
            @Param("userId") Long userId);

    /** Messages in a conversation that are not READ yet (used for group read-receipt calculation). */
    @Query("SELECT m FROM Message m WHERE m.conversation = :conversation AND m.status <> com.connectnow.model.MessageStatus.READ")
    java.util.List<Message> findNotReadInConversation(@Param("conversation") Conversation conversation);

    @Query("SELECT COALESCE(MAX(m.id), 0) FROM Message m WHERE m.conversation = :conversation")
    Long findMaxIdInConversation(@Param("conversation") Conversation conversation);
}
