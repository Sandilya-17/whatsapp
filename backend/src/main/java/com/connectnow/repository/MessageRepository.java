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

    @Query("SELECT m FROM Message m WHERE m.conversation = :conversation AND m.id NOT IN (SELECT md.message.id FROM MessageDeletion md WHERE md.user.id = :userId) ORDER BY m.createdAt DESC")
    Page<Message> findVisibleMessagesForUser(
            @Param("conversation") Conversation conversation,
            @Param("userId") Long userId,
            Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation = :conversation AND m.id > :lastReadId AND m.sender.id != :userId")
    int countUnreadMessages(
            @Param("conversation") Conversation conversation,
            @Param("lastReadId") Long lastReadId,
            @Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Message m SET m.status = com.connectnow.model.MessageStatus.READ WHERE m.conversation = :conversation AND m.sender.id != :userId")
    int markMessagesAsReadForUser(
            @Param("conversation") Conversation conversation,
            @Param("userId") Long userId);
}
