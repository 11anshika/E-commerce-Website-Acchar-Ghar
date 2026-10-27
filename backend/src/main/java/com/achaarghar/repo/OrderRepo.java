package com.achaarghar.repo;

import com.achaarghar.model.ShopOrder;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface OrderRepo extends JpaRepository<ShopOrder, Long> {
    List<ShopOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ShopOrder> findAllByOrderByCreatedAtDesc();
    List<ShopOrder> findByStatusAndCreatedAtBefore(ShopOrder.Status status, Instant before);

    @Query("select count(o) > 0 from ShopOrder o join o.items i where o.userId = :uid and i.productId = :pid and o.status = :st")
    boolean hasOrdered(@Param("uid") Long uid, @Param("pid") Long pid, @Param("st") ShopOrder.Status st);
}
