package com.achaarghar.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Sends email when SMTP is configured; otherwise prints it to the log so you can still test locally. */
@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private final ObjectProvider<JavaMailSender> sender;

    public MailService(ObjectProvider<JavaMailSender> sender) { this.sender = sender; }

    public void send(String to, String subject, String text) {
        JavaMailSender s = sender.getIfAvailable();
        if (s != null) {
            try {
                SimpleMailMessage m = new SimpleMailMessage();
                m.setTo(to); m.setSubject(subject); m.setText(text);
                s.send(m);
                return;
            } catch (Exception e) { log.warn("Could not send email to {}: {}", to, e.getMessage()); }
        }
        log.info("EMAIL (not sent, no working SMTP) to {} | {}\n{}", to, subject, text);
    }
}
