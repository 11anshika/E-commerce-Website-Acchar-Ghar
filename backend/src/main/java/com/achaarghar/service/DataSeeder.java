package com.achaarghar.service;

import com.achaarghar.model.*;
import com.achaarghar.repo.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** First-run data: an admin account, the sample pickles and a welcome coupon. */
@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepo users; private final ProductRepo products; private final CouponRepo coupons;
    private final ReviewRepo reviews; private final PasswordEncoder enc;
    @Value("${app.admin-email}") String adminEmail;
    @Value("${app.admin-password}") String adminPassword;

    public DataSeeder(UserRepo users, ProductRepo products, CouponRepo coupons, ReviewRepo reviews, PasswordEncoder enc) {
        this.users = users; this.products = products; this.coupons = coupons; this.reviews = reviews; this.enc = enc;
    }

    @Override
    public void run(String... args) {
        if (users.findByEmail(adminEmail).isEmpty()) {
            User a = new User();
            a.name = "Admin"; a.email = adminEmail; a.passwordHash = enc.encode(adminPassword); a.role = User.Role.ADMIN;
            users.save(a);
        }
        if (products.count() == 0) {
            Object[][] seed = {
                {"Aam Ka Achaar", "Mango", 249, "🥭"}, {"Raw Mango Spicy", "Mango", 229, "🥭"}, {"Sweet Mango Chunda", "Mango", 269, "🥭"},
                {"Nimbu Achaar", "Lemon", 199, "🍋"}, {"Sweet Lemon Pickle", "Lemon", 209, "🍋"}, {"Instant Lemon Ginger", "Lemon", 189, "🍋"},
                {"Hari Mirch Achaar", "Chilli", 179, "🌶️"}, {"Stuffed Red Chilli", "Chilli", 219, "🌶️"}, {"Bharwa Mirch", "Chilli", 199, "🌶️"},
                {"Lahsun Achaar", "Garlic", 239, "🧄"}, {"Garlic Chilli Pickle", "Garlic", 249, "🧄"},
                {"Mixed Veg Pickle", "Mixed", 199, "🥕"}, {"Punjabi Gobhi Gajar", "Mixed", 189, "🥕"}, {"Amla Achaar", "Mixed", 169, "🫒"}};
            for (int i = 0; i < seed.length; i++) {
                Product p = new Product();
                p.name = (String) seed[i][0]; p.category = (String) seed[i][1]; p.emoji = (String) seed[i][3];
                p.description = "Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.";
                p.shelfLife = "12 months unopened";
                p.ingredients = "Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.";
                Variant v = new Variant();
                v.label = "400g"; v.price = (Integer) seed[i][2]; v.stock = 50;
                p.variants.add(v);
                if (i % 3 == 0) { p.avgRating = 5.0; p.ratingCount = 1; }
                p = products.save(p);
                if (i % 3 == 0) {
                    Review r = new Review();
                    r.productId = p.id; r.userId = 0L; r.userName = "Priya"; r.rating = 5; r.comment = "Tastes just like home!";
                    reviews.save(r);
                }
            }
        }
        if (coupons.count() == 0) {
            Coupon c = new Coupon();
            c.code = "WELCOME10"; c.percent = 10; c.minOrder = 300;
            coupons.save(c);
        }
    }
}
