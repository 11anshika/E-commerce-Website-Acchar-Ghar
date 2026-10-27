package com.achaarghar.web;

import com.achaarghar.model.*;
import com.achaarghar.repo.*;
import com.achaarghar.service.CurrentUser;
import com.achaarghar.service.OrderService;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api")
public class CatalogController {
    public record ReviewReq(Long productId, int rating, String comment) {}

    private final ProductRepo products;
    private final ReviewRepo reviews;
    private final OrderRepo orders;
    private final CurrentUser current;

    public CatalogController(ProductRepo products, ReviewRepo reviews, OrderRepo orders, CurrentUser current) {
        this.products = products; this.reviews = reviews; this.orders = orders; this.current = current;
    }

    @GetMapping("/products")
    public Map<String, Object> list(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "") String category,
                                    @RequestParam(defaultValue = "100000") int maxPrice, @RequestParam(defaultValue = "newest") String sort,
                                    @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "8") int size) {
        Sort s = switch (sort) {
            case "price_asc" -> Sort.by("minPrice").ascending();
            case "price_desc" -> Sort.by("minPrice").descending();
            case "rating" -> Sort.by("avgRating").descending().and(Sort.by("ratingCount").descending());
            case "name" -> Sort.by("name").ascending();
            default -> Sort.by("createdAt").descending();
        };
        Page<Product> p = products.search(q.trim(), category, maxPrice, PageRequest.of(Math.max(0, page), Math.min(size, 48), s));
        return Map.of("content", p.getContent(), "page", p.getNumber(), "totalPages", p.getTotalPages(), "totalElements", p.getTotalElements());
    }

    /** The whole active catalogue in one call (the storefront filters, sorts and pages it in the browser). */
    @GetMapping("/products/all")
    public List<Product> all() { return products.findAll().stream().filter(p -> p.active).toList(); }

    @GetMapping("/products/categories")
    public List<String> categories() { return products.categories(); }

    @GetMapping("/products/{id}")
    public Product one(@PathVariable Long id) {
        return products.findById(id).filter(p -> p.active)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    @GetMapping("/reviews/{productId}")
    public List<Review> reviews(@PathVariable Long productId) { return reviews.findByProductIdOrderByCreatedAtDesc(productId); }

    @PostMapping("/reviews")
    public Review addReview(@RequestBody ReviewReq r, Authentication auth) {
        User u = current.of(auth);
        if (r.rating() < 1 || r.rating() > 5) throw OrderService.bad("Choose a rating from 1 to 5 stars");
        if (!orders.hasOrdered(u.id, r.productId(), ShopOrder.Status.DELIVERED))
            throw OrderService.bad("You can review a product after your order has been delivered");
        if (reviews.existsByProductIdAndUserId(r.productId(), u.id)) throw OrderService.bad("You have already reviewed this product");
        Review rv = new Review();
        rv.productId = r.productId(); rv.userId = u.id; rv.userName = u.name; rv.rating = r.rating();
        rv.comment = r.comment() == null ? "" : r.comment().trim();
        reviews.save(rv);
        Product p = products.findById(r.productId()).orElseThrow();
        Double avg = reviews.avg(p.id);
        p.avgRating = avg == null ? 0 : Math.round(avg * 10) / 10.0;
        p.ratingCount = (int) reviews.countByProductId(p.id);
        products.save(p);
        return rv;
    }
}
