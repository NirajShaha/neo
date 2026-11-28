package com.neo.backend.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "neo.okta")
public record OktaProperties(
        @NotBlank String issuerUri,
        @NotBlank String audience,
        String groupsClaim) {

    public OktaProperties {
        issuerUri = issuerUri == null ? null : issuerUri.replaceAll("/+$", "");
        groupsClaim = groupsClaim == null || groupsClaim.isBlank() ? "groups" : groupsClaim;
    }

    public String jwkSetUri() {
        return issuerUri + "/v1/keys";
    }
}
