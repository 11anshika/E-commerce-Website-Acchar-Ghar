package com.achaarghar.model;

import jakarta.persistence.*;
import java.time.Instant;

/** Someone who signed up for shop updates with the box at the bottom of the website. */
@Entity
public class Subscriber {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(unique = true, nullable = false) public String email;
    @Column(nullable = false) public String token;      // secret used in the unsubscribe link
    public boolean active = true;
    public Instant createdAt = Instant.now();
}
