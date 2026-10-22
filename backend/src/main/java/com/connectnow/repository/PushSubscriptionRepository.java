package com.connectnow.repository;

import com.connectnow.model.PushSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscriptionEntity, Long> {

    @Query("SELECT s FROM PushSubscriptionEntity s WHERE s.user.id = :userId")
    List<PushSubscriptionEntity> findByUserId(@Param("userId") Long userId);

    List<PushSubscriptionEntity> findByEndpoint(String endpoint);

    @Transactional
    void deleteByEndpoint(String endpoint);
}
