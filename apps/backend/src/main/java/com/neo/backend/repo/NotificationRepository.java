package com.neo.backend.repo;

import com.neo.backend.domain.Notification;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedOnDesc(String userId);

    long countByUserIdAndReadFalse(String userId);

    List<Notification> findByRefIdAndTypeAndUserIdIn(String refId, String type, List<String> userIds);

    Page<Notification> findByUserIdOrderByCreatedOnDesc(String userId, Pageable pageable);

    boolean existsByDedupeKey(String dedupeKey);

    @Modifying
    @Query("update Notification n set n.read = true where n.userId = :userId and n.read = false")
    int markAllRead(@Param("userId") String userId);
}
