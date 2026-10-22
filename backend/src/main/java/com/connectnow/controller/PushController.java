package com.connectnow.controller;

import com.connectnow.dto.CallSignalDto;
import com.connectnow.model.Conversation;
import com.connectnow.model.ConversationMember;
import com.connectnow.model.PushSubscriptionEntity;
import com.connectnow.model.User;
import com.connectnow.push.CallStore;
import com.connectnow.push.PushService;
import com.connectnow.repository.ConversationMemberRepository;
import com.connectnow.repository.ConversationRepository;
import com.connectnow.repository.PushSubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PushController {

    private final PushService pushService;
    private final PushSubscriptionRepository subscriptions;
    private final CallStore callStore;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;

    public PushController(PushService pushService,
                          PushSubscriptionRepository subscriptions,
                          CallStore callStore,
                          ConversationRepository conversationRepository,
                          ConversationMemberRepository memberRepository) {
        this.pushService = pushService;
        this.subscriptions = subscriptions;
        this.callStore = callStore;
        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
    }

    @GetMapping("/push/public-key")
    public ResponseEntity<Map<String, String>> publicKey() {
        return ResponseEntity.ok(Map.of("publicKey", pushService.getPublicKey()));
    }

    @PostMapping("/push/subscribe")
    @Transactional
    public ResponseEntity<Map<String, String>> subscribe(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> body) {
        String endpoint = body.get("endpoint");
        String p256dh = body.get("p256dh");
        String auth = body.get("auth");
        if (PushService.isBlank(endpoint) || PushService.isBlank(p256dh) || PushService.isBlank(auth)) {
            throw new IllegalArgumentException("Invalid push subscription");
        }
        List<PushSubscriptionEntity> existing = subscriptions.findByEndpoint(endpoint);
        if (existing.isEmpty()) {
            subscriptions.save(new PushSubscriptionEntity(currentUser, endpoint, p256dh, auth));
        } else {
            // Same device, possibly a different account now: re-assign it
            PushSubscriptionEntity s = existing.get(0);
            s.setUser(currentUser);
            s.setP256dh(p256dh);
            s.setAuth(auth);
            subscriptions.save(s);
            for (int i = 1; i < existing.size(); i++) {
                subscriptions.delete(existing.get(i));
            }
        }
        return ResponseEntity.ok(Map.of("message", "subscribed"));
    }

    @PostMapping("/push/unsubscribe")
    @Transactional
    public ResponseEntity<Map<String, String>> unsubscribe(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> body) {
        String endpoint = body.get("endpoint");
        if (!PushService.isBlank(endpoint)) {
            subscriptions.deleteByEndpoint(endpoint);
        }
        return ResponseEntity.ok(Map.of("message", "unsubscribed"));
    }

    /** Keeps the server-side mute state in sync with the chat-list "Mute notifications" toggle. */
    @PostMapping("/push/mute")
    @Transactional
    public ResponseEntity<Map<String, String>> mute(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, Object> body) {
        Object convId = body.get("conversationId");
        boolean muted = Boolean.TRUE.equals(body.get("muted"));
        if (convId instanceof Number) {
            Conversation conv = conversationRepository.findById(((Number) convId).longValue()).orElse(null);
            if (conv != null) {
                memberRepository.findByConversationAndUser(conv, currentUser).ifPresent((ConversationMember m) -> {
                    m.setMutedUntil(muted ? Instant.parse("2999-01-01T00:00:00Z") : null);
                    memberRepository.save(m);
                });
            }
        }
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    /** A call that is ringing for me right now (used when the app is opened from a call notification). */
    @GetMapping("/calls/pending")
    public ResponseEntity<?> pendingCall(@AuthenticationPrincipal User currentUser) {
        CallSignalDto offer = callStore.snapshotFor(currentUser.getId());
        if (offer == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(offer);
    }
}
