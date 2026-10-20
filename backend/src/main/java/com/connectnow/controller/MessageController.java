package com.connectnow.controller;

import com.connectnow.dto.MessageDto;
import com.connectnow.dto.SendMessageRequest;
import com.connectnow.model.User;
import com.connectnow.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping
    public ResponseEntity<MessageDto> sendMessage(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SendMessageRequest request) {
        MessageDto sent = messageService.sendMessage(currentUser, request);
        return ResponseEntity.ok(sent);
    }

    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<Page<MessageDto>> getMessages(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<MessageDto> messages = messageService.getConversationMessages(currentUser, conversationId, page, size);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/conversations/{conversationId}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long conversationId) {
        messageService.markConversationAsRead(currentUser, conversationId);
        return ResponseEntity.ok(Map.of("message", "Conversation marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMessage(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean forEveryone) {
        messageService.deleteMessage(currentUser, id, forEveryone);
        return ResponseEntity.ok(Map.of("message", "Message deleted successfully"));
    }

    @DeleteMapping("/conversations/{conversationId}/clear")
    public ResponseEntity<Map<String, String>> clearConversation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long conversationId) {
        messageService.clearConversationMessages(currentUser, conversationId);
        return ResponseEntity.ok(Map.of("message", "Conversation cleared successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MessageDto> editMessage(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        String content = payload.get("content");
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }
        MessageDto edited = messageService.editMessage(currentUser, id, content.trim());
        return ResponseEntity.ok(edited);
    }
}
