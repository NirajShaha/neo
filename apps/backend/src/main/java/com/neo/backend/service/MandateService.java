package com.neo.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neo.backend.config.NeoProperties;
import com.neo.backend.domain.MandateRequest;
import com.neo.backend.repo.MandateRequestRepository;
import com.neo.backend.workflow.WorkflowFacade;
import com.neo.backend.workflow.dto.ProcessInstanceResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MandateService {

    private final MandateRequestRepository mandates;
    private final WorkflowFacade workflow;
    private final ActivityService activity;
    private final NeoProperties properties;
    private final ObjectMapper mapper;
    private final org.springframework.context.ApplicationContext context;

    public MandateService(
            MandateRequestRepository mandates,
            WorkflowFacade workflow,
            ActivityService activity,
            NeoProperties properties,
            ObjectMapper mapper,
            org.springframework.context.ApplicationContext context) {
        this.mandates = mandates;
        this.workflow = workflow;
        this.activity = activity;
        this.properties = properties;
        this.mapper = mapper;
        this.context = context;
    }

    private MandateService self() {
        return context.getBean(MandateService.class);
    }

    public List<MandateRequest> list() {
        return mandates.findAllByOrderByCreatedOnDesc();
    }

    public MandateRequest get(String number) {
        return mandates.findByNumber(number)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mandate not found: " + number));
    }

    @Transactional
    public MandateRequest create(String userId, String userName, Map<String, Object> payload) {
        MandateRequest mandate = new MandateRequest();
        mandate.setCreatedBy(userId);
        mandate.setRaiser(userName == null ? "Buyer Officer" : userName);
        applyPayload(mandate, payload);
        MandateRequest saved = self().saveWithUniqueNumber(mandate);
        activity.record("MANDATE_CREATED", saved.getNumber(), "MandateRequest", saved.getNumber(), userId, "{}");
        return saved;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public MandateRequest submit(String userId, String number) {
        MandateRequest mandate = get(number);
        if (mandate.getWorkflowInstanceId() != null) {
            return mandate;
        }
        mandate.setOverall("Awaiting DOA Approval Mandate Request");
        mandate.setDoa("Submitted");
        mandate.setWorkflowState("RUNNING");
        mandate.setUpdatedBy(userId);
        mandates.save(mandate);

        Map<String, Object> variables = new HashMap<>();
        variables.put("requestId", number);
        variables.put("businessKey", number);
        variables.put("entityType", "MANDATE");
        variables.put("submittedBy", userId);
        variables.put("employeeGroup", "employees");
        variables.put("supervisorGroup", "supervisors");
        variables.put("financeGroup", "finance");
        variables.put("managerReminderDuration", properties.managerReminderDuration());
        variables.put("managerEscalationDuration", properties.managerEscalationDuration());
        try {
            Map<String, Object> payload = mapper.readValue(mandate.getPayload(), Map.class);
            Object claimIds = payload.get("claimIds");
            if (claimIds instanceof List<?> list) {
                variables.put("claimIds", list.stream().map(String::valueOf).toList());
            }
        } catch (Exception ignored) {
        }

        ProcessInstanceResponse instance = workflow.start(
                new com.neo.backend.workflow.dto.StartProcessRequest("mandateApproval", number, variables));
        mandate.setWorkflowInstanceId(instance.processInstanceId());
        mandate.setWorkflowState("RUNNING");
        if (!instance.activeTaskKeys().isEmpty()) {
            mandate.setCurrentTaskKey(instance.activeTaskKeys().get(0));
        }
        mandates.save(mandate);
        activity.record("WORKFLOW_STARTED", "mandateApproval", "MandateRequest", number, userId, "{}");
        return mandate;
    }

    public void applyInstance(MandateRequest mandate, ProcessInstanceResponse instance) {
        mandate.setWorkflowInstanceId(instance.processInstanceId());
        if (instance.ended()) {
            mandate.setWorkflowState("ENDED");
            mandate.setCurrentTaskKey(null);
        } else {
            mandate.setWorkflowState("RUNNING");
            if (!instance.activeTaskKeys().isEmpty()) {
                mandate.setCurrentTaskKey(instance.activeTaskKeys().get(0));
            }
        }
    }

    private void applyPayload(MandateRequest mandate, Map<String, Object> payload) {
        if (payload == null) {
            return;
        }
        try {
            mandate.setPayload(mapper.writeValueAsString(payload));
        } catch (Exception e) {
            mandate.setPayload("{}");
        }
        mandate.setCategory(str(payload, "category", mandate.getCategory()));
        mandate.setStakeholders(str(payload, "stakeholders", mandate.getStakeholders()));
        Object claimIds = payload.get("claimIds");
        if (claimIds instanceof List<?> list) {
            mandate.setClaimIds(String.join(",", list.stream().map(String::valueOf).toList()));
        } else if (payload.get("claimId") != null) {
            mandate.setClaimIds(String.valueOf(payload.get("claimId")));
        }
    }

    private String str(Map<String, Object> payload, String key, String fallback) {
        Object value = payload.get(key);
        return value == null ? fallback : String.valueOf(value);
    }

    private static final Object NUMBER_LOCK = new Object();

    private String nextNumber() {
        int max = mandates.findTopByOrderByNumberDesc()
                .map(MandateRequest::getNumber)
                .map(number -> {
                    try {
                        return Integer.parseInt(number);
                    } catch (NumberFormatException e) {
                        return 63;
                    }
                })
                .orElse(63);
        return String.valueOf(max + 1);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public MandateRequest saveWithUniqueNumber(MandateRequest mandate) {
        synchronized (NUMBER_LOCK) {
            for (int attempt = 0; attempt < 5; attempt++) {
                mandate.setNumber(nextNumber());
                try {
                    return mandates.saveAndFlush(mandate);
                } catch (org.springframework.dao.DataIntegrityViolationException duplicate) {
                    // concurrent create grabbed the same number; retry with the next one
                }
            }
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Could not assign a mandate number, try again");
    }
}
