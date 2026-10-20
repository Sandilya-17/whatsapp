package com.connectnow.controller;

import com.connectnow.dto.ContactRequestDto;
import com.connectnow.dto.UserDto;
import com.connectnow.dto.UserSearchResultDto;
import com.connectnow.model.User;
import com.connectnow.service.ContactService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResultDto>> searchUsers(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("query") String query) {
        List<UserSearchResultDto> results = contactService.searchUsers(currentUser, query);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/requests")
    public ResponseEntity<ContactRequestDto> sendContactRequest(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, Long> payload) {
        Long recipientId = payload.get("recipientId");
        if (recipientId == null) {
            throw new IllegalArgumentException("recipientId is required");
        }
        ContactRequestDto dto = contactService.sendContactRequest(currentUser, recipientId);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<ContactRequestDto> acceptContactRequest(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        ContactRequestDto dto = contactService.acceptContactRequest(currentUser, id);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/requests/{id}/reject")
    public ResponseEntity<Map<String, String>> rejectContactRequest(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        contactService.rejectContactRequest(currentUser, id);
        return ResponseEntity.ok(Map.of("message", "Request rejected successfully"));
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<List<ContactRequestDto>> getPendingReceived(
            @AuthenticationPrincipal User currentUser) {
        List<ContactRequestDto> list = contactService.getPendingReceivedRequests(currentUser);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/requests/sent")
    public ResponseEntity<List<ContactRequestDto>> getPendingSent(
            @AuthenticationPrincipal User currentUser) {
        List<ContactRequestDto> list = contactService.getPendingSentRequests(currentUser);
        return ResponseEntity.ok(list);
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getContacts(
            @AuthenticationPrincipal User currentUser) {
        List<UserDto> contacts = contactService.getContacts(currentUser);
        return ResponseEntity.ok(contacts);
    }

    @PostMapping("/block/{userId}")
    public ResponseEntity<Map<String, String>> blockUser(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long userId) {
        contactService.blockUser(currentUser, userId);
        return ResponseEntity.ok(Map.of("message", "User blocked successfully"));
    }

    @PostMapping("/unblock/{userId}")
    public ResponseEntity<Map<String, String>> unblockUser(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long userId) {
        contactService.unblockUser(currentUser, userId);
        return ResponseEntity.ok(Map.of("message", "User unblocked successfully"));
    }

    @GetMapping("/blocked")
    public ResponseEntity<List<UserDto>> getBlockedUsers(
            @AuthenticationPrincipal User currentUser) {
        List<UserDto> blocked = contactService.getBlockedUsers(currentUser);
        return ResponseEntity.ok(blocked);
    }
}
