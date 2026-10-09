package com.neo.backend.workflow.dto;

import jakarta.validation.constraints.NotBlank;

public record ApprovalDecisionRequest(@NotBlank String decision, String comment) {
}