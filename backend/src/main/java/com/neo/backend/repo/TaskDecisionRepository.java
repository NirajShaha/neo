package com.neo.backend.repo;

import com.neo.backend.domain.TaskDecision;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskDecisionRepository extends JpaRepository<TaskDecision, String> {
    List<TaskDecision> findByRequestIdOrderByCreatedOnAsc(String requestId);

    List<TaskDecision> findByActorIdOrderByCreatedOnDesc(String actorId);

    List<TaskDecision> findByRequestIdInOrderByCreatedOnDesc(Collection<String> requestIds);
}
