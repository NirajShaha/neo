package com.neo.backend.repo;

import com.neo.backend.domain.Claim;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimRepository extends JpaRepository<Claim, String> {
    Optional<Claim> findByLineId(String lineId);

    Optional<Claim> findTopByOrderByLineIdDesc();

    List<Claim> findAllByOrderByCreatedOnDesc();

    List<Claim> findByStatusOrderByCreatedOnDesc(String status);

    List<Claim> findByWorkflowInstanceIdIsNotNull();

    List<Claim> findByLineIdIn(java.util.Collection<String> lineIds);

    List<Claim> findByCreatedByOrderByCreatedOnDesc(String createdBy);
}
