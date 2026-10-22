package com.connectnow.push;

import com.connectnow.model.AppSetting;
import com.connectnow.model.PushSubscriptionEntity;
import com.connectnow.model.User;
import com.connectnow.repository.AppSettingRepository;
import com.connectnow.repository.PushSubscriptionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.interfaces.ECPrivateKey;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Security;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Sends Web Push notifications so users are alerted for messages and calls even when the
 * app / browser tab is closed. VAPID keys come from env vars, or are generated once and stored in the DB.
 */
@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AppSettingRepository settings;
    private final PushSubscriptionRepository subscriptions;
    private final String configuredPublic;
    private final String configuredPrivate;
    private final String subject;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    private volatile nl.martijndwars.webpush.PushService client;
    private volatile String publicKey = "";

    public PushService(
            AppSettingRepository settings,
            PushSubscriptionRepository subscriptions,
            @Value("${connectnow.push.public-key:}") String configuredPublic,
            @Value("${connectnow.push.private-key:}") String configuredPrivate,
            @Value("${connectnow.push.subject:mailto:admin@connectnow.app}") String subject) {
        this.settings = settings;
        this.subscriptions = subscriptions;
        this.configuredPublic = configuredPublic == null ? "" : configuredPublic.trim();
        this.configuredPrivate = configuredPrivate == null ? "" : configuredPrivate.trim();
        this.subject = subject;
    }

    @PostConstruct
    void init() {
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            String pub = configuredPublic;
            String priv = configuredPrivate;
            if (pub.isEmpty() || priv.isEmpty()) {
                pub = settings.findById("vapid.public").map(AppSetting::getValue).orElse("");
                priv = settings.findById("vapid.private").map(AppSetting::getValue).orElse("");
            }
            if (pub.isEmpty() || priv.isEmpty()) {
                String[] pair = generateKeys();
                pub = pair[0];
                priv = pair[1];
                settings.save(new AppSetting("vapid.public", pub));
                settings.save(new AppSetting("vapid.private", priv));
                log.info("Generated new VAPID keys for Web Push");
            }
            this.publicKey = pub;
            this.client = new nl.martijndwars.webpush.PushService(pub, priv, subject);
        } catch (Exception e) {
            log.error("Web Push disabled: could not initialise VAPID keys", e);
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }

    public String getPublicKey() {
        return publicKey;
    }

    private static String[] generateKeys() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME);
        gen.initialize(ECNamedCurveTable.getParameterSpec("prime256v1"));
        KeyPair kp = gen.generateKeyPair();
        byte[] pub = ((ECPublicKey) kp.getPublic()).getQ().getEncoded(false);
        BigInteger d = ((ECPrivateKey) kp.getPrivate()).getD();
        byte[] raw = d.toByteArray();
        byte[] priv = new byte[32];
        if (raw.length >= 32) {
            System.arraycopy(raw, raw.length - 32, priv, 0, 32);
        } else {
            System.arraycopy(raw, 0, priv, 32 - raw.length, raw.length);
        }
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        return new String[]{enc.encodeToString(pub), enc.encodeToString(priv)};
    }

    /** Fire-and-forget push to every device of the user. {@code ttlSeconds} stops stale alerts (e.g. old call rings). */
    public void sendToUser(User user, Map<String, Object> payload, int ttlSeconds) {
        if (client == null || user == null) return;
        final byte[] body;
        try {
            body = MAPPER.writeValueAsBytes(payload);
        } catch (Exception e) {
            return;
        }
        final Long userId = user.getId();
        executor.submit(() -> {
            List<PushSubscriptionEntity> subs;
            try {
                subs = subscriptions.findByUserId(userId);
            } catch (Exception e) {
                return;
            }
            for (PushSubscriptionEntity s : subs) {
                try {
                    nl.martijndwars.webpush.Notification n = new nl.martijndwars.webpush.Notification(
                            s.getEndpoint(), s.getP256dh(), s.getAuth(), body, ttlSeconds);
                    org.apache.http.HttpResponse res = client.send(n);
                    int code = res.getStatusLine().getStatusCode();
                    if (code == 404 || code == 410 || code == 401 || code == 403) {
                        // Subscription expired/revoked (or created with an older VAPID key): forget it
                        subscriptions.deleteByEndpoint(s.getEndpoint());
                    }
                } catch (Exception e) {
                    log.debug("Push send failed: {}", e.toString());
                }
            }
        });
    }

    public Map<String, Object> messagePayload(String title, String body, Long conversationId, long unread, String senderAvatar) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("type", "message");
        m.put("title", title);
        m.put("body", body);
        m.put("conversationId", conversationId);
        m.put("tag", "conv-" + conversationId);
        m.put("unread", unread);
        m.put("ts", System.currentTimeMillis());
        if (senderAvatar != null) m.put("icon", senderAvatar);
        return m;
    }

    public Map<String, Object> callPayload(String title, String body, Long callerId, boolean missed, String callType) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("type", missed ? "missed_call" : "call");
        m.put("title", title);
        m.put("body", body);
        m.put("callerId", callerId);
        m.put("callType", callType);
        m.put("tag", "call-" + callerId);
        m.put("ts", System.currentTimeMillis());
        return m;
    }

    public static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
