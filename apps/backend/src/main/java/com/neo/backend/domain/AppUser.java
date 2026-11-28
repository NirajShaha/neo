package com.neo.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "neo_users",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_neo_users_external_identity",
                columnNames = {"identity_issuer", "identity_subject"}))
public class AppUser extends BaseEntity {

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "identity_issuer", length = 255)
    private String identityIssuer;

    @Column(name = "identity_subject", length = 255)
    private String identitySubject;

    @Column(name = "buyer_code")
    private String buyerCode;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getIdentityIssuer() {
        return identityIssuer;
    }

    public void setIdentityIssuer(String identityIssuer) {
        this.identityIssuer = identityIssuer;
    }

    public String getIdentitySubject() {
        return identitySubject;
    }

    public void setIdentitySubject(String identitySubject) {
        this.identitySubject = identitySubject;
    }

    public String getBuyerCode() {
        return buyerCode;
    }

    public void setBuyerCode(String buyerCode) {
        this.buyerCode = buyerCode;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
