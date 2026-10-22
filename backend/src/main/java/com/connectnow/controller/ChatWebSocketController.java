package com.connectnow.controller;

import com.connectnow.dto.CallSignalDto;
import com.connectnow.dto.ForegroundDto;
import com.connectnow.push.CallStore;
import com.connectnow.push.PushService;
import com.connectnow.push.SessionTracker;
import com.connectnow.dto.MessageDto;
import com.connectnow.dto.SendMessageRequest;
import com.connectnow.dto.TypingNotificationDto;
import com.connectnow.model.User;
import com.connectnow.repository.UserRepository;
import com.connectnow.service.MessageService;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Optional;

@Controller
public class ChatWebSocketController {

    private final MessageService messageService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final SessionTracker sessionTracker;
    private final CallStore callStore;
    private final PushService pushService;
    private final java.util.concurrent.ScheduledExecutorService scheduler =
            java.util.concurrent.Executors.newSingleThreadScheduledExecutor();

    public ChatWebSocketController(
            MessageService messageService,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate,
            SessionTracker sessionTracker,
            CallStore callStore,
            PushService pushService) {
        this.messageService = messageService;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.sessionTracker = sessionTracker;
        this.callStore = callStore;
        this.pushService = pushService;
    }

    /** The app reports whether it is visible + focused, so we only push when the user is NOT looking at it. */
    @MessageMapping("/presence.foreground")
    public void handleForeground(@Payload ForegroundDto dto, @Header("simpSessionId") String sessionId) {
        if (dto == null) return;
        sessionTracker.setForeground(sessionId, Boolean.TRUE.equals(dto.getForeground()));
    }

    @MessageMapping("/chat.sendMessage")
    public void handleWebSocketMessage(@Payload SendMessageRequest request, Principal principal) {
        if (principal == null) {
            return;
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(principal.getName());
        if (userOpt.isPresent()) {
            messageService.sendMessage(userOpt.get(), request);
        }
    }

    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload TypingNotificationDto typingDto, Principal principal) {
        if (principal == null || typingDto.getConversationId() == null) {
            return;
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(principal.getName());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            typingDto.setUserId(user.getId());
            typingDto.setUsername(user.getUsername());
            messagingTemplate.convertAndSend(
                    "/topic/conversations/" + typingDto.getConversationId() + "/typing",
                    typingDto
            );
        }
    }

    @MessageMapping("/call.signal")
    public void handleCallSignal(@Payload CallSignalDto signal, Principal principal) {
        if (principal == null || signal == null) {
            return;
        }

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(principal.getName());
        if (userOpt.isEmpty()) {
            return;
        }
        User user = userOpt.get();
        signal.setCallerId(user.getId());
        signal.setCallerUsername(user.getUsername());
        if (signal.getCallerName() == null || signal.getCallerName().trim().isEmpty()) {
            signal.setCallerName(user.getDisplayName());
        }

        Long targetId = signal.getTargetUserId();
        boolean realTarget = targetId != null && targetId > 0;
        String type = signal.getType() == null ? "" : signal.getType();

        if (realTarget) {
            trackCall(user, targetId, signal, type);
        }

        // Deliver once: personal topic when we know the id, otherwise the user queue
        if (realTarget) {
            messagingTemplate.convertAndSend("/topic/calls/" + targetId, signal);
        } else if (signal.getTargetUsername() != null && !signal.getTargetUsername().trim().isEmpty()) {
            try {
                messagingTemplate.convertAndSendToUser(signal.getTargetUsername(), "/queue/call", signal);
            } catch (Exception ignored) {
            }
        }
    }

    /** Keeps ringing calls available to a callee who is offline and sends call / missed-call pushes. */
    private void trackCall(User sender, Long targetId, CallSignalDto signal, String type) {
        switch (type) {
            case "CALL_OFFER": {
                CallStore.Pending pending = callStore.put(targetId, signal, sender.getId());
                userRepository.findById(targetId).ifPresent(target -> {
                    if (!sessionTracker.isForeground(target.getUsername())) {
                        String kind = "video".equalsIgnoreCase(signal.getCallType()) ? "video" : "voice";
                        pushService.sendToUser(target, pushService.callPayload(
                                signal.getCallerName(), "Incoming " + kind + " call", sender.getId(), false, signal.getCallType()), 40);
                    }
                });
                // Nobody picked up in time: leave a missed-call notification
                scheduler.schedule(() -> {
                    try {
                        if (callStore.removeIfSame(targetId, pending)) {
                            sendMissedCall(targetId, sender, signal.getCallType(), signal.getCallerName());
                        }
                    } catch (Exception ignored) {
                    }
                }, CallStore.RING_MS, java.util.concurrent.TimeUnit.MILLISECONDS);
                break;
            }
            case "ICE_CANDIDATE":
                callStore.addCandidate(targetId, sender.getId(), signal.getCandidate());
                break;
            case "CALL_END": {
                CallStore.Pending p = callStore.get(targetId);
                if (p != null && p.callerId == sender.getId()) {
                    // Caller hung up before the callee answered
                    callStore.remove(targetId);
                    sendMissedCall(targetId, sender, p.offer.getCallType(), p.offer.getCallerName());
                } else {
                    callStore.remove(sender.getId());
                }
                break;
            }
            case "CALL_ANSWER":
            case "CALL_REJECT":
            case "CALL_BUSY":
                callStore.remove(sender.getId());
                break;
            default:
                break;
        }
    }

    private void sendMissedCall(Long calleeId, User caller, String callType, String callerName) {
        userRepository.findById(calleeId).ifPresent(target -> {
            String kind = "video".equalsIgnoreCase(callType) ? "video" : "voice";
            String name = callerName != null ? callerName : caller.getDisplayName();
            pushService.sendToUser(target, pushService.callPayload(name, "Missed " + kind + " call", caller.getId(), true, callType), 3600);
        });
    }
}
