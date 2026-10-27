package com.achaarghar.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String name;
    public String category;
    public String imageUrl;          // add photos later: upload in Admin > Products
    public String shelfLife;
    public String emoji;             // shown when there is no photo
    @Column(length = 2000) public String description;
    @Column(length = 2000) public String ingredients;
    public boolean active = true;
    public int minPrice;             // denormalised for fast filter/sort
    public double avgRating;
    public int ratingCount;
    public Instant createdAt = Instant.now();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    public List<Variant> variants = new ArrayList<>();

    @PrePersist @PreUpdate
    void calc() { minPrice = variants.stream().mapToInt(v -> v.price).min().orElse(0); }
}
