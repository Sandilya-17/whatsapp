package com.connectnow.config;

import com.connectnow.dto.PresenceDto;
import com.connectnow.model.User;
import com.connectnow.repository.UserRepository;
import com.connectnow.service.MessageService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.Instant;
import java.util.Optional;

@Component
public class WebSocketEventListener {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;

    public WebSocketEventListener(UserRepository userRepository, SimpMessagingTemplate messagingTemplate, MessageService messageService) {
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
    }

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal != null) {
            updatePresence(principal.getName(), true);
        }
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        Principal principal = event.getUser();
        if (principal != null) {
            updatePresence(principal.getName(), false);
        }
    }

    private void updatePresence(String username, boolean isOnline) {
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setOnline(isOnline);
            user.setLastSeenAt(Instant.now());
            userRepository.save(user);

            PresenceDto dto = new PresenceDto(user.getId(), user.getUsername(), isOnline, user.getLastSeenAt());
            messagingTemplate.convertAndSend("/topic/presence", dto);

            if (isOnline) {
                try {
                    messageService.markDeliveredForUser(user);
                } catch (Exception ignored) {
                    // delivery receipts are best-effort
                }
            }
        }
    }
}
