package com.achaarghar.service;

import com.achaarghar.model.*;
import com.achaarghar.model.ShopOrder.Status;
import com.achaarghar.repo.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class OrderService {
    public record CartLine(Long variantId, int qty) {}
    public record Checkout(List<CartLine> items, String name, String phone, String address, String pincode,
                           String paymentMethod, String couponCode) {}

    private final OrderRepo orders;
    private final ProductRepo products;
    private final CouponRepo coupons;
    private final int freeOver, fee;

    public OrderService(OrderRepo orders, ProductRepo products, CouponRepo coupons,
                        @Value("${app.free-shipping-over}") int freeOver, @Value("${app.shipping-fee}") int fee) {
        this.orders = orders; this.products = products; this.coupons = coupons;
        this.freeOver = freeOver; this.fee = fee;
    }

    public static ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }

    /** Validates a coupon against the cart value and returns it. */
    public Coupon coupon(String code, int subtotal) {
        Coupon c = coupons.findByCodeIgnoreCase(code == null ? "" : code.trim()).filter(x -> x.active)
                .orElseThrow(() -> bad("That coupon code is not valid"));
        if (subtotal < c.minOrder) throw bad("Add items worth Rs. " + c.minOrder + " or more to use " + c.code);
        return c;
    }

    public int couponDiscount(String code, int subtotal) {
        if (code == null || code.isBlank()) return 0;
        return (int) Math.round(subtotal * coupon(code, subtotal).percent / 100.0);
    }

    /** Festive offer applied to every order: 5% off Rs. 400 to 700, 10% off above Rs. 700. */
    public static int festive(int subtotal) {
        return (int) Math.round(subtotal * (subtotal > 700 ? 0.10 : subtotal >= 400 ? 0.05 : 0));
    }

    public static boolean deliverable(String pincode) { return pincode != null && pincode.matches("^[1-8]\\d{5}$"); }

    @Transactional
    public ShopOrder create(User u, Checkout r) {
        if (r.items() == null || r.items().isEmpty()) throw bad("Your cart is empty");
        if (isBlank(r.name()) || isBlank(r.address()) || r.phone() == null || !r.phone().matches("\\d{10}"))
            throw bad("Enter your name, a 10-digit phone number and a delivery address");
        if (!deliverable(r.pincode())) throw bad("Enter a valid 6-digit pincode that we deliver to");
        ShopOrder o = new ShopOrder();
        o.userId = u.id; o.email = u.email; o.pincode = r.pincode(); o.customerName = r.name().trim(); o.phone = r.phone(); o.address = r.address().trim();
        int sub = 0;
        for (CartLine line : r.items()) {
            Product p = products.findByVariantsId(line.variantId()).orElseThrow(() -> bad("An item in your cart no longer exists"));
            Variant v = p.variants.stream().filter(x -> x.id.equals(line.variantId())).findFirst().orElseThrow();
            if (!p.active) throw bad(p.name + " is no longer available");
            if (line.qty() < 1 || line.qty() > v.stock) throw bad(p.name + " (" + v.label + ") has only " + v.stock + " left");
            v.stock -= line.qty();
            products.save(p);
            OrderItem it = new OrderItem();
            it.productId = p.id; it.variantId = v.id; it.name = p.name; it.label = v.label; it.price = v.price; it.qty = line.qty();
            o.items.add(it);
            sub += v.price * line.qty();
        }
        o.subtotal = sub;
        int couponOff = couponDiscount(r.couponCode(), sub);
        o.couponCode = couponOff > 0 ? r.couponCode().trim().toUpperCase() : null;
        o.discount = festive(sub) + couponOff;
        o.shipping = (sub - o.discount) >= freeOver ? 0 : fee;
        o.total = sub - o.discount + o.shipping;
        boolean cod = "COD".equalsIgnoreCase(r.paymentMethod());
        o.paymentMethod = cod ? "COD" : "ONLINE";
        o.status = cod ? Status.PLACED : Status.PENDING_PAYMENT;
        o.orderNo = "AG" + ThreadLocalRandom.current().nextInt(100000, 999999);
        return orders.save(o);
    }

    @Transactional
    public ShopOrder cancel(Long id, User u) {
        ShopOrder o = orders.findById(id).filter(x -> x.userId.equals(u.id) || u.role != User.Role.CUSTOMER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (o.status.ordinal() >= Status.OUT_FOR_DELIVERY.ordinal())
            throw bad("This order can no longer be cancelled");
        restock(o);
        o.status = Status.CANCELLED;
        // TODO (real money): call the Razorpay refund API here for PAID online orders.
        if ("PAID".equals(o.paymentStatus)) o.paymentStatus = "REFUND_INITIATED";
        return orders.save(o);
    }

    @Transactional
    public ShopOrder setStatus(Long id, Status s, User admin) {
        ShopOrder o = orders.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (o.status == Status.CANCELLED) throw bad("Cancelled orders cannot be changed");
        if (o.status == Status.PENDING_PAYMENT) throw bad("This order is still waiting for payment");
        if (s == Status.CANCELLED) return cancel(id, admin);
        o.status = s;
        if (s == Status.DELIVERED && "COD".equals(o.paymentMethod)) o.paymentStatus = "PAID";
        return orders.save(o);
    }

    private void restock(ShopOrder o) {
        for (OrderItem it : o.items) {
            products.findByVariantsId(it.variantId).ifPresent(p -> {
                p.variants.stream().filter(v -> v.id.equals(it.variantId)).findFirst().ifPresent(v -> v.stock += it.qty);
                products.save(p);
            });
        }
    }

    /** Release stock held by online orders that were never paid. */
    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void expireUnpaid() {
        for (ShopOrder o : orders.findByStatusAndCreatedAtBefore(Status.PENDING_PAYMENT, Instant.now().minus(30, ChronoUnit.MINUTES))) {
            restock(o);
            o.status = Status.CANCELLED;
            orders.save(o);
        }
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }
}
