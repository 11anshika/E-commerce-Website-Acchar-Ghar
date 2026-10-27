-- Handy queries for running the shop. Open them in MySQL Workbench, DBeaver, or the mysql command line.
USE achaarghar;

-- New orders waiting to be packed
SELECT order_no, customer_name, phone, total, payment_method, created_at FROM orders WHERE status = 'PLACED' ORDER BY created_at;

-- Online orders that were started but never paid
SELECT order_no, customer_name, total, created_at FROM orders WHERE status = 'PENDING_PAYMENT';

-- Sales per day (cancelled and unpaid orders left out)
SELECT DATE(created_at) AS day, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders WHERE status NOT IN ('CANCELLED','PENDING_PAYMENT') GROUP BY DATE(created_at) ORDER BY day DESC;

-- Best sellers
SELECT oi.name, SUM(oi.qty) AS jars_sold, SUM(oi.qty * oi.price) AS revenue
FROM order_item oi JOIN orders o ON o.id = oi.order_id
WHERE o.status NOT IN ('CANCELLED','PENDING_PAYMENT') GROUP BY oi.name ORDER BY jars_sold DESC;

-- Low stock (under 10 jars)
SELECT p.name, v.label, v.stock FROM variant v JOIN product p ON p.id = v.product_id WHERE p.active = 1 AND v.stock < 10 ORDER BY v.stock;

-- Customers and what they have spent
SELECT u.name, u.email, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS spent
FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status <> 'CANCELLED'
WHERE u.role = 'CUSTOMER' GROUP BY u.id ORDER BY spent DESC;

-- Make someone an admin or staff (they must sign up first)
-- UPDATE users SET role = 'STAFF' WHERE email = 'someone@example.com';

-- Newsletter subscribers
SELECT email, active, created_at FROM subscriber ORDER BY created_at DESC;
