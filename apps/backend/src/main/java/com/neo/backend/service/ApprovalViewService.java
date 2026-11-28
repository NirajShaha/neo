package com.neo.backend.service;

import com.neo.backend.domain.BaseEntity;
import com.neo.backend.domain.Claim;
import com.neo.backend.domain.MandateRequest;
import com.neo.backend.domain.TaskDecision;
import com.neo.backend.repo.ClaimRepository;
import com.neo.backend.repo.MandateRequestRepository;
import com.neo.backend.repo.TaskDecisionRepository;
import com.neo.backend.service.IdentityService.SessionUser;
import com.neo.backend.workflow.WorkflowFacade;
import com.neo.backend.workflow.dto.ApprovalDecisionItem;
import com.neo.backend.workflow.dto.PendingApprovalView;
import com.neo.backend.workflow.dto.TaskResponse;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Role aware approval views. "Pending" is what waits for the user (their approval queue) or on a
 * request they raised; "decided" is what they approved or what was decided on their requests.
 */
@Service
public class ApprovalViewService {

    private final WorkflowFacade workflow;
    private final ClaimRepository claims;
    private final MandateRequestRepository mandates;
    private final TaskDecisionRepository decisions;
    private final UserDisplayService display;

    public ApprovalViewService(
            WorkflowFacade workflow,
            ClaimRepository claims,
            MandateRequestRepository mandates,
            TaskDecisionRepository decisions,
            UserDisplayService display) {
        this.workflow = workflow;
        this.claims = claims;
        this.mandates = mandates;
        this.decisions = decisions;
        this.display = display;
    }

    public List<PendingApprovalView> pending(SessionUser user) {
        Map<String, TaskResponse> tasks = new LinkedHashMap<>();
        for (String group : user.groups()) {
            for (TaskResponse task : workflow.listTasks(null, group, null)) {
                tasks.put(task.taskId(), task);
            }
        }
        for (TaskResponse task : workflow.listTasks(user.id(), null, null)) {
            tasks.put(task.taskId(), task);
        }
        for (Claim claim : claims.findByCreatedByOrderByCreatedOnDesc(user.id())) {
            if (claim.getWorkflowInstanceId() == null) {
                continue;
            }
            for (TaskResponse task : workflow.listTasks(null, null, claim.getWorkflowInstanceId())) {
                tasks.put(task.taskId(), task);
            }
        }
        Set<String> requestIds = tasks.values().stream()
                .map(TaskResponse::businessKey)
                .filter(id -> id != null && !id.isBlank())
                .collect(java.util.stream.Collectors.toSet());
        Map<String, Claim> claimById = requestIds.isEmpty() ? Map.of()
                : claims.findByLineIdIn(requestIds).stream()
                        .collect(java.util.stream.Collectors.toMap(Claim::getLineId, c -> c, (a, b) -> a));
        Set<String> mandateIds = requestIds.stream()
                .filter(id -> !claimById.containsKey(id))
                .collect(java.util.stream.Collectors.toSet());
        Map<String, MandateRequest> mandateByNumber = mandateIds.isEmpty() ? Map.of()
                : mandates.findByNumberIn(mandateIds).stream()
                        .collect(java.util.stream.Collectors.toMap(MandateRequest::getNumber, m -> m, (a, b) -> a));
        Map<String, String> nameCache = new java.util.HashMap<>();
        java.util.Set<String> raiserIds = tasks.values().stream()
                .map(TaskResponse::businessKey)
                .filter(id -> id != null && !id.isBlank())
                .map(id -> {
                    Claim c = claimById.get(id);
                    if (c != null) {
                        return c.getCreatedBy();
                    }
                    MandateRequest m = mandateByNumber.get(id);
                    return m == null ? null : m.getCreatedBy();
                })
                .filter(id -> id != null && !id.isBlank())
                .collect(java.util.stream.Collectors.toSet());
        nameCache.putAll(display.namesById(raiserIds));
        List<PendingApprovalView> views = new ArrayList<>();
        for (TaskResponse task : tasks.values()) {
            views.add(toPendingView(user, task, claimById, mandateByNumber, nameCache));
        }
        return views;
    }

