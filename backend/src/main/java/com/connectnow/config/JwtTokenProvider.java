package com.connectnow.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${connectnow.jwt.secret:c3VwZXItc2VjdXJlLWtleS1mb3ItY29ubmVjdG5vdy13aGF0c2FwcC1zdHlsZS1hcHAtMjAyNA==}") String secret,
            @Value("${connectnow.jwt.expiration-ms:2592000000}") long expirationMs) {
        // Ensure key is at least 256 bits (32 bytes)
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            this.key = Keys.hmacShaKeyFor(padded);
        } else {
            this.key = Keys.hmacShaKeyFor(keyBytes);
        }
        this.expirationMs = expirationMs;
    }

    public String generateToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    /** Milliseconds of life left in the token (0 if invalid/expired). */
    public long getRemainingMs(String token) {
        try {
            Date exp = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getExpiration();
            return Math.max(0, exp.getTime() - System.currentTimeMillis());
        } catch (JwtException | IllegalArgumentException ex) {
            return 0;
        }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }
}
