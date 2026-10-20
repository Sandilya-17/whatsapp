package com.connectnow.repository;

import com.connectnow.model.BlockedUser;
import com.connectnow.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlockedUserRepository extends JpaRepository<BlockedUser, Long> {

    Optional<BlockedUser> findByBlockerAndBlocked(User blocker, User blocked);

    boolean existsByBlockerAndBlocked(User blocker, User blocked);

    List<BlockedUser> findByBlockerOrderByCreatedAtDesc(User blocker);

    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM BlockedUser b WHERE (b.blocker = :u1 AND b.blocked = :u2) OR (b.blocker = :u2 AND b.blocked = :u1)")
    boolean isBlockedBetween(@Param("u1") User u1, @Param("u2") User u2);
}
