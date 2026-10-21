package com.connectnow.repository;

import com.connectnow.model.StatusStory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Repository
public interface StatusStoryRepository extends JpaRepository<StatusStory, Long> {

    @Query("SELECT s FROM StatusStory s JOIN FETCH s.user WHERE s.createdAt > :since AND s.user.id IN :userIds ORDER BY s.createdAt DESC")
    List<StatusStory> findActiveByUserIds(@Param("since") Instant since, @Param("userIds") Collection<Long> userIds);
}
