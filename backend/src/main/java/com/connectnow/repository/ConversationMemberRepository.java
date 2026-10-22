package com.connectnow.repository;

import com.connectnow.model.Conversation;
import com.connectnow.model.ConversationMember;
import com.connectnow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationMemberRepository extends JpaRepository<ConversationMember, Long> {

    Optional<ConversationMember> findByConversationAndUser(Conversation conversation, User user);

    boolean existsByConversationAndUser(Conversation conversation, User user);

    List<ConversationMember> findByConversation(Conversation conversation);

    List<ConversationMember> findByUser(User user);

    @Query("SELECT COALESCE(SUM(m.unreadCount), 0) FROM ConversationMember m WHERE m.user.id = :userId")
    long sumUnreadForUser(@Param("userId") Long userId);
}
