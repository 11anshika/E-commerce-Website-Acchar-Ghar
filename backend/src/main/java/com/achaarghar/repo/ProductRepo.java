package com.achaarghar.repo;

import com.achaarghar.model.Product;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ProductRepo extends JpaRepository<Product, Long> {
    @Query("select p from Product p where p.active = true " +
           "and (:q = '' or lower(p.name) like lower(concat('%', :q, '%'))) " +
           "and (:cat = '' or p.category = :cat) and p.minPrice <= :maxPrice")
    Page<Product> search(@Param("q") String q, @Param("cat") String cat, @Param("maxPrice") int maxPrice, Pageable pageable);

    @Query("select distinct p.category from Product p where p.active = true order by p.category")
    List<String> categories();

    Optional<Product> findByVariantsId(Long variantId);
}
