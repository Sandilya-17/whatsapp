package com.connectnow.controller;

import com.connectnow.dto.StatusStoryDto;
import com.connectnow.model.User;
import com.connectnow.service.StatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/status")
public class StatusController {

    private final StatusService statusService;

    public StatusController(StatusService statusService) {
        this.statusService = statusService;
    }

    @GetMapping
    public ResponseEntity<List<StatusStoryDto>> getFeed(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(statusService.getFeed(currentUser));
    }

    @PostMapping
    public ResponseEntity<StatusStoryDto> create(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> payload) {
        StatusStoryDto dto = statusService.create(
                currentUser,
                payload.get("content"),
                payload.get("mediaUrl"),
                payload.get("backgroundGradient"));
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        statusService.delete(currentUser, id);
        return ResponseEntity.ok(Map.of("message", "Status deleted"));
    }
}
