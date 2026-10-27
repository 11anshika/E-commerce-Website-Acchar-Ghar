package com.achaarghar.model;

import jakarta.persistence.*;

/** A purchasable size of a product, e.g. 250g / 500g / 1kg. */
@Entity
public class Variant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String label;
    public int price;   // rupees
    public int stock;
}
