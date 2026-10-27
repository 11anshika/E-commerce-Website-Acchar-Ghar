package com.achaarghar.model;

import jakarta.persistence.*;

@Entity
public class Coupon {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(unique = true) public String code;
    public int percent;
    public int minOrder;
    public boolean active = true;
}
