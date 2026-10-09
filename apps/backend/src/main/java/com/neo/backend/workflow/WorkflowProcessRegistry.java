package com.neo.backend.workflow;

import com.neo.backend.config.NeoProperties;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Component;

@Component
public class WorkflowProcessRegistry {

    private final AtomicReference<String> claimProcessKey;

    public WorkflowProcessRegistry(NeoProperties properties) {
        String configuredKey = properties.workflow() == null
                ? null
                : properties.workflow().claimProcessKey();
        this.claimProcessKey = new AtomicReference<>(
                configuredKey == null || configuredKey.isBlank() ? null : configuredKey);
    }

    public String claimProcessKey() {
        return claimProcessKey.get();
    }

    public void setClaimProcessKey(String processKey) {
        if (processKey == null || processKey.isBlank()) {
            throw new IllegalArgumentException("A workflow process id is required");
        }
        claimProcessKey.set(processKey);
    }
}