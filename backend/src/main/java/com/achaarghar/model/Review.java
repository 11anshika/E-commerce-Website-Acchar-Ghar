package com.achaarghar.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public Long productId;
    public Long userId;
    public String userName;
    public int rating;
    @Column(length = 1000) public String comment;
    public Instant createdAt = Instant.now();
}
