package com.achaarghar.web;

import com.achaarghar.model.Subscriber;
import com.achaarghar.repo.SubscriberRepo;
import com.achaarghar.service.MailService;
import com.achaarghar.service.OrderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class NewsletterController {
    public record SubscribeReq(String email) {}
    public record SendReq(String subject, String message) {}

    private final SubscriberRepo subscribers;
    private final MailService mail;
    private final String publicUrl;

    public NewsletterController(SubscriberRepo subscribers, MailService mail, @Value("${app.public-url}") String publicUrl) {
        this.subscribers = subscribers; this.mail = mail; this.publicUrl = publicUrl;
    }

    /** Public: the sign-up box on the website. */
    @PostMapping("/newsletter/subscribe")
    public Map<String, String> subscribe(@RequestBody SubscribeReq r) {
        String email = r.email() == null ? "" : r.email().trim().toLowerCase();
        if (!email.matches("^\\S+@\\S+\\.\\S+$")) throw OrderService.bad("Enter a valid email");
        Subscriber s = subscribers.findByEmail(email).orElse(null);
        if (s != null && s.active) return Map.of("message", "You are already subscribed. Thank you!");
        if (s == null) {
            s = new Subscriber();
            s.email = email;
            byte[] b = new byte[16];
            new SecureRandom().nextBytes(b);
            s.token = HexFormat.of().formatHex(b);
        }
        s.active = true;
        subscribers.save(s);
        return Map.of("message", "Thanks for subscribing!");
    }

    /** Public: the link at the bottom of every update email. */
    @GetMapping(value = "/newsletter/unsubscribe", produces = "text/html;charset=UTF-8")
    public String unsubscribe(@RequestParam String token) {
        return subscribers.findByToken(token).map(s -> {
            s.active = false;
            subscribers.save(s);
            return "<h2 style='font-family:Georgia,serif'>You have been unsubscribed.</h2><p style='font-family:Georgia,serif'>You will not get any more updates from Achaar Ghar.</p>";
        }).orElse("<h2 style='font-family:Georgia,serif'>This unsubscribe link is not valid.</h2>");
    }

    /** Admin only (see SecurityConfig): everyone who signed up. */
    @GetMapping("/admin/subscribers")
    public List<Subscriber> list() { return subscribers.findAllByOrderByCreatedAtDesc(); }

    /** Admin only: email an update to every active subscriber. */
    @PostMapping("/admin/newsletter")
    public Map<String, Object> send(@RequestBody SendReq r) {
        if (r.subject() == null || r.subject().isBlank() || r.message() == null || r.message().isBlank())
            throw OrderService.bad("Add a subject and a message");
        int sent = 0;
        for (Subscriber s : subscribers.findByActiveTrue()) {
            mail.send(s.email, r.subject().trim(),
                    r.message().trim() + "\n\n--\nAchaar Ghar\nTo stop getting these emails, open: " + publicUrl + "/api/newsletter/unsubscribe?token=" + s.token);
            sent++;
        }
        return Map.of("sent", sent);
    }
}
