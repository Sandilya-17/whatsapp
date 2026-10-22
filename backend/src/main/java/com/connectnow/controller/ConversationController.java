package com.connectnow.controller;

import com.connectnow.dto.ConversationDto;
import com.connectnow.model.User;
import com.connectnow.service.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping
    public ResponseEntity<List<ConversationDto>> getUserConversations(
            @AuthenticationPrincipal User currentUser) {
        List<ConversationDto> conversations = conversationService.getUserConversations(currentUser);
        return ResponseEntity.ok(conversations);
    }

    @PostMapping("/direct/{targetUserId}")
    public ResponseEntity<ConversationDto> getOrCreateDirectConversation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long targetUserId) {
        ConversationDto conv = conversationService.getOrCreateDirectConversation(currentUser, targetUserId);
        return ResponseEntity.ok(conv);
    }

    @PostMapping("/group")
    public ResponseEntity<ConversationDto> createGroupConversation(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, Object> payload) {
        String title = (String) payload.get("title");
        String description = (String) payload.get("description");
        @SuppressWarnings("unchecked")
        List<Number> memberIdNumbers = (List<Number>) payload.get("memberIds");
        List<Long> memberIds = memberIdNumbers != null ? memberIdNumbers.stream().map(Number::longValue).toList() : List.of();

        ConversationDto group = conversationService.createGroupConversation(currentUser, title, description, memberIds);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteConversation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        conversationService.deleteConversationForUser(currentUser, id);
        return ResponseEntity.ok(Map.of("message", "Conversation deleted"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationDto> getConversation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        ConversationDto conv = conversationService.getConversation(currentUser, id);
        return ResponseEntity.ok(conv);
    }
}
