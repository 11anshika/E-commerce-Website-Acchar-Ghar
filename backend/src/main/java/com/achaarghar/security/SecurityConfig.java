package com.achaarghar.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import org.springframework.web.servlet.config.annotation.*;
import java.util.List;

@Configuration
public class SecurityConfig implements WebMvcConfigurer {
    @Value("${app.upload-dir}") String uploadDir;
    @Value("${app.static-dir}") String staticDir;

    @Bean
    SecurityFilterChain chain(HttpSecurity http, JwtFilter jwt) throws Exception {
        http.csrf(c -> c.disable()).cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> res.sendError(401, "Please log in")))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/**", "/api/newsletter/**", "/uploads/**", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/reviews/**").permitAll()
                // STAFF can run day-to-day orders; everything else under /api/admin is ADMIN only.
                .requestMatchers(HttpMethod.GET, "/api/admin/stats", "/api/admin/orders", "/api/admin/products").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers(HttpMethod.PATCH, "/api/admin/orders/*/status").hasAnyRole("ADMIN", "STAFF")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    CorsConfigurationSource corsSource(@Value("${app.cors-origin}") String origins) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of(origins.split(",")));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/**", c);
        return s;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry r) {
        r.addResourceHandler("/uploads/**").addResourceLocations("file:" + uploadDir + "/");
        // Lets "mvn spring-boot:run" serve the website itself at http://localhost:8080 (nginx does this in Docker).
        r.addResourceHandler("/**").addResourceLocations("file:" + staticDir + "/");
    }

    /** A plain visit to http://localhost:8080 shows the website. */
    @Override
    public void addViewControllers(ViewControllerRegistry r) {
        r.addViewController("/").setViewName("forward:/index.html");
    }
}
