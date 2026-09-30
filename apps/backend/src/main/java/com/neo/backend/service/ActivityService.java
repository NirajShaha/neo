package com.neo.backend.service;

import com.neo.backend.domain.ActivityLog;
import com.neo.backend.domain.AppUser;
import com.neo.backend.repo.ActivityLogRepository;
import com.neo.backend.repo.AppUserRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ActivityService {

    /** Audit entry with the acting user's name resolved for display. */
    public record ActivityView(
            String action,
            String description,
            String entityType,
            String entityId,
            String actorId,
            String actorName,
            String data,
            Instant createdOn) {
    }

    private final ActivityLogRepository logs;
    private final AppUserRepository users;

    public ActivityService(ActivityLogRepository logs, AppUserRepository users) {
        this.logs = logs;
        this.users = users;
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

    public List<ActivityView> forEntityWithActor(String entityId) {
        return logs.findByEntityIdOrderByCreatedOnDesc(entityId).stream()
                .map(log -> new ActivityView(
                        log.getAction(),
                        log.getDescription(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getActorId(),
                        userName(log.getActorId()),
                        log.getData(),
                        log.getCreatedOn()))
                .toList();
    }

    private String userName(String actorId) {
        if (actorId == null || actorId.isBlank()) {
            return null;
        }
        return users.findById(actorId).map(AppUser::getName).orElse(null);
    }
}
