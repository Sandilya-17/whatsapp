package com.connectnow.controller;

import com.connectnow.model.User;
import com.connectnow.service.DeviceLinkService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class DeviceLinkController {

    private final DeviceLinkService service;

    public DeviceLinkController(DeviceLinkService service) {
        this.service = service;
    }

    /** PC / web: ask for a new pairing code (public). */
    @PostMapping("/api/auth/qr/create")
    public ResponseEntity<Map<String, Object>> create(@RequestBody(required = false) Map<String, String> body) {
        DeviceLinkService.Session s = service.create(body == null ? null : body.get("deviceName"));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("code", s.code());
        out.put("expiresInSeconds", DeviceLinkService.TTL_SECONDS);
        return ResponseEntity.ok(out);
    }

    /** PC / web: poll until the phone approves (public). */
    @GetMapping("/api/auth/qr/status/{code}")
    public ResponseEntity<Map<String, Object>> status(@PathVariable String code) {
        return ResponseEntity.ok(service.status(code));
    }

    /** Phone (signed in): approve the code shown on the PC. */
    @PostMapping("/api/devices/link")
    public ResponseEntity<Map<String, Object>> approve(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> body) {
        String deviceName = service.approve(body.get("code"), currentUser);
        return ResponseEntity.ok(Map.of("linked", true, "deviceName", deviceName));
    }
}
