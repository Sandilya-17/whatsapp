package com.connectnow.config;

import com.connectnow.dto.PresenceDto;
import com.connectnow.model.User;
import com.connectnow.repository.UserRepository;
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

    public WebSocketEventListener(UserRepository userRepository, SimpMessagingTemplate messagingTemplate) {
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
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
        }
    }
}
