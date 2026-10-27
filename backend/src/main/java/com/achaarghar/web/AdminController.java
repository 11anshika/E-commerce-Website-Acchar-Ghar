package com.achaarghar.web;

import com.achaarghar.model.*;
import com.achaarghar.model.ShopOrder.Status;
import com.achaarghar.repo.*;
import com.achaarghar.service.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    public record StatusReq(Status status) {}
    public record RoleReq(User.Role role) {}

    private final ProductRepo products;
    private final OrderRepo orders;
    private final CouponRepo coupons;
    private final UserRepo users;
    private final OrderService orderService;
    private final CurrentUser current;
    private final Path uploadDir;

    public AdminController(ProductRepo products, OrderRepo orders, CouponRepo coupons, UserRepo users,
                           OrderService orderService, CurrentUser current, @Value("${app.upload-dir}") String dir) {
        this.products = products; this.orders = orders; this.coupons = coupons; this.users = users;
        this.orderService = orderService; this.current = current; this.uploadDir = Paths.get(dir);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        List<ShopOrder> all = orders.findAll();
        List<ShopOrder> live = all.stream().filter(o -> o.status != Status.CANCELLED && o.status != Status.PENDING_PAYMENT).toList();
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (Status s : Status.values()) byStatus.put(s.name(), all.stream().filter(o -> o.status == s).count());
        List<Map<String, Object>> low = new ArrayList<>();
        for (Product p : products.findAll()) for (Variant v : p.variants)
            if (p.active && v.stock < 10) low.add(Map.of("product", p.name, "label", v.label, "stock", v.stock));
        return Map.of("revenue", live.stream().mapToInt(o -> o.total).sum(), "orders", all.size(), "byStatus", byStatus,
                "customers", users.countByRole(User.Role.CUSTOMER), "lowStock", low);
    }

    @GetMapping("/orders")
    public List<ShopOrder> allOrders() { return orders.findAllByOrderByCreatedAtDesc(); }

    @PatchMapping("/orders/{id}/status")
    public ShopOrder status(@PathVariable Long id, @RequestBody StatusReq r, Authentication a) {
        return orderService.setStatus(id, r.status(), current.of(a));
    }

    @GetMapping("/products")
    public List<Product> allProducts() { return products.findAll(); }

    @PostMapping("/products")
    public Product create(@RequestBody Product b) {
        Product p = new Product();
        copy(p, b);
        for (Variant v : b.variants) { v.id = null; p.variants.add(v); }
        return products.save(p);
    }

    @PutMapping("/products/{id}")
    public Product update(@PathVariable Long id, @RequestBody Product b) {
        Product p = products.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        copy(p, b);
        p.variants.removeIf(v -> b.variants.stream().noneMatch(x -> v.id.equals(x.id)));
        for (Variant x : b.variants) {
            Variant ex = x.id == null ? null : p.variants.stream().filter(v -> v.id.equals(x.id)).findFirst().orElse(null);
            if (ex == null) { x.id = null; p.variants.add(x); }
            else { ex.label = x.label; ex.price = x.price; ex.stock = x.stock; }
        }
        return products.save(p);
    }

    /** Soft delete: past orders keep pointing at the product. */
    @DeleteMapping("/products/{id}")
    public void delete(@PathVariable Long id) {
        products.findById(id).ifPresent(p -> { p.active = false; products.save(p); });
    }

    private void copy(Product p, Product b) {
        if (b.name == null || b.name.isBlank() || b.variants == null || b.variants.isEmpty())
            throw OrderService.bad("A product needs a name and at least one size with a price");
        p.name = b.name.trim(); p.category = b.category; p.description = b.description; p.ingredients = b.ingredients;
        p.shelfLife = b.shelfLife; p.imageUrl = b.imageUrl; p.active = b.active; p.emoji = b.emoji;
    }

    @PostMapping("/upload")
    public Map<String, String> upload(@RequestParam MultipartFile file) throws IOException {
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase();
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.')) : "";
        if (!List.of(".jpg", ".jpeg", ".png", ".webp").contains(ext)) throw OrderService.bad("Upload a JPG, PNG or WebP image");
        Files.createDirectories(uploadDir);
        String saved = UUID.randomUUID() + ext;
        Files.copy(file.getInputStream(), uploadDir.resolve(saved));
        return Map.of("url", "/uploads/" + saved);
    }

    @GetMapping("/coupons")
    public List<Coupon> coupons() { return coupons.findAll(); }

    @PostMapping("/coupons")
    public Coupon addCoupon(@RequestBody Coupon c) {
        if (c.code == null || c.code.isBlank() || c.percent < 1 || c.percent > 90) throw OrderService.bad("Enter a code and a discount between 1 and 90 percent");
        c.id = null; c.code = c.code.trim().toUpperCase();
        if (coupons.findByCodeIgnoreCase(c.code).isPresent()) throw OrderService.bad("That code already exists");
        return coupons.save(c);
    }

    @DeleteMapping("/coupons/{id}")
    public void deleteCoupon(@PathVariable Long id) { coupons.deleteById(id); }

    @GetMapping("/users")
    public List<Map<String, Object>> listUsers() {
        Map<Long, List<ShopOrder>> byUser = orders.findAll().stream().filter(o -> o.status != Status.CANCELLED)
                .collect(Collectors.groupingBy(o -> o.userId));
        return users.findAll().stream().map(u -> {
            List<ShopOrder> os = byUser.getOrDefault(u.id, List.of());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.id); m.put("name", u.name); m.put("email", u.email); m.put("role", u.role); m.put("joined", u.createdAt);
            m.put("orders", os.size()); m.put("spent", os.stream().mapToInt(o -> o.total).sum());
            return m;
        }).toList();
    }

    /** Takes effect on the person's very next request, because roles are read from the database each time. */
    @PatchMapping("/users/{id}/role")
    public Map<String, Object> setRole(@PathVariable Long id, @RequestBody RoleReq r, Authentication a) {
        User me = current.of(a);
        User u = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (r.role() == null) throw OrderService.bad("Choose a role");
        if (u.id.equals(me.id)) throw OrderService.bad("You cannot change your own role");
        u.role = r.role();
        users.save(u);
        return Map.of("id", u.id, "role", u.role);
    }
}
