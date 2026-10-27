package com.achaarghar.web;

import com.achaarghar.model.User;
import com.achaarghar.repo.UserRepo;
import com.achaarghar.security.JwtService;
import com.achaarghar.service.CurrentUser;
import com.achaarghar.service.MailService;
import com.achaarghar.service.OrderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@RestController
@RequestMapping("/api")
public class AuthController {
    public record RegisterReq(String name, String email, String password) {}
    public record LoginReq(String email, String password) {}
    public record ForgotReq(String email) {}
    public record ResetReq(String email, String code, String password) {}
    public record AuthRes(String token, User user) {}

    private final UserRepo users;
    private final PasswordEncoder enc;
    private final JwtService jwt;
    private final CurrentUser current;
    private final MailService mail;
    private final boolean exposeCode;

    public AuthController(UserRepo users, PasswordEncoder enc, JwtService jwt, CurrentUser current, MailService mail,
                          @Value("${app.expose-reset-code:false}") boolean exposeCode) {
        this.users = users; this.enc = enc; this.jwt = jwt; this.current = current; this.mail = mail; this.exposeCode = exposeCode;
    }

    @PostMapping("/auth/register")
    public AuthRes register(@RequestBody RegisterReq r) {
        if (r.name() == null || r.name().isBlank() || r.email() == null || !r.email().matches("^\\S+@\\S+\\.\\S+$")
                || r.password() == null || r.password().length() < 6)
            throw OrderService.bad("Enter your name, a valid email and a password of at least 6 characters");
        String email = r.email().trim().toLowerCase();
        if (users.findByEmail(email).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        User u = new User();
        u.name = r.name().trim(); u.email = email; u.passwordHash = enc.encode(r.password());
        users.save(u);
        return new AuthRes(jwt.generate(u), u);
    }

    @PostMapping("/auth/login")
    public AuthRes login(@RequestBody LoginReq r) {
        User u = users.findByEmail(r.email() == null ? "" : r.email().trim().toLowerCase())
                .filter(x -> enc.matches(r.password() == null ? "" : r.password(), x.passwordHash))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong email or password"));
        return new AuthRes(jwt.generate(u), u);
    }

    private static final String BAD_CODE = "That code is not correct or has expired";

    /** Always answers the same way, so nobody can use this to find out which emails have accounts. */
    @PostMapping("/auth/forgot")
    public Map<String, Object> forgot(@RequestBody ForgotReq r) {
        AtomicReference<String> sent = new AtomicReference<>();
        users.findByEmail(r.email() == null ? "" : r.email().trim().toLowerCase()).ifPresent(u -> {
            String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));
            u.resetCodeHash = sha(code);
            u.resetExpiry = Instant.now().plus(10, ChronoUnit.MINUTES);
            u.resetAttempts = 0;
            users.save(u);
            mail.send(u.email, "Your Achaar Ghar password reset code",
                    "Hi " + u.name + ",\n\nYour password reset code is " + code + ". It works for 10 minutes.\n\nIf you did not ask for this, you can ignore this email.");
            sent.set(code);
        });
        Map<String, Object> res = new HashMap<>();
        res.put("message", "If that email has an account, we have sent a 6-digit code. It works for 10 minutes.");
        if (exposeCode && sent.get() != null) res.put("devCode", sent.get()); // local testing only, off by default
        return res;
    }

    @PostMapping("/auth/reset")
    public Map<String, String> reset(@RequestBody ResetReq r) {
        if (r.password() == null || r.password().length() < 6) throw OrderService.bad("Choose a password of at least 6 characters");
        User u = users.findByEmail(r.email() == null ? "" : r.email().trim().toLowerCase()).orElseThrow(() -> OrderService.bad(BAD_CODE));
        if (u.resetCodeHash == null || u.resetExpiry == null || u.resetExpiry.isBefore(Instant.now()) || u.resetAttempts >= 5)
            throw OrderService.bad(BAD_CODE);
        String given = sha(r.code() == null ? "" : r.code().trim());
        if (!MessageDigest.isEqual(u.resetCodeHash.getBytes(StandardCharsets.UTF_8), given.getBytes(StandardCharsets.UTF_8))) {
            u.resetAttempts++;           // five wrong guesses and the code is dead
            users.save(u);
            throw OrderService.bad(BAD_CODE);
        }
        u.passwordHash = enc.encode(r.password());
        u.resetCodeHash = null; u.resetExpiry = null; u.resetAttempts = 0;
        users.save(u);
        return Map.of("message", "Your password has been changed. You can log in now.");
    }

    private static String sha(String s) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    @GetMapping("/me")
    public User me(Authentication a) { return current.of(a); }
}
