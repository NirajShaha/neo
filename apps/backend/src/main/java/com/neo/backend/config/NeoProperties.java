package com.neo.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "neo")
public record NeoProperties(
        Jwt jwt,
        double financeThreshold,
        String managerReminderDuration,
        String managerEscalationDuration,
        String storageDir,
        Workflow workflow) {

    public record Jwt(String secret, long expirySeconds) {
    }

    public record Workflow(
            String claimProcessKey,
            boolean syncEnabled,
            String gitUri,
            String gitBranch,
            String gitLocalDir,
            String processDirectory,
            long syncIntervalMs) {
    }
}
