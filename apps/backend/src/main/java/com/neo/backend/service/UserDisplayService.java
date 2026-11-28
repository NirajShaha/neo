package com.neo.backend.service;

import com.neo.backend.domain.AppUser;
import com.neo.backend.repo.AppUserRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class UserDisplayService {

    private final AppUserRepository users;

    public UserDisplayService(AppUserRepository users) {
        this.users = users;
    }

    public Map<String, String> namesById(Collection<String> userIds) {
        Map<String, String> names = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) {
            return names;
        }
        for (AppUser user : users.findByIdIn(userIds.stream().filter(id -> id != null && !id.isBlank()).toList())) {
            names.put(user.getId(), user.getName());
        }
        return names;
    }

    public String nameOf(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        return users.findById(userId).map(AppUser::getName).orElse(null);
    }

    public String nameOf(String userId, Map<String, String> cache) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        return cache.computeIfAbsent(userId, this::nameOf);
    }
}
