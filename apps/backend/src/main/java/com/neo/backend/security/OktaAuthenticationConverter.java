package com.neo.backend.security;

import java.util.List;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Turns a validated Okta JWT into an authentication whose name is the local user id, so controllers keep using
 * {@code authentication.getName()} exactly as before.
 */
@Component
public class OktaAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final OktaUserProvisioner provisioner;

    public OktaAuthenticationConverter(OktaUserProvisioner provisioner) {
        this.provisioner = provisioner;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        OktaUserProvisioner.Resolved user = provisioner.resolve(jwt);
        List<GrantedAuthority> authorities = user.groupKeys().stream()
                .<GrantedAuthority>map(key -> new SimpleGrantedAuthority("GROUP_" + key))
                .toList();
        return new JwtAuthenticationToken(jwt, authorities, user.userId());
    }
}
