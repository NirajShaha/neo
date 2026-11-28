package com.neo.backend.service;

import com.neo.backend.domain.ActivityLog;
import com.neo.backend.repo.ActivityLogRepository;
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
    private final UserDisplayService display;

    public ActivityService(ActivityLogRepository logs, UserDisplayService display) {
        this.logs = logs;
        this.display = display;
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
        java.util.List<ActivityLog> entries = logs.findByEntityIdOrderByCreatedOnDesc(entityId);
        java.util.Map<String, String> names = display.namesById(
                entries.stream().map(ActivityLog::getActorId).toList());
        return entries.stream()
                .map(log -> new ActivityView(
                        log.getAction(),
                        log.getDescription(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getActorId(),
                        display.nameOf(log.getActorId(), names),
                        log.getData(),
                        log.getCreatedOn()))
                .toList();
    }
}
