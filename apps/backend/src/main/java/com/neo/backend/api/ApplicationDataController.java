package com.neo.backend.api;

import com.neo.backend.service.ApplicationDataService;
import com.neo.backend.service.IdentityService;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bootstrap")
public class ApplicationDataController {
    private final ApplicationDataService data;
    private final IdentityService identity;

    public ApplicationDataController(ApplicationDataService data, IdentityService identity) {
        this.data = data;
        this.identity = identity;
    }

    @GetMapping
    public Map<String, Object> bootstrap(Authentication authentication) {
        return data.load(identity.sessionFor(authentication.getName()));
    }
}