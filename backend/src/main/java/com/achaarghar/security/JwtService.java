package com.achaarghar.security;

import com.achaarghar.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long hours;

    public JwtService(@Value("${app.jwt-secret}") String secret, @Value("${app.jwt-hours}") long hours) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.hours = hours;
    }

    public String generate(User u) {
        return Jwts.builder().subject(u.email).claim("role", u.role.name())
                .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + hours * 3600_000))
                .signWith(key).compact();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
