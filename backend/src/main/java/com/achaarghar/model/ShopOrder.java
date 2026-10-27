package com.achaarghar.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "orders")
public class ShopOrder {
    /** Order matters: anything at OUT_FOR_DELIVERY or later can no longer be cancelled. */
    public enum Status { PENDING_PAYMENT, PLACED, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String orderNo;
    public Long userId;
    public String customerName;
    public String phone;
    public String email;
    public String pincode;
    @Column(length = 500) public String address;
    @Enumerated(EnumType.STRING) public Status status = Status.PENDING_PAYMENT;
    public String paymentMethod;      // ONLINE | COD
    public String paymentStatus = "PENDING"; // PENDING | PAID | REFUND_INITIATED
    public String razorpayOrderId;
    public String razorpayPaymentId;
    public String couponCode;
    public int subtotal, discount, shipping, total;
    public Instant createdAt = Instant.now();

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "order_id")
    public List<OrderItem> items = new ArrayList<>();
}
