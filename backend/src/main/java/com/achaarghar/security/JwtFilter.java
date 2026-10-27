package com.achaarghar.security;

import com.achaarghar.repo.UserRepo;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

/**
 * Checks the token is genuine, then loads the user's CURRENT role from the database.
 * The role inside the token is ignored, so changing someone's role (or deleting them) takes effect on their next request.
 * Scaling note: this is one small lookup per request; add a short-lived cache if traffic grows a lot.
 */
@Component
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepo users;

    public JwtFilter(JwtService jwt, UserRepo users) { this.jwt = jwt; this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String h = req.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer ")) {
            try {
                String email = jwt.parse(h.substring(7)).getSubject();
                users.findByEmail(email).ifPresent(u -> SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(u.email, null, List.of(new SimpleGrantedAuthority("ROLE_" + u.role.name())))));
            } catch (Exception ignored) { /* invalid or expired token: request stays anonymous */ }
        }
        chain.doFilter(req, res);
    }
}
