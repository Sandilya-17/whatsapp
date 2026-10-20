package com.connectnow.repository;

import com.connectnow.model.Message;
import com.connectnow.model.MessageDeletion;
import com.connectnow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MessageDeletionRepository extends JpaRepository<MessageDeletion, Long> {

    Optional<MessageDeletion> findByUserAndMessage(User user, Message message);

    boolean existsByUserAndMessage(User user, Message message);
}
