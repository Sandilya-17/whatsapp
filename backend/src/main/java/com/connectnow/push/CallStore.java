package com.connectnow.push;

import com.connectnow.dto.CallSignalDto;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Remembers a ringing call for a few seconds so a callee who was offline / had the app closed
 * (and opened it by tapping the push notification) can still pick the call up.
 */
@Component
public class CallStore {

    public static final long RING_MS = 45_000;

    public static class Pending {
        public final CallSignalDto offer;
        public final long callerId;
        public final long createdAt = System.currentTimeMillis();
        public final List<Object> candidates = new ArrayList<>();

        Pending(CallSignalDto offer, long callerId) {
            this.offer = offer;
            this.callerId = callerId;
        }

        boolean expired() {
            return System.currentTimeMillis() - createdAt > RING_MS;
        }
    }

    private final Map<Long, Pending> byCallee = new ConcurrentHashMap<>();

    public Pending put(Long calleeId, CallSignalDto offer, long callerId) {
        Pending p = new Pending(offer, callerId);
        byCallee.put(calleeId, p);
        return p;
    }

    public Pending get(Long calleeId) {
        Pending p = byCallee.get(calleeId);
        if (p != null && p.expired()) {
            byCallee.remove(calleeId, p);
            return null;
        }
        return p;
    }

    public void addCandidate(Long calleeId, long callerId, Object candidate) {
        Pending p = get(calleeId);
        if (p != null && p.callerId == callerId && p.candidates.size() < 80 && candidate != null) {
            synchronized (p.candidates) {
                p.candidates.add(candidate);
            }
        }
    }

    public Pending remove(Long calleeId) {
        return byCallee.remove(calleeId);
    }

    public boolean removeIfSame(Long calleeId, Pending p) {
        return byCallee.remove(calleeId, p);
    }

    /** The offer for this user with buffered ICE candidates attached, or null. */
    public CallSignalDto snapshotFor(Long calleeId) {
        Pending p = get(calleeId);
        if (p == null) return null;
        CallSignalDto copy = p.offer;
        synchronized (p.candidates) {
            copy.setCandidates(new ArrayList<>(p.candidates));
        }
        return copy;
    }
}
