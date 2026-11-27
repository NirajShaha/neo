package com.neo.backend.config;

import com.neo.backend.security.OktaAuthenticationConverter;
import com.neo.backend.security.OktaJwtValidators;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.SupplierJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/** The API is a stateless OAuth2 resource server: it only accepts Okta-issued access tokens. */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, OktaAuthenticationConverter converter) throws Exception {
        http.cors(Customizer.withDefaults())
                // Stateless bearer-token API: there is no ambient browser credential for CSRF to abuse.
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(converter)));
        return http.build();
    }

    /**
     * Signing keys are discovered from the issuer's OIDC metadata on first use (not at startup, so the API can boot
     * while Okta is unreachable), then cached and rotated by Nimbus.
     */
    @Bean
    @ConditionalOnMissingBean(JwtDecoder.class)
    JwtDecoder jwtDecoder(NeoProperties properties) {
        NeoProperties.Okta okta = properties.security().okta();
        if (okta.issuer() == null || okta.issuer().isBlank()) {
            throw new IllegalStateException(
                    "neo.security.okta.issuer (OKTA_ISSUER) must be set, e.g. https://your-org.okta.com/oauth2/default");
        }
        return new SupplierJwtDecoder(() -> {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withIssuerLocation(okta.issuer()).build();
            decoder.setJwtValidator(OktaJwtValidators.create(
                    okta.issuer(), okta.audience(), Duration.ofSeconds(okta.clockSkewSeconds())));
            return decoder;
        });
    }
}
