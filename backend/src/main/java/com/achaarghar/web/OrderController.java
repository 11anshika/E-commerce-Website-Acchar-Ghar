package com.achaarghar.web;

import com.achaarghar.model.*;
import com.achaarghar.repo.OrderRepo;
import com.achaarghar.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api")
public class OrderController {
    public record VerifyReq(String razorpayPaymentId, String razorpaySignature) {}

    private final OrderService service;
    private final PaymentService payments;
    private final OrderRepo orders;
    private final CurrentUser current;

    public OrderController(OrderService service, PaymentService payments, OrderRepo orders, CurrentUser current) {
        this.service = service; this.payments = payments; this.orders = orders; this.current = current;
    }

    @GetMapping("/coupons/validate")
    public Map<String, Object> validate(@RequestParam String code, @RequestParam int subtotal) {
        Coupon c = service.coupon(code, subtotal);
        return Map.of("code", c.code, "percent", c.percent, "minOrder", c.minOrder, "discount", service.couponDiscount(code, subtotal));
    }

    @PostMapping("/orders")
    public ShopOrder create(@RequestBody OrderService.Checkout r, Authentication a) { return service.create(current.of(a), r); }

    @GetMapping("/orders")
    public List<ShopOrder> mine(Authentication a) { return orders.findByUserIdOrderByCreatedAtDesc(current.of(a).id); }

    @PostMapping("/orders/{id}/cancel")
    public ShopOrder cancel(@PathVariable Long id, Authentication a) { return service.cancel(id, current.of(a)); }

    @PostMapping("/payments/create/{orderId}")
    public Map<String, Object> createPayment(@PathVariable Long orderId, Authentication a) { return payments.create(own(orderId, a)); }

    @PostMapping("/payments/verify/{orderId}")
    public ShopOrder verify(@PathVariable Long orderId, @RequestBody VerifyReq r, Authentication a) {
        return payments.verify(own(orderId, a), r.razorpayPaymentId(), r.razorpaySignature());
    }

    private ShopOrder own(Long id, Authentication a) {
        User u = current.of(a);
        return orders.findById(id).filter(o -> o.userId.equals(u.id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }
}
