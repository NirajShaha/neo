package com.neo.backend.security;

import com.neo.backend.config.OktaProperties;
import com.neo.backend.service.IdentityService;
import java.net.URL;
import java.util.Collection;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.BearerTokenError;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class OktaJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final Logger log = LoggerFactory.getLogger(OktaJwtAuthenticationConverter.class);

    private final IdentityService identity;
    private final OktaProperties properties;

    public OktaJwtAuthenticationConverter(IdentityService identity, OktaProperties properties) {
        this.identity = identity;
        this.properties = properties;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt token) {
        try {
            String email = token.getClaimAsString("email");
            if (email == null || email.isBlank()) {
                email = token.getClaimAsString("preferred_username");
            }
            if (email == null || email.isBlank()) {
                email = token.getSubject();
            }
            IdentityService.SessionUser user = identity.resolveOktaSession(
                    issuer(token.getIssuer()),
                    token.getSubject(),
                    email,
                    token.getClaimAsString("name"),
                    true,
                    groups(token.getClaim(properties.groupsClaim())));
            var authorities = user.groups().stream()
                    .map(group -> new SimpleGrantedAuthority("GROUP_" + group))
                    .toList();
            return new JwtAuthenticationToken(token, authorities, user.id());
        } catch (ResponseStatusException rejected) {
            log.warn("Rejected Okta access token: {}", rejected.getReason());
            throw new OAuth2AuthenticationException(new BearerTokenError(
                    "invalid_token",
                    HttpStatus.UNAUTHORIZED,
                    "The Okta user is not authorized for this application",
                    null));
        }
    }

    private static String issuer(URL issuer) {
        return issuer == null ? "" : issuer.toString();
    }

    private static boolean isTrue(Object claim) {
        return Boolean.TRUE.equals(claim) || "true".equalsIgnoreCase(String.valueOf(claim));
    }

    private static List<String> groups(Object claim) {
        if (claim instanceof Collection<?> values) {
            return values.stream().map(String::valueOf).toList();
        }
        if (claim instanceof String value && !value.isBlank()) {
            return List.of(value);
        }
        return List.of();
    }
}
