package com.neo.backend.repo;

import com.neo.backend.domain.Claim;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimRepository extends JpaRepository<Claim, String> {
    Optional<Claim> findByLineId(String lineId);

    List<Claim> findAllByOrderByCreatedOnDesc();

    List<Claim> findByWorkflowInstanceIdIsNotNull();

    List<Claim> findByCreatedByOrderByCreatedOnDesc(String createdBy);
}
