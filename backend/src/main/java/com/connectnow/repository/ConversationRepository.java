package com.connectnow.repository;

import com.connectnow.model.Conversation;
import com.connectnow.model.ConversationType;
import com.connectnow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c JOIN c.members m1 JOIN c.members m2 WHERE c.type = :type AND m1.user = :user1 AND m2.user = :user2")
    Optional<Conversation> findDirectConversationBetweenUsers(
            @Param("type") ConversationType type,
            @Param("user1") User user1,
            @Param("user2") User user2);

    @Query("SELECT DISTINCT c FROM Conversation c JOIN c.members m WHERE m.user = :user AND (m.hidden IS NULL OR m.hidden = false) ORDER BY c.lastMessageAt DESC")
    List<Conversation> findAllByMemberUserOrderByLastMessageAtDesc(@Param("user") User user);
}
