package com.connectnow.controller;

import com.connectnow.dto.CallSignalDto;
import com.connectnow.dto.MessageDto;
import com.connectnow.dto.SendMessageRequest;
import com.connectnow.dto.TypingNotificationDto;
import com.connectnow.model.User;
import com.connectnow.repository.UserRepository;
import com.connectnow.service.MessageService;
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

    public ChatWebSocketController(
            MessageService messageService,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.messageService = messageService;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
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
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            signal.setCallerId(user.getId());
            signal.setCallerUsername(user.getUsername());
            if (signal.getCallerName() == null || signal.getCallerName().trim().isEmpty()) {
                signal.setCallerName(user.getDisplayName());
            }

            // 1. Send to target user's personal call topic if targetUserId is given
            if (signal.getTargetUserId() != null) {
                messagingTemplate.convertAndSend("/topic/calls/" + signal.getTargetUserId(), signal);
            }

            // 2. Also send to user-queue destination if username provided
            if (signal.getTargetUsername() != null && !signal.getTargetUsername().trim().isEmpty()) {
                try {
                    messagingTemplate.convertAndSendToUser(
                            signal.getTargetUsername(),
                            "/queue/call",
                            signal
                    );
                } catch (Exception ignored) {
                }
            }
        }
    }
}
