package com.neo.backend.service;

import com.neo.backend.domain.ActivityLog;
import com.neo.backend.repo.ActivityLogRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ActivityService {

    private final ActivityLogRepository logs;

    public ActivityService(ActivityLogRepository logs) {
        this.logs = logs;
    }

    public void record(String action, String description, String entityType, String entityId, String actorId, String data) {
        ActivityLog log = new ActivityLog();
        log.setAction(action);
        log.setDescription(description);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setActorId(actorId == null ? "" : actorId);
        log.setData(data == null ? "{}" : data);
        logs.save(log);
    }

    public List<ActivityLog> forEntity(String entityId) {
        return logs.findByEntityIdOrderByCreatedOnDesc(entityId);
    }
}
