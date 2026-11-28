package com.neo.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.neo.backend.workflow.dto.TaskResponse;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class TaskPermissionTest {

    private static TaskResponse task(String assignee, List<String> candidates) {
        return new TaskResponse(
                "task-1",
                "Manager approval",
                "managerApproval",
                "proc-1",
                "claimLifecycleV5",
                "MCI-00001",
                assignee,
                candidates,
                null,
                java.util.Map.of(),
                Instant.now());
    }

    @Test
    void assigneeMayAct() {
        IdentityService.SessionUser user =
                new IdentityService.SessionUser("u1", "a@neo.dev", "A", List.of(), List.of());
        assertThat(TaskAppService.canAct(user, task("u1", List.of("supervisors")))).isTrue();
    }

    @Test
    void candidateGroupMayAct() {
        IdentityService.SessionUser user = new IdentityService.SessionUser(
                "u2", "b@neo.dev", "B", List.of("supervisors"), List.of());
        assertThat(TaskAppService.canAct(user, task(null, List.of("supervisors")))).isTrue();
    }

    @Test
    void strangerMayNotAct() {
        IdentityService.SessionUser user = new IdentityService.SessionUser(
                "u3", "c@neo.dev", "C", List.of("employees"), List.of());
        assertThat(TaskAppService.canAct(user, task(null, List.of("supervisors")))).isFalse();
    }
}
