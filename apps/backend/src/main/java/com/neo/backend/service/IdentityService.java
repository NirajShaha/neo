package com.neo.backend.service;

import com.neo.backend.domain.AppGroup;
import com.neo.backend.domain.AppUser;
import com.neo.backend.domain.Membership;
import com.neo.backend.repo.AppGroupRepository;
import com.neo.backend.repo.AppUserRepository;
import com.neo.backend.repo.MembershipRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IdentityService {

    private final AppUserRepository users;
    private final AppGroupRepository groups;
    private final MembershipRepository memberships;

    public IdentityService(AppUserRepository users, AppGroupRepository groups, MembershipRepository memberships) {
        this.users = users;
        this.groups = groups;
        this.memberships = memberships;
    }

    public record SessionUser(String id, String email, String name, List<String> groups, List<String> permissions) {
    }

    public SessionUser sessionFor(String userId) {
        AppUser user = users.findById(userId)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user"));
        List<Membership> links = memberships.findByUserId(userId);
        List<String> groupKeys = new ArrayList<>();
        List<String> permissions = new ArrayList<>();
        Map<String, AppGroup> groupCache = new HashMap<>();
        for (Membership link : links) {
            AppGroup group = groupCache.computeIfAbsent(link.getGroupId(), groups::findByIdOrNull);
            if (group == null) {
                continue;
            }
            groupKeys.add(group.getKey());
            if (group.getPermissions() != null && !group.getPermissions().isBlank()) {
                Arrays.stream(group.getPermissions().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .forEach(permissions::add);
            }
        }
        return new SessionUser(user.getId(), user.getEmail(), user.getName(), groupKeys, permissions);
    }

    @Transactional
    public SessionUser resolveOktaSession(
            String issuer,
            String subject,
            String email,
            String name,
            boolean emailVerified,
            List<String> externalGroups) {
        if (issuer == null || issuer.isBlank() || subject == null || subject.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Okta identity");
        }
        AppUser user = users.findByIdentityIssuerAndIdentitySubject(issuer, subject)
                .orElseGet(() -> linkOrCreateUser(issuer, subject, email, name, emailVerified));
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inactive user");
        }
        if (!sameIdentity(user, issuer, subject)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Okta identity is already linked");
        }

        List<AppGroup> oktaGroups = externalGroups == null
                ? List.of()
                : externalGroups.stream()
                        .distinct()
                        .map(groups::findByKey)
                        .flatMap(java.util.Optional::stream)
                        .toList();
        if (oktaGroups.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No NEO groups assigned");
        }
        syncMemberships(user, oktaGroups);
        return sessionFor(user.getId());
    }

    private AppUser linkOrCreateUser(
            String issuer, String subject, String email, String name, boolean emailVerified) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "An email is required");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        AppUser user = users.findByEmailIgnoreCase(normalizedEmail).orElseGet(() -> {
            AppUser created = new AppUser();
            created.setEmail(normalizedEmail);
            created.setName(name == null || name.isBlank() ? normalizedEmail : name.trim());
            created.setPasswordHash("{okta}");
            created.setCreatedBy("okta");
            return created;
        });
        if (user.getIdentityIssuer() != null || user.getIdentitySubject() != null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email is linked to another Okta identity");
        }
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inactive user");
        }
        user.setIdentityIssuer(issuer);
        user.setIdentitySubject(subject);
        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
        }
        users.save(user);
        return user;
    }

    private static boolean sameIdentity(AppUser user, String issuer, String subject) {
        return issuer.equals(user.getIdentityIssuer()) && subject.equals(user.getIdentitySubject());
    }

    private void syncMemberships(AppUser user, List<AppGroup> oktaGroups) {
        List<Membership> existing = memberships.findByUserId(user.getId());
        Set<String> desiredGroupIds = oktaGroups.stream()
                .map(AppGroup::getId)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        memberships.deleteAll(existing.stream()
                .filter(link -> !desiredGroupIds.contains(link.getGroupId()))
                .toList());
        Set<String> currentGroupIds = existing.stream()
                .map(Membership::getGroupId)
                .collect(java.util.stream.Collectors.toSet());
        for (String groupId : desiredGroupIds) {
            if (currentGroupIds.contains(groupId)) {
                continue;
            }
            Membership membership = new Membership();
            membership.setUserId(user.getId());
            membership.setGroupId(groupId);
            membership.setCreatedBy("okta");
            memberships.save(membership);
        }
    }

    public List<String> userIdsInGroups(List<String> groupKeys) {
        if (groupKeys == null || groupKeys.isEmpty()) {
            return List.of();
        }
        List<AppGroup> matched = new ArrayList<>();
        for (String key : groupKeys) {
            groups.findByKey(key).ifPresent(matched::add);
        }
        if (matched.isEmpty()) {
            return List.of();
        }
        List<String> groupIds = matched.stream().map(AppGroup::getId).toList();
        return memberships.findByGroupIdIn(groupIds).stream()
                .map(Membership::getUserId)
                .toList();
    }
}
