package com.connectnow.push;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks live WebSocket sessions per user (a user can have several tabs/devices) and which of
 * them currently have the app in the foreground. Used for online presence and to decide when a
 * push notification is needed.
 */
@Component
public class SessionTracker {

    private final Map<String, Set<String>> sessionsByUser = new ConcurrentHashMap<>();
    private final Map<String, String> userBySession = new ConcurrentHashMap<>();
    private final Set<String> foregroundSessions = ConcurrentHashMap.newKeySet();

    private static String key(String username) {
        return username == null ? "" : username.toLowerCase(Locale.ROOT);
    }

    public void connected(String username, String sessionId) {
        if (username == null || sessionId == null) return;
        sessionsByUser.computeIfAbsent(key(username), k -> ConcurrentHashMap.newKeySet()).add(sessionId);
        userBySession.put(sessionId, key(username));
    }

    /** @return true when that was the user's last open session (they are now fully offline). */
    public boolean disconnected(String sessionId) {
        if (sessionId == null) return false;
        foregroundSessions.remove(sessionId);
        String user = userBySession.remove(sessionId);
        if (user == null) return false;
        Set<String> set = sessionsByUser.get(user);
        if (set == null) return true;
        set.remove(sessionId);
        if (set.isEmpty()) {
            sessionsByUser.remove(user);
            return true;
        }
        return false;
    }

    public boolean isOnline(String username) {
        Set<String> set = sessionsByUser.get(key(username));
        return set != null && !set.isEmpty();
    }

    public void setForeground(String sessionId, boolean foreground) {
        if (sessionId == null || !userBySession.containsKey(sessionId)) return;
        if (foreground) {
            foregroundSessions.add(sessionId);
        } else {
            foregroundSessions.remove(sessionId);
        }
    }

    /** True when at least one of the user's sessions is visible and focused right now. */
    public boolean isForeground(String username) {
        Set<String> set = sessionsByUser.get(key(username));
        if (set == null) return false;
        for (String sid : set) {
            if (foregroundSessions.contains(sid)) return true;
        }
        return false;
    }
}
