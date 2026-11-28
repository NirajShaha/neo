package com.neo.backend.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.neo.backend.domain.AppGroup;
import com.neo.backend.domain.AppUser;
import com.neo.backend.repo.AppGroupRepository;
import com.neo.backend.repo.AppUserRepository;
import com.neo.backend.service.IdentityService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
class AuthSecurityTest {

    @Autowired
    private IdentityService identity;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private AppGroupRepository groups;

    @BeforeEach
    void seedGroups() {
        ensureGroup("employees");
        ensureGroup("supervisors");
    }

    @Test
    void tokenWithoutGroupsIsRejected() {
        assertThatThrownBy(() -> identity.resolveOktaSession(
                        "https://example.okta.com/oauth2/default",
                        "sub-123",
                        "nogroups@neo.dev",
                        "No Groups",
                        true,
                        List.of("unknown-group")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("No NEO groups assigned");
    }

    @Test
    void tokenWithoutEmailIsRejected() {
        assertThatThrownBy(() -> identity.resolveOktaSession(
                        "https://example.okta.com/oauth2/default",
                        "sub-456",
                        "",
                        "No Email",
                        true,
                        List.of("employees")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("An email is required");
    }

    @Test
    void tokenWithGroupLinksUser() {
        IdentityService.SessionUser session = identity.resolveOktaSession(
                "https://example.okta.com/oauth2/default",
                "sub-employee",
                "linked@neo.dev",
                "Linked User",
                true,
                List.of("employees"));
        assertThat(session.email()).isEqualTo("linked@neo.dev");
        assertThat(session.groups()).contains("employees");
        AppUser user =
                users.findByEmailIgnoreCase("linked@neo.dev").orElseThrow();
        assertThat(user.getIdentitySubject()).isEqualTo("sub-employee");
    }

    private void ensureGroup(String key) {
        if (groups.findByKey(key).isEmpty()) {
            AppGroup group = new AppGroup();
            group.setKey(key);
            group.setName(key);
            group.setPermissions("");
            group.setCreatedBy("test");
            groups.save(group);
        }
    }
}
