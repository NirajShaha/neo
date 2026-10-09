package com.neo.backend.service;

import com.neo.backend.domain.AppUser;
import com.neo.backend.domain.Claim;
import com.neo.backend.domain.MandateRequest;
import com.neo.backend.domain.TaskDecision;
import com.neo.backend.repo.AppUserRepository;
import com.neo.backend.repo.ClaimRepository;
import com.neo.backend.repo.MandateRequestRepository;
import com.neo.backend.repo.TaskDecisionRepository;
import com.neo.backend.service.IdentityService.SessionUser;
import com.neo.backend.workflow.WorkflowFacade;
import com.neo.backend.workflow.dto.ClaimDecisionView;
import com.neo.backend.workflow.dto.ClaimTaskView;
import com.neo.backend.workflow.dto.CompleteTaskRequest;
import com.neo.backend.workflow.dto.ApprovalDecisionRequest;
import com.neo.backend.workflow.dto.ProcessInstanceResponse;
import com.neo.backend.workflow.dto.TaskResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.flowable.common.engine.api.FlowableObjectNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TaskAppService {

    private final WorkflowFacade workflow;
    private final ClaimRepository claims;
    private final MandateRequestRepository mandates;
    private final TaskDecisionRepository decisions;
    private final AppUserRepository users;
    private final ClaimService claimService;
    private final MandateService mandateService;
    private final ActivityService activity;
    private final UserEventService events;

    public TaskAppService(
            WorkflowFacade workflow,
            ClaimRepository claims,
            MandateRequestRepository mandates,
            TaskDecisionRepository decisions,
            AppUserRepository users,
            ClaimService claimService,
            MandateService mandateService,
            ActivityService activity,
            UserEventService events) {
        this.workflow = workflow;
        this.claims = claims;
        this.mandates = mandates;
        this.decisions = decisions;
        this.users = users;
        this.claimService = claimService;
        this.mandateService = mandateService;
        this.activity = activity;
        this.events = events;
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

    @Transactional
    public ProcessInstanceResponse complete(SessionUser user, String taskId, ApprovalDecisionRequest request) {
        TaskResponse task = workflow.getTask(taskId);
        assertCanAct(user, task);
        String decisionValue = request.decision() == null ? "" : request.decision().trim().toUpperCase();
        if (!decisionValue.equals("APPROVED") && !decisionValue.equals("REJECTED")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "decision must be APPROVED or REJECTED");
        }
        boolean approved = decisionValue.equals("APPROVED");
        Map<String, Object> engineVars = new HashMap<>();
        engineVars.put("approved", approved);
        engineVars.put("decidedBy", user.id());
        engineVars.put("comment", request.comment() == null ? null : request.comment().trim());
        ProcessInstanceResponse instance;
        try {
            instance = workflow.complete(taskId, new CompleteTaskRequest(user.id(), engineVars));
        } catch (FlowableObjectNotFoundException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Task was already completed");
        }
        String businessKey = task.businessKey();
        if (businessKey != null) {
            claims.findByLineId(businessKey).ifPresent(claim -> {
                claimService.applyInstance(claim, instance);
                claims.save(claim);
                events.publishAfterCommit(claim.getCreatedBy(), "workflow");
            });
            mandates.findByNumber(businessKey).ifPresent(mandate -> {
                mandateService.applyInstance(mandate, instance);
                mandates.save(mandate);
                events.publishAfterCommit(mandate.getCreatedBy(), "workflow");
            });
        }
        if (businessKey != null) {
            TaskDecision decision = new TaskDecision();
            decision.setRequestId(businessKey);
            decision.setTaskId(taskId);
            decision.setTaskKey(task.taskDefinitionKey());
            decision.setTaskName(task.name());
            decision.setDecision(approved ? "APPROVED" : "REJECTED");
            decision.setComment(request.comment() == null ? "" : request.comment().trim());
            decision.setActorId(user.id());
            decisions.save(decision);
        }
        activity.record(
                approved ? "TASK_APPROVED" : "TASK_REJECTED",
                task.name(),
                "Claim".equals(entityType(task)) ? "Claim" : "MandateRequest",
                businessKey == null ? taskId : businessKey,
                user.id(),
                "{}");
        events.publishAfterCommit(user.id(), "workflow");
        return instance;
    }

    /**
     * Every workflow task of a claim (open and completed) with the decision taken,
     * if any.
     */
    public List<ClaimTaskView> claimTasks(String lineId) {
        Claim claim = claims.findByLineId(lineId).orElse(null);
        if (claim == null || claim.getWorkflowInstanceId() == null) {
            return List.of();
        }
        Map<String, TaskDecision> byTask = decisions.findByRequestIdOrderByCreatedOnAsc(lineId).stream()
                .collect(Collectors.toMap(TaskDecision::getTaskId, Function.identity(), (first, second) -> second));
        return workflow.listTaskHistory(claim.getWorkflowInstanceId()).stream()
                .map(item -> new ClaimTaskView(
                        item.taskId(),
                        item.name(),
                        item.taskDefinitionKey(),
                        item.status(),
                        item.assignee(),
                        userName(item.assignee()),
                        byTask.containsKey(item.taskId()) ? byTask.get(item.taskId()).getDecision() : null,
                        item.createdOn(),
                        item.completedOn()))
                .toList();
    }

    /** The approval decisions recorded against a claim, oldest first. */
    public List<ClaimDecisionView> claimDecisions(String lineId) {
        return decisions.findByRequestIdOrderByCreatedOnAsc(lineId).stream()
                .map(decision -> new ClaimDecisionView(
                        decision.getTaskId(),
                        decision.getTaskKey(),
                        decision.getTaskName(),
                        decision.getDecision(),
                        decision.getComment(),
                        decision.getActorId(),
                        userName(decision.getActorId()),
                        decision.getCreatedOn()))
                .toList();
    }

    private String userName(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        return users.findById(userId).map(AppUser::getName).orElse(null);
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
        if (!assignee && !candidate) {
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