    public List<ApprovalDecisionItem> decided(SessionUser user) {
        return decided(user, 0, 100);
    }

    public List<ApprovalDecisionItem> decided(SessionUser user, int page, int size) {
        int boundedSize = Math.max(1, Math.min(size, 100));
        org.springframework.data.domain.Pageable pageable =
                org.springframework.data.domain.PageRequest.of(Math.max(0, page), boundedSize);
        Set<String> raisedByMe = new HashSet<>();
        for (Claim claim : claims.findByCreatedByOrderByCreatedOnDesc(user.id())) {
            raisedByMe.add(claim.getLineId());
        }
        for (MandateRequest mandate : mandates.findByCreatedByOrderByCreatedOnDesc(user.id())) {
            raisedByMe.add(mandate.getNumber());
        }

        Map<String, TaskDecision> merged = new LinkedHashMap<>();
        for (TaskDecision decision : decisions.findByActorIdOrderByCreatedOnDesc(user.id(), pageable)) {
            merged.put(decision.getId(), decision);
        }
        if (!raisedByMe.isEmpty()) {
            for (TaskDecision decision : decisions.findByRequestIdInOrderByCreatedOnDesc(raisedByMe, pageable)) {
                merged.put(decision.getId(), decision);
            }
        }
        return merged.values().stream()
                .sorted(Comparator.comparing(BaseEntity::getCreatedOn).reversed())
                .limit(boundedSize)
                .map(this::toDecisionItem)
                .toList();
    }

    private PendingApprovalView toPendingView(SessionUser user, TaskResponse task) {
        return toPendingView(user, task, Map.of(), Map.of(), new java.util.HashMap<>());
    }

    private PendingApprovalView toPendingView(
            SessionUser user,
            TaskResponse task,
            Map<String, Claim> claimById,
            Map<String, MandateRequest> mandateByNumber,
            Map<String, String> nameCache) {
        String requestId = task.businessKey();
        Claim claim = requestId == null ? null : claimById.get(requestId);
        MandateRequest mandate = requestId == null || claim != null
                ? null
                : mandateByNumber.get(requestId);

        String requestType = mandate != null ? "Mandate" : "Claim";
        String description = null;
        String vendor = null;
        String value = null;
        String raisedById = null;
        if (mandate != null) {
            description = mandate.getCategory() == null ? mandate.getClaimIds() : mandate.getCategory();
            raisedById = mandate.getCreatedBy();
        } else if (claim != null) {
            description = claim.getDescription();
            vendor = claim.getVendorName();
            value = claim.getReportingValue();
            raisedById = claim.getCreatedBy();
        }

        boolean canAct = TaskAppService.canAct(user, task);

        return new PendingApprovalView(
                task.taskId(),
                task.name(),
                task.taskDefinitionKey(),
                requestId,
                requestType,
                description,
                vendor,
                value,
                raisedById,
                userName(raisedById, nameCache),
                task.createdTime(),
                canAct,
                task.candidateGroups() == null ? List.of() : task.candidateGroups());
    }

    private ApprovalDecisionItem toDecisionItem(TaskDecision decision) {
        String requestType = "Mandate".equals(decision.getRequestType()) ? "Mandate" : "Claim";
        return new ApprovalDecisionItem(
                decision.getTaskId(),
                decision.getRequestId(),
                requestType,
                decision.getTaskName(),
                decision.getDecision(),
                decision.getComment(),
                decision.getActorId(),
                userName(decision.getActorId()),
                decision.getCreatedOn());
    }

    private String userName(String userId) {
        return display.nameOf(userId);
    }

    private String userName(String userId, Map<String, String> cache) {
        return display.nameOf(userId, cache);
    }
}
