package com.connectnow.service;

import com.connectnow.config.JwtTokenProvider;
import com.connectnow.dto.AuthResponse;
import com.connectnow.dto.UserDto;
import com.connectnow.model.User;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * "Link a device" (QR login for PC / web).
 *
 * 1. PC calls create()  -> gets a short-lived one-time code, shows it as a QR.
 * 2. Phone (already signed in) scans it and calls approve(code) -> server mints a fresh token for the phone's user.
 * 3. PC polls status(code) -> once approved it receives the token exactly once.
 *
 * Sessions live in memory with a short TTL, which is fine for a single Render instance.
 */
@Service
public class DeviceLinkService {

    public static final long TTL_SECONDS = 120;
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    private static final SecureRandom RNG = new SecureRandom();

    public enum Status { PENDING, APPROVED, EXPIRED }

    public static class Session {
        final String code;
        final String deviceName;
        final Instant expiresAt;
        volatile AuthResponse result;
        volatile String approvedBy;
        Session(String code, String deviceName) {
            this.code = code;
            this.deviceName = deviceName;
            this.expiresAt = Instant.now().plusSeconds(TTL_SECONDS);
        }
        public String code() { return code; }
        boolean expired() { return Instant.now().isAfter(expiresAt); }
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final JwtTokenProvider tokenProvider;

    public DeviceLinkService(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    public Session create(String deviceName) {
        if (sessions.size() > 5000) purge(); // basic abuse guard
        String code;
        do {
            StringBuilder sb = new StringBuilder("CN-");
            for (int i = 0; i < 8; i++) {
                if (i == 4) sb.append('-');
                sb.append(ALPHABET.charAt(RNG.nextInt(ALPHABET.length())));
            }
            code = sb.toString();
        } while (sessions.containsKey(code));
        String safeName = deviceName == null || deviceName.isBlank() ? "Web browser" : deviceName.trim();
        if (safeName.length() > 60) safeName = safeName.substring(0, 60);
        Session s = new Session(code, safeName);
        sessions.put(code, s);
        return s;
    }

    /** Called by the signed-in phone. Returns the device name that was linked. */
    public String approve(String rawCode, User user) {
        Session s = sessions.get(normalize(rawCode));
        if (s == null || s.expired()) {
            throw new IllegalArgumentException("This code has expired. Refresh the QR on your computer and try again.");
        }
        if (s.result != null) {
            throw new IllegalArgumentException("This code was already used.");
        }
        String token = tokenProvider.generateToken(user.getUsername());
        s.result = new AuthResponse(token, UserDto.fromEntity(user));
        s.approvedBy = user.getUsername();
        return s.deviceName;
    }

    /** Polled by the PC. The token is handed out once, then the session is removed. */
    public Map<String, Object> status(String rawCode) {
        String code = normalize(rawCode);
        Session s = sessions.get(code);
        if (s == null) return Map.of("status", Status.EXPIRED);
        if (s.result != null) {
            sessions.remove(code);
            return Map.of("status", Status.APPROVED, "token", s.result.getToken(), "user", s.result.getUser());
        }
        if (s.expired()) {
            sessions.remove(code);
            return Map.of("status", Status.EXPIRED);
        }
        return Map.of("status", Status.PENDING);
    }

    private String normalize(String code) {
        return code == null ? "" : code.trim().toUpperCase();
    }

    @Scheduled(fixedDelay = 60_000)
    public void purge() {
        sessions.values().removeIf(Session::expired);
    }
}
