package com.neo.backend.repo;

import com.neo.backend.domain.MandateRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MandateRequestRepository extends JpaRepository<MandateRequest, String> {
    Optional<MandateRequest> findByNumber(String number);

    List<MandateRequest> findAllByOrderByCreatedOnDesc();

    List<MandateRequest> findByWorkflowInstanceIdIsNotNull();
}
