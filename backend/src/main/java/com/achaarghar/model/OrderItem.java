package com.achaarghar.model;

import jakarta.persistence.*;

@Entity
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public Long productId;
    public Long variantId;
    public String name;
    public String label;
    public int price;
    public int qty;
}
