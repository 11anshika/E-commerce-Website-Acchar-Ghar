package com.achaarghar.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "users")
public class User {
    /** CUSTOMER shops. STAFF handles orders. ADMIN manages everything. */
    public enum Role { CUSTOMER, STAFF, ADMIN }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String name;
    @Column(unique = true, nullable = false) public String email;
    @JsonIgnore public String passwordHash;
    @JsonIgnore public String resetCodeHash;
    @JsonIgnore public Instant resetExpiry;
    @JsonIgnore public int resetAttempts;
    @Enumerated(EnumType.STRING) public Role role = Role.CUSTOMER;
    public Instant createdAt = Instant.now();
}
