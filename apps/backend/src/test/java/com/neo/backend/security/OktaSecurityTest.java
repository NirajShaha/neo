package com.neo.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.neo.backend.domain.AppUser;
import com.neo.backend.repo.AppGroupRepository;
import com.neo.backend.repo.AppUserRepository;
import com.neo.backend.repo.MembershipRepository;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

/** Exercises the real security chain with RS256-signed tokens shaped like Okta access tokens. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(OktaSecurityTest.TestKeys.class)
class OktaSecurityTest {

    private static final String ISSUER = "https://neo-test.okta.example/oauth2/default";
    private static final String AUDIENCE = "api://neo-test";
    private static final KeyPair KEYS = generate();
    private static final KeyPair OTHER_KEYS = generate();

    @TestConfiguration
    static class TestKeys {
        @Bean
        @Primary
        JwtDecoder testJwtDecoder() {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEYS.getPublic()).build();
            decoder.setJwtValidator(OktaJwtValidators.create(ISSUER, AUDIENCE, Duration.ofSeconds(60)));
            return decoder;
        }
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private AppGroupRepository groups;

    @Autowired
    private MembershipRepository memberships;

    @Test
    void rejectsRequestsWithoutAToken() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void passwordLoginEndpointIsGone() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"email\":\"a@b.c\",\"password\":\"password\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/actuator/health/liveness")).andExpect(status().is(org.hamcrest.Matchers.not(401)));
    }

    @Test
    void validTokenProvisionsUserAndMapsKnownGroupsOnly() throws Exception {
        String sub = "00u" + UUID.randomUUID();
        String email = "new.user." + UUID.randomUUID() + "@corp.example";
        String token = token(KEYS, builder(sub, email).claim("name", "New User")
                .claim("groups", List.of("supervisors", "Everyone", "not-a-neo-group")));

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.name").value("New User"))
                .andExpect(jsonPath("$.groups[0]").value("supervisors"))
                .andExpect(jsonPath("$.groups.length()").value(1));

        AppUser user = users.findByOktaSubject(sub).orElseThrow();
        assertThat(user.getEmail()).isEqualTo(email);
        assertThat(user.getPasswordHash()).isEqualTo("OKTA_MANAGED");
    }

    @Test
    void groupsFollowOktaOnEveryLogin() throws Exception {
        String sub = "00u" + UUID.randomUUID();
        String email = "mover." + UUID.randomUUID() + "@corp.example";

        mvc.perform(get("/api/auth/me").header("Authorization",
                        "Bearer " + token(KEYS, builder(sub, email).claim("groups", List.of("supervisors", "employees")))))
                .andExpect(jsonPath("$.groups.length()").value(2));

        mvc.perform(get("/api/auth/me").header("Authorization",
                        "Bearer " + token(KEYS, builder(sub, email).claim("groups", List.of("finance")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.groups.length()").value(1))
                .andExpect(jsonPath("$.groups[0]").value("finance"));

        String userId = users.findByOktaSubject(sub).orElseThrow().getId();
        String financeId = groups.findByKey("finance").orElseThrow().getId();
        assertThat(memberships.findByUserId(userId)).extracting("groupId").containsExactly(financeId);
    }

    @Test
    void existingAccountBindsToItsOktaIdentityOnce() throws Exception {
        String email = "seeded." + UUID.randomUUID() + "@corp.example";
        AppUser existing = new AppUser();
        existing.setEmail(email);
        existing.setName("Seeded");
        users.save(existing);

        String firstSub = "00u" + UUID.randomUUID();
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token(KEYS, builder(firstSub, email))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(existing.getId()));
        assertThat(users.findById(existing.getId()).orElseThrow().getOktaSubject()).isEqualTo(firstSub);

        // A different Okta identity presenting the same email must not take the account over.
        String otherSub = "00u" + UUID.randomUUID();
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token(KEYS, builder(otherSub, email))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void emailFallsBackToSubjectWhenItLooksLikeAnEmail() throws Exception {
        String sub = "fallback." + UUID.randomUUID() + "@corp.example";
        String token = token(KEYS, new JWTClaimsSet.Builder().issuer(ISSUER).audience(AUDIENCE).subject(sub)
                .expirationTime(Date.from(Instant.now().plusSeconds(300))));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(sub));
    }

    @Test
    void disabledAccountIsRejected() throws Exception {
        String sub = "00u" + UUID.randomUUID();
        String email = "disabled." + UUID.randomUUID() + "@corp.example";
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token(KEYS, builder(sub, email))))
                .andExpect(status().isOk());

        AppUser user = users.findByOktaSubject(sub).orElseThrow();
        user.setActive(false);
        users.save(user);

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token(KEYS, builder(sub, email))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsTokensThatFailValidation() throws Exception {
        String email = "x." + UUID.randomUUID() + "@corp.example";

        // signed by a key Okta never published
        assertUnauthorized(token(OTHER_KEYS, builder("00ubad", email)));
        // wrong audience
        assertUnauthorized(token(KEYS, builder("00ubad", email).audience("api://someone-else")));
        // wrong issuer
        assertUnauthorized(token(KEYS, builder("00ubad", email).issuer("https://evil.example/oauth2/default")));
        // expired beyond clock skew
        assertUnauthorized(token(KEYS, builder("00ubad", email)
                .expirationTime(Date.from(Instant.now().minusSeconds(600)))));
        // garbage
        assertUnauthorized("not.a.jwt");
    }

    private void assertUnauthorized(String token) throws Exception {
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    private static JWTClaimsSet.Builder builder(String sub, String email) {
        return new JWTClaimsSet.Builder()
                .issuer(ISSUER)
                .audience(AUDIENCE)
                .subject(sub)
                .claim("email", email)
                .issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plusSeconds(300)));
    }

    private static String token(KeyPair keys, JWTClaimsSet.Builder claims) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims.build());
            jwt.sign(new RSASSASigner((RSAPrivateKey) keys.getPrivate()));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    private static KeyPair generate() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
