package com.connectnow.controller;

import com.connectnow.dto.UpdatePrivacyRequest;
import com.connectnow.dto.UpdateProfileRequest;
import com.connectnow.dto.UserDto;
import com.connectnow.model.User;
import com.connectnow.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal User currentUser) {
        UserDto profile = userService.getCurrentUserProfile(currentUser);
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserDto updated = userService.updateProfile(currentUser, request);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/me/privacy")
    public ResponseEntity<UserDto> updatePrivacy(
            @AuthenticationPrincipal User currentUser,
            @RequestBody UpdatePrivacyRequest request) {
        UserDto updated = userService.updatePrivacySettings(currentUser, request);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserDto> getUserProfile(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String username) {
        UserDto profile = userService.getUserProfile(currentUser, username);
        return ResponseEntity.ok(profile);
    }
}
