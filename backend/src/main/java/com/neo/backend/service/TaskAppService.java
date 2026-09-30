package com.neo.backend.service;

import com.neo.backend.domain.Claim;
import com.neo.backend.domain.MandateRequest;
import com.neo.backend.repo.ClaimRepository;
import com.neo.backend.repo.MandateRequestRepository;
import com.neo.backend.service.IdentityService.SessionUser;
import com.neo.backend.workflow.WorkflowFacade;
import com.neo.backend.workflow.dto.CompleteTaskRequest;
import com.neo.backend.workflow.dto.ProcessInstanceResponse;
import com.neo.backend.workflow.dto.TaskResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TaskAppService {

    private final WorkflowFacade workflow;
    private final ClaimRepository claims;
    private final MandateRequestRepository mandates;
    private final ClaimService claimService;
    private final MandateService mandateService;
    private final ActivityService activity;

    public TaskAppService(
            WorkflowFacade workflow,
            ClaimRepository claims,
            MandateRequestRepository mandates,
            ClaimService claimService,
            MandateService mandateService,
            ActivityService activity) {
        this.workflow = workflow;
        this.claims = claims;
        this.mandates = mandates;
        this.claimService = claimService;
        this.mandateService = mandateService;
        this.activity = activity;
    }

    public List<TaskResponse> listForUser(SessionUser user) {
        List<TaskResponse> tasks = new ArrayList<>();
        for (String group : user.groups()) {
            tasks.addAll(workflow.listTasks(null, group, null));
        }
        tasks.addAll(workflow.listTasks(user.id(), null, null));
        java.util.LinkedHashMap<String, TaskResponse> dedup = new java.util.LinkedHashMap<>();
        for (TaskResponse task : tasks) {
            dedup.put(task.taskId(), task);
        }
        return new ArrayList<>(dedup.values());
    }

    public TaskResponse getForUser(SessionUser user, String taskId) {
        TaskResponse task = workflow.getTask(taskId);
        assertCanAct(user, task);
        return task;
    }

    public ProcessInstanceResponse complete(SessionUser user, String taskId, Map<String, Object> variables) {
        TaskResponse task = workflow.getTask(taskId);
        assertCanAct(user, task);
        Map<String, Object> input = variables == null ? Map.of() : variables;
        boolean approved = !"REJECTED".equals(String.valueOf(input.getOrDefault("decision", "APPROVED")));
        Map<String, Object> engineVars = new HashMap<>(input);
        engineVars.put("approved", approved);
        engineVars.put("decidedBy", user.id());
        if (!engineVars.containsKey("comment")) {
            engineVars.put("comment", null);
        }
        ProcessInstanceResponse instance = workflow.complete(taskId, new CompleteTaskRequest(user.id(), engineVars));
        String businessKey = task.businessKey();
        if (businessKey != null) {
            claims.findByLineId(businessKey).ifPresent(claim -> {
                claimService.applyInstance(claim, instance);
                claims.save(claim);
            });
            mandates.findByNumber(businessKey).ifPresent(mandate -> {
                mandateService.applyInstance(mandate, instance);
                mandates.save(mandate);
            });
        }
        activity.record(
                approved ? "TASK_APPROVED" : "TASK_REJECTED",
                task.name(),
                "Claim".equals(entityType(task)) ? "Claim" : "MandateRequest",
                businessKey == null ? taskId : businessKey,
                user.id(),
                "{}");
        return instance;
    }

    public TaskResponse claim(SessionUser user, String taskId) {
        TaskResponse task = workflow.getTask(taskId);
        assertCanAct(user, task);
        return workflow.claim(taskId, user.id());
    }

    private void assertCanAct(SessionUser user, TaskResponse task) {
        boolean assignee = task.assignee() != null && task.assignee().equals(user.id());
        boolean candidate = task.candidateGroups() != null
                && task.candidateGroups().stream().anyMatch(user.groups()::contains);
        boolean readAll = user.permissions().contains("claim:read:all");
        if (!assignee && !candidate && !readAll) {
            throw new AccessDeniedException("You are not allowed to act on this task");
        }
    }

    private String entityType(TaskResponse task) {
        if (task.businessKey() == null) {
            return "Claim";
        }
        return mandates.findByNumber(task.businessKey()).isPresent() ? "Mandate" : "Claim";
    }

    public Claim lookupClaim(String businessKey) {
        if (businessKey == null) {
            return null;
        }
        return claims.findByLineId(businessKey).orElse(null);
    }
}
