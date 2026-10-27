-- Sample data for Achaar Ghar (optional). The backend adds the same data by itself on first start when the tables are empty.
-- Run schema.sql first. Safe to run once on an empty database.
USE achaarghar;

-- Admin account: admin@achaar.com / admin123  (CHANGE THIS PASSWORD before going online; the value below is a BCrypt hash).
INSERT INTO users (name, email, password_hash, role, created_at) VALUES ('Admin', 'admin@achaar.com', '$2b$10$HCS3jln0rhE2V0kFdRvdkeCIlS5XcV1gyWaoG.cbEb0QnhNvdoll.', 'ADMIN', NOW(6));

INSERT INTO coupon (code, percent, min_order, active) VALUES ('WELCOME10', 10, 300, 1);

-- Pickles (one 400g size each, stock 50). Every third product starts with one 5-star review.
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (1, 'Aam Ka Achaar', 'Mango', '🥭', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 249, 5.0, 1, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 249, 50, 1);
INSERT INTO review (product_id, user_id, user_name, rating, comment, created_at) VALUES (1, 0, 'Priya', 5, 'Tastes just like home!', NOW(6));
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (2, 'Raw Mango Spicy', 'Mango', '🥭', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 229, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 229, 50, 2);
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (3, 'Sweet Mango Chunda', 'Mango', '🥭', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 269, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 269, 50, 3);
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (4, 'Nimbu Achaar', 'Lemon', '🍋', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 199, 5.0, 1, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 199, 50, 4);
INSERT INTO review (product_id, user_id, user_name, rating, comment, created_at) VALUES (4, 0, 'Priya', 5, 'Tastes just like home!', NOW(6));
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (5, 'Sweet Lemon Pickle', 'Lemon', '🍋', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 209, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 209, 50, 5);
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (6, 'Instant Lemon Ginger', 'Lemon', '🍋', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 189, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 189, 50, 6);
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (7, 'Hari Mirch Achaar', 'Chilli', '🌶️', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 179, 5.0, 1, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 179, 50, 7);
INSERT INTO review (product_id, user_id, user_name, rating, comment, created_at) VALUES (7, 0, 'Priya', 5, 'Tastes just like home!', NOW(6));
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (8, 'Stuffed Red Chilli', 'Chilli', '🌶️', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 219, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 219, 50, 8);
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (9, 'Bharwa Mirch', 'Chilli', '🌶️', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 199, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 199, 50, 9);
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (10, 'Lahsun Achaar', 'Garlic', '🧄', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 239, 5.0, 1, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 239, 50, 10);
INSERT INTO review (product_id, user_id, user_name, rating, comment, created_at) VALUES (10, 0, 'Priya', 5, 'Tastes just like home!', NOW(6));
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (11, 'Garlic Chilli Pickle', 'Garlic', '🧄', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 249, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 249, 50, 11);
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (12, 'Mixed Veg Pickle', 'Mixed', '🥕', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 199, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 199, 50, 12);
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (13, 'Punjabi Gobhi Gajar', 'Mixed', '🥕', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 189, 5.0, 1, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 189, 50, 13);
INSERT INTO review (product_id, user_id, user_name, rating, comment, created_at) VALUES (13, 0, 'Priya', 5, 'Tastes just like home!', NOW(6));
INSERT INTO product (id, name, category, emoji, description, ingredients, shelf_life, active, min_price, avg_rating, rating_count, created_at) VALUES (14, 'Amla Achaar', 'Mixed', '🫒', 'Small-batch, sun-cured with cold-pressed mustard oil and hand-ground spices.', 'Main ingredient, cold-pressed mustard oil, salt, turmeric, chilli powder, fenugreek, mustard seeds, fennel.', '12 months unopened', 1, 169, 0, 0, NOW(6));
INSERT INTO variant (label, price, stock, product_id) VALUES ('400g', 169, 50, 14);
