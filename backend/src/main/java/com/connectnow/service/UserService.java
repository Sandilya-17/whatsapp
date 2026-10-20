package com.connectnow.service;

import com.connectnow.config.JwtTokenProvider;
import com.connectnow.dto.*;
import com.connectnow.model.PrivacySettings;
import com.connectnow.model.User;
import com.connectnow.repository.BlockedUserRepository;
import com.connectnow.repository.ContactRequestRepository;
import com.connectnow.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ContactRequestRepository contactRequestRepository;
    private final BlockedUserRepository blockedUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public UserService(
            UserRepository userRepository,
            ContactRequestRepository contactRequestRepository,
            BlockedUserRepository blockedUserRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.contactRequestRepository = contactRequestRepository;
        this.blockedUserRepository = blockedUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.getUsername().trim().toLowerCase();
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Username '" + username + "' is already taken");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email '" + email + "' is already registered");
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());
        User user = new User(username, email, encodedPassword, request.getDisplayName().trim());
        
        // Generate default modern avatar using UI-Avatars or SVG avatar
        user.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=" + username);
        user = userRepository.save(user);

        String token = tokenProvider.generateToken(user.getUsername());
        return new AuthResponse(token, UserDto.fromEntity(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getUsernameOrEmail().trim().toLowerCase();
        
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(identifier);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmailIgnoreCase(identifier);
        }

        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username/email or password");
        }

        User user = userOpt.get();
        user.setOnline(true);
        user.setLastSeenAt(Instant.now());
        userRepository.save(user);

        String token = tokenProvider.generateToken(user.getUsername());
        return new AuthResponse(token, UserDto.fromEntity(user));
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUserProfile(User user) {
        User freshUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return UserDto.fromEntity(freshUser);
    }

    @Transactional
    public UserDto updateProfile(User user, UpdateProfileRequest request) {
        User freshUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getDisplayName() != null && !request.getDisplayName().trim().isEmpty()) {
            freshUser.setDisplayName(request.getDisplayName().trim());
        }
        if (request.getStatusMessage() != null) {
            freshUser.setStatusMessage(request.getStatusMessage().trim());
        }
        if (request.getAvatarUrl() != null) {
            String trimmedAvatar = request.getAvatarUrl().trim();
            if (trimmedAvatar.isEmpty() || "null".equalsIgnoreCase(trimmedAvatar) || "REMOVE".equalsIgnoreCase(trimmedAvatar)) {
                freshUser.setAvatarUrl(null);
            } else {
                freshUser.setAvatarUrl(trimmedAvatar);
            }
        }

        freshUser = userRepository.save(freshUser);
        return UserDto.fromEntity(freshUser);
    }

    @Transactional
    public UserDto updatePrivacySettings(User user, UpdatePrivacyRequest request) {
        User freshUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        PrivacySettings settings = freshUser.getPrivacySettings();
        if (settings == null) {
            settings = new PrivacySettings();
        }

        if (request.getProfilePhotoVisibility() != null) {
            settings.setProfilePhotoVisibility(request.getProfilePhotoVisibility());
        }
        if (request.getLastSeenVisibility() != null) {
            settings.setLastSeenVisibility(request.getLastSeenVisibility());
        }
        if (request.getReadReceiptsEnabled() != null) {
            settings.setReadReceiptsEnabled(request.getReadReceiptsEnabled());
        }
        if (request.getAllowGroupInvitesFromEveryone() != null) {
            settings.setAllowGroupInvitesFromEveryone(request.getAllowGroupInvitesFromEveryone());
        }

        freshUser.setPrivacySettings(settings);
        freshUser = userRepository.save(freshUser);
        return UserDto.fromEntity(freshUser);
    }

    @Transactional(readOnly = true)
    public UserDto getUserProfile(User currentUser, String targetUsername) {
        User target = userRepository.findByUsernameIgnoreCase(targetUsername)
                .orElseThrow(() -> new IllegalArgumentException("User '" + targetUsername + "' not found"));

        boolean isBlocked = blockedUserRepository.isBlockedBetween(currentUser, target);
        if (isBlocked) {
            return UserDto.fromEntitySanitized(target, false, false);
        }

        boolean areContacts = contactRequestRepository.findBetweenUsers(currentUser, target)
                .map(r -> r.getStatus() == com.connectnow.model.ContactRequestStatus.ACCEPTED)
                .orElse(false);

        PrivacySettings ps = target.getPrivacySettings();
        boolean canSeePhoto = "EVERYONE".equalsIgnoreCase(ps.getProfilePhotoVisibility()) ||
                ("CONTACTS".equalsIgnoreCase(ps.getProfilePhotoVisibility()) && areContacts);

        boolean canSeeLastSeen = "EVERYONE".equalsIgnoreCase(ps.getLastSeenVisibility()) ||
                ("CONTACTS".equalsIgnoreCase(ps.getLastSeenVisibility()) && areContacts);

        return UserDto.fromEntitySanitized(target, canSeePhoto, canSeeLastSeen);
    }

    @Transactional
    public void setPresence(Long userId, boolean isOnline) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setOnline(isOnline);
            user.setLastSeenAt(Instant.now());
            userRepository.save(user);
        });
    }
}
