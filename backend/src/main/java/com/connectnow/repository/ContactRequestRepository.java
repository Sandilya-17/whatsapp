package com.connectnow.repository;

import com.connectnow.model.ContactRequest;
import com.connectnow.model.ContactRequestStatus;
import com.connectnow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContactRequestRepository extends JpaRepository<ContactRequest, Long> {

    Optional<ContactRequest> findBySenderAndRecipient(User sender, User recipient);

    @Query("SELECT cr FROM ContactRequest cr WHERE (cr.sender = :user1 AND cr.recipient = :user2) OR (cr.sender = :user2 AND cr.recipient = :user1)")
    Optional<ContactRequest> findBetweenUsers(@Param("user1") User user1, @Param("user2") User user2);

    List<ContactRequest> findByRecipientAndStatusOrderByCreatedAtDesc(User recipient, ContactRequestStatus status);

    List<ContactRequest> findBySenderAndStatusOrderByCreatedAtDesc(User sender, ContactRequestStatus status);

    @Query("SELECT cr FROM ContactRequest cr WHERE (cr.sender = :user OR cr.recipient = :user) AND cr.status = 'ACCEPTED'")
    List<ContactRequest> findAllAcceptedContactsForUser(@Param("user") User user);
}
