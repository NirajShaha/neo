package com.neo.backend.repo;

import com.neo.backend.domain.Membership;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<Membership, String> {
    List<Membership> findByUserId(String userId);

    List<Membership> findByGroupId(String groupId);
}
