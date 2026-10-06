package com.neo.backend.workflow.dto;

import java.util.Map;

public record CompleteTaskRequest(String userId, Map<String, Object> variables) {
}
