package com.achaarghar.repo;

import com.achaarghar.model.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CouponRepo extends JpaRepository<Coupon, Long> {
    Optional<Coupon> findByCodeIgnoreCase(String code);
}
