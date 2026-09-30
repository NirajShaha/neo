package com.neo.backend.workflow.dto;

import java.time.Instant;

public record HistoryEntry(
        String activityId,
        String activityName,
        String activityType,
        Instant startTime,
        Instant endTime) {
}
