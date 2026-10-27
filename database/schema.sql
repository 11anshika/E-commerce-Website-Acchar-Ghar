-- Achaar Ghar database schema (MySQL 8).
-- The backend creates these tables by itself on first start (spring.jpa.hibernate.ddl-auto=update),
-- so you do NOT have to run this file. It is here as a reference and for setting up the database by hand.
-- To use it by hand: run this file, then set  spring.jpa.hibernate.ddl-auto=validate  in application.properties.

CREATE DATABASE IF NOT EXISTS achaarghar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE achaarghar;

CREATE TABLE users (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  name            VARCHAR(255),
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255),
  role            ENUM('CUSTOMER','STAFF','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  created_at      DATETIME(6),
  reset_code_hash VARCHAR(255),            -- hashed 6-digit forgot-password code
  reset_expiry    DATETIME(6),
  reset_attempts  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE product (
  id           BIGINT        NOT NULL AUTO_INCREMENT,
  name         VARCHAR(255),
  category     VARCHAR(255),
  image_url    VARCHAR(255),
  shelf_life   VARCHAR(255),
  emoji        VARCHAR(255),
  description  VARCHAR(2000),
  ingredients  VARCHAR(2000),
  active       BIT           NOT NULL DEFAULT 1,   -- 0 = hidden from the shop (soft delete)
  min_price    INT           NOT NULL DEFAULT 0,   -- lowest size price, kept for fast sorting
  avg_rating   DOUBLE        NOT NULL DEFAULT 0,
  rating_count INT           NOT NULL DEFAULT 0,
  created_at   DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_product_category (category)
) ENGINE=InnoDB;

-- A buyable size of a product (price and stock live here).
CREATE TABLE variant (
  id         BIGINT NOT NULL AUTO_INCREMENT,
  label      VARCHAR(255),
  price      INT    NOT NULL,                      -- rupees
  stock      INT    NOT NULL,
  product_id BIGINT,
  PRIMARY KEY (id),
  KEY idx_variant_product (product_id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES product (id)
) ENGINE=InnoDB;

CREATE TABLE review (
  id         BIGINT NOT NULL AUTO_INCREMENT,
  product_id BIGINT,
  user_id    BIGINT,
  user_name  VARCHAR(255),
  rating     INT    NOT NULL,
  comment    VARCHAR(1000),
  created_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_review_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE coupon (
  id        BIGINT NOT NULL AUTO_INCREMENT,
  code      VARCHAR(255),
  percent   INT    NOT NULL,
  min_order INT    NOT NULL,
  active    BIT    NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_coupon_code (code)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id                  BIGINT       NOT NULL AUTO_INCREMENT,
  order_no            VARCHAR(255),              -- the ID customers see, e.g. AG123456
  user_id             BIGINT,
  customer_name       VARCHAR(255),
  phone               VARCHAR(255),
  email               VARCHAR(255),
  pincode             VARCHAR(255),
  address             VARCHAR(500),
  status              ENUM('PENDING_PAYMENT','PLACED','PACKED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  payment_method      VARCHAR(255),              -- ONLINE or COD
  payment_status      VARCHAR(255) DEFAULT 'PENDING',   -- PENDING, PAID, REFUND_INITIATED
  razorpay_order_id   VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  coupon_code         VARCHAR(255),
  subtotal            INT          NOT NULL DEFAULT 0,
  discount            INT          NOT NULL DEFAULT 0,
  shipping            INT          NOT NULL DEFAULT 0,
  total               INT          NOT NULL DEFAULT 0,
  created_at          DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status, created_at)
) ENGINE=InnoDB;

-- Prices are copied here at purchase time, so later price changes never alter old orders.
CREATE TABLE order_item (
  id         BIGINT NOT NULL AUTO_INCREMENT,
  product_id BIGINT,
  variant_id BIGINT,
  name       VARCHAR(255),
  label      VARCHAR(255),
  price      INT    NOT NULL,
  qty        INT    NOT NULL,
  order_id   BIGINT,
  PRIMARY KEY (id),
  KEY idx_order_item_order (order_id),
  CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE=InnoDB;

-- People who signed up for shop updates (website footer box). token is used in the unsubscribe link.
CREATE TABLE subscriber (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL,
  token      VARCHAR(255) NOT NULL,
  active     BIT          NOT NULL DEFAULT 1,
  created_at DATETIME(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_subscriber_email (email)
) ENGINE=InnoDB;
