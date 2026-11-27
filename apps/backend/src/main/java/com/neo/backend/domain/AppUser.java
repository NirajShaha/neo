package com.neo.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "neo_users")
public class AppUser extends BaseEntity {

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "name", nullable = false)
    private String name;

    /** Legacy column. Authentication is delegated to Okta; this is never a usable credential. */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash = "OKTA_MANAGED";

    /** Okta {@code sub} the account is bound to after the first login (stable, unlike email). */
    @Column(name = "okta_subject", unique = true)
    private String oktaSubject;

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

    public String getOktaSubject() {
        return oktaSubject;
    }

    public void setOktaSubject(String oktaSubject) {
        this.oktaSubject = oktaSubject;
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
