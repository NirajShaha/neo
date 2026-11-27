package com.neo.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "neo")
public record NeoProperties(
        Security security,
        Seed seed,
        double financeThreshold,
        String managerReminderDuration,
        String managerEscalationDuration,
        String storageDir,
        Workflow workflow) {

    /** Okta (OIDC) resource-server settings. The access token is the only credential the API accepts. */
    public record Security(Okta okta) {
    }

    /**
     * @param issuer        Okta authorization-server issuer, e.g. https://acme.okta.com/oauth2/default
     * @param audience      required {@code aud} of the access token (default auth server: api://default)
     * @param emailClaim    claim holding the user's email; falls back to {@code sub} when it looks like an email
     * @param nameClaim     claim holding the display name; falls back to the email
     * @param groupsClaim   claim holding the Okta group names
     * @param syncGroups    when true the token's groups are the source of truth for local memberships
     * @param autoProvision create the local user on first successful login
     * @param groupMappings optional Okta group name to local group key mapping (default: same name)
     * @param clockSkewSeconds tolerated clock drift when validating exp/nbf
     */
    public record Okta(
            String issuer,
            String audience,
            String emailClaim,
            String nameClaim,
            String groupsClaim,
            boolean syncGroups,
            boolean autoProvision,
            java.util.Map<String, String> groupMappings,
            long clockSkewSeconds) {

        public Okta {
            audience = blankTo(audience, "api://default");
            emailClaim = blankTo(emailClaim, "email");
            nameClaim = blankTo(nameClaim, "name");
            groupsClaim = blankTo(groupsClaim, "groups");
            groupMappings = groupMappings == null ? java.util.Map.of() : java.util.Map.copyOf(groupMappings);
            clockSkewSeconds = clockSkewSeconds <= 0 ? 60 : clockSkewSeconds;
        }

        private static String blankTo(String value, String fallback) {
            return value == null || value.isBlank() ? fallback : value;
        }
    }

    /** @param demoUsers create the local demo accounts (dev only; real users arrive via Okta) */
    public record Seed(boolean demoUsers) {
    }

    public record Workflow(
            String claimProcessKey,
            boolean syncEnabled,
            String gitUri,
            String gitBranch,
            String gitLocalDir,
            String processDirectory,
            long syncIntervalMs) {
    }
}
