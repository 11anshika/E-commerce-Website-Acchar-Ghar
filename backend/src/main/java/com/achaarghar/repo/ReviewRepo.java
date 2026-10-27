package com.achaarghar.repo;

import com.achaarghar.model.Review;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ReviewRepo extends JpaRepository<Review, Long> {
    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);
    boolean existsByProductIdAndUserId(Long productId, Long userId);
    @Query("select avg(r.rating) from Review r where r.productId = :id") Double avg(@Param("id") Long id);
    long countByProductId(Long productId);
}
