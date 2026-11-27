package com.neo.backend.security;

import com.neo.backend.config.NeoProperties;
import com.neo.backend.domain.AppGroup;
import com.neo.backend.domain.AppUser;
import com.neo.backend.domain.Membership;
import com.neo.backend.repo.AppGroupRepository;
import com.neo.backend.repo.AppUserRepository;
import com.neo.backend.repo.MembershipRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Maps a validated Okta identity onto the local {@link AppUser} that the rest of the application (workflows, task
 * assignment, audit trail) is keyed on. Okta owns authentication and, by default, group membership.
 */
@Service
public class OktaUserProvisioner {

    private static final Logger log = LoggerFactory.getLogger(OktaUserProvisioner.class);

    /** Resolved local identity for one request. */
    public record Resolved(String userId, String email, Set<String> groupKeys) {
    }

    private final AppUserRepository users;
    private final AppGroupRepository groups;
    private final MembershipRepository memberships;
    private final NeoProperties.Okta okta;

    public OktaUserProvisioner(
            AppUserRepository users,
            AppGroupRepository groups,
            MembershipRepository memberships,
            NeoProperties properties) {
        this.users = users;
        this.groups = groups;
        this.memberships = memberships;
        this.okta = properties.security().okta();
    }

    @Transactional
    public Resolved resolve(Jwt jwt) {
        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw reject("Token has no subject");
        }
        String email = emailOf(jwt, subject);
        AppUser user = findOrCreate(subject, email, nameOf(jwt, email));
        if (!user.isActive()) {
            throw reject("Account is disabled");
        }

        Set<String> tokenGroups = groupsOf(jwt);
        if (okta.syncGroups()) {
            syncMemberships(user, tokenGroups);
        }
        Set<String> effective = okta.syncGroups() ? tokenGroups : currentGroupKeys(user.getId());
        return new Resolved(user.getId(), user.getEmail(), effective);
    }

    private AppUser findOrCreate(String subject, String email, String name) {
        AppUser bySubject = users.findByOktaSubject(subject).orElse(null);
        if (bySubject != null) {
            if (!name.equals(bySubject.getName())) {
                bySubject.setName(name);
                users.save(bySubject);
            }
            return bySubject;
        }

        AppUser byEmail = users.findByEmailIgnoreCase(email).orElse(null);
        if (byEmail != null) {
            // Bind a pre-existing account (e.g. seeded or imported) to its Okta identity exactly once. An account
            // already bound to a different subject is never re-linked, so reusing an email cannot take it over.
            if (byEmail.getOktaSubject() != null) {
                throw reject("Account is bound to a different identity");
            }
            byEmail.setOktaSubject(subject);
            byEmail.setUpdatedBy("okta");
            return users.save(byEmail);
        }

        if (!okta.autoProvision()) {
            throw reject("No NEO account exists for this user");
        }
        AppUser created = new AppUser();
        created.setEmail(email);
        created.setName(name);
        created.setOktaSubject(subject);
        created.setCreatedBy("okta");
        log.info("Provisioning NEO user for Okta subject {}", subject);
        return users.save(created);
    }

    private void syncMemberships(AppUser user, Set<String> wantedKeys) {
        Set<String> wantedGroupIds = wantedKeys.stream()
                .map(key -> groups.findByKey(key).map(AppGroup::getId).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Set<String> presentGroupIds = new LinkedHashSet<>();
        for (Membership link : memberships.findByUserId(user.getId())) {
            if (wantedGroupIds.contains(link.getGroupId())) {
                presentGroupIds.add(link.getGroupId());
            } else {
                memberships.delete(link);
            }
        }
        for (String groupId : wantedGroupIds) {
            if (!presentGroupIds.contains(groupId)) {
                Membership link = new Membership();
                link.setUserId(user.getId());
                link.setGroupId(groupId);
                link.setCreatedBy("okta");
                memberships.save(link);
            }
        }
    }

    private Set<String> currentGroupKeys(String userId) {
        return memberships.findByUserId(userId).stream()
                .map(link -> groups.findById(link.getGroupId()).map(AppGroup::getKey).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /** Okta group names from the token, translated to local group keys; names with no local group are ignored. */
    private Set<String> groupsOf(Jwt jwt) {
        Object raw = jwt.getClaims().get(okta.groupsClaim());
        List<String> names = raw instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : raw instanceof String single && !single.isBlank() ? List.of(single) : List.of();
        Set<String> keys = new LinkedHashSet<>();
        for (String name : names) {
            String key = okta.groupMappings().getOrDefault(name, name);
            if (groups.findByKey(key).isPresent()) {
                keys.add(key);
            }
        }
        return keys;
    }

    private String emailOf(Jwt jwt, String subject) {
        String claim = jwt.getClaimAsString(okta.emailClaim());
        String email = claim != null && !claim.isBlank() ? claim : subject.contains("@") ? subject : null;
        if (email == null) {
            throw reject("Token carries no email; add an email claim to the Okta authorization server");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String nameOf(Jwt jwt, String fallback) {
        String name = jwt.getClaimAsString(okta.nameClaim());
        return name != null && !name.isBlank() ? name.trim() : fallback;
    }

    private static OAuth2AuthenticationException reject(String message) {
        return new OAuth2AuthenticationException(new OAuth2Error("invalid_token", message, null));
    }
}
