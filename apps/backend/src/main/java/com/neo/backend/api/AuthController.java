package com.neo.backend.api;

import com.neo.backend.domain.AppUser;
import com.neo.backend.service.ActivityService;
import com.neo.backend.service.IdentityService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final IdentityService identity;
    private final ActivityService activity;

    public AuthController(
            IdentityService identity,
            ActivityService activity) {
        this.identity = identity;
        this.activity = activity;
    }

    public record UserDto(String id, String email, String name, List<String> groups, List<String> permissions) {
    }

    @PostMapping("/logout")
    public void logout(Authentication authentication) {
        if (authentication != null) {
            activity.record("LOGOUT", "logout", "AppUser", authentication.getName(), authentication.getName(), "{}");
        }
    }

    @GetMapping("/me")
    public UserDto me(Authentication authentication) {
        if (authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return toDto(identity.sessionFor(authentication.getName()));
    }

    private UserDto toDto(IdentityService.SessionUser session) {
        return new UserDto(session.id(), session.email(), session.name(), session.groups(), session.permissions());
    }
}
