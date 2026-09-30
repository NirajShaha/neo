package com.neo.backend.repo;

import com.neo.backend.domain.AppGroup;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppGroupRepository extends JpaRepository<AppGroup, String> {
    Optional<AppGroup> findByKey(String key);
}
