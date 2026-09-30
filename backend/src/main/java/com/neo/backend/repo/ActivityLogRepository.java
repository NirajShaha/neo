package com.neo.backend.repo;

import com.neo.backend.domain.ActivityLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, String> {
    List<ActivityLog> findByEntityIdOrderByCreatedOnDesc(String entityId);
}
