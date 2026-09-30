package com.neo.backend.repo;

import com.neo.backend.domain.Notification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedOnDesc(String userId);

    long countByUserIdAndReadFalse(String userId);

    List<Notification> findByRefIdAndTypeAndUserIdIn(String refId, String type, List<String> userIds);
}
