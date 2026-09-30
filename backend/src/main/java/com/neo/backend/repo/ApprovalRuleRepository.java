package com.neo.backend.repo;

import com.neo.backend.domain.ApprovalRule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalRuleRepository extends JpaRepository<ApprovalRule, String> {
    List<ApprovalRule> findByActiveTrueOrderByApprovalLimitAsc();
}
