package com.connectnow.controller;

import com.connectnow.dto.AuthResponse;
import com.connectnow.dto.LoginRequest;
import com.connectnow.dto.RegisterRequest;
import com.connectnow.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = userService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> status = new java.util.LinkedHashMap<>();
        status.put("status", "UP");
        status.put("application", "ConnectNow");
        status.put("timestamp", java.time.Instant.now().toString());
        return ResponseEntity.ok(status);
    }
}
