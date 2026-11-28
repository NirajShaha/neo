package com.neo.backend.repo;

import com.neo.backend.domain.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, String> {
    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findByEmailIgnoreCase(String email);

    Optional<AppUser> findByIdentityIssuerAndIdentitySubject(String identityIssuer, String identitySubject);
}
