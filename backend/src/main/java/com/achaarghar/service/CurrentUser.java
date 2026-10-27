package com.achaarghar.service;

import com.achaarghar.model.User;
import com.achaarghar.repo.UserRepo;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentUser {
    private final UserRepo users;
    public CurrentUser(UserRepo users) { this.users = users; }

    public User of(Authentication a) {
        return users.findByEmail(a.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in again"));
    }
}
