package com.connectnow.service;

import com.connectnow.dto.StatusStoryDto;
import com.connectnow.model.ContactRequest;
import com.connectnow.model.StatusStory;
import com.connectnow.model.User;
import com.connectnow.repository.BlockedUserRepository;
import com.connectnow.repository.ContactRequestRepository;
import com.connectnow.repository.StatusStoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StatusService {

    private static final Duration STORY_LIFETIME = Duration.ofHours(24);

    private final StatusStoryRepository statusStoryRepository;
    private final ContactRequestRepository contactRequestRepository;
    private final BlockedUserRepository blockedUserRepository;

    public StatusService(
            StatusStoryRepository statusStoryRepository,
            ContactRequestRepository contactRequestRepository,
            BlockedUserRepository blockedUserRepository) {
        this.statusStoryRepository = statusStoryRepository;
        this.contactRequestRepository = contactRequestRepository;
        this.blockedUserRepository = blockedUserRepository;
    }

    /** Stories from the last 24 hours posted by me and by my accepted contacts. */
    @Transactional(readOnly = true)
    public List<StatusStoryDto> getFeed(User currentUser) {
        Set<Long> userIds = new HashSet<>();
        userIds.add(currentUser.getId());
        for (ContactRequest cr : contactRequestRepository.findAllAcceptedContactsForUser(currentUser)) {
            Long senderId = cr.getSender().getId();
            Long recipientId = cr.getRecipient().getId();
            userIds.add(senderId.equals(currentUser.getId()) ? recipientId : senderId);
        }

        Instant since = Instant.now().minus(STORY_LIFETIME);
        return statusStoryRepository.findActiveByUserIds(since, userIds).stream()
                .filter(s -> s.getUser().getId().equals(currentUser.getId())
                        || !blockedUserRepository.isBlockedBetween(currentUser, s.getUser()))
                .map(StatusStoryDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public StatusStoryDto create(User currentUser, String content, String mediaUrl, String gradient) {
        String cleanContent = content == null ? "" : content.trim();
        String cleanMedia = mediaUrl == null ? "" : mediaUrl.trim();
        if (!cleanMedia.startsWith("http") && !cleanMedia.startsWith("/")) {
            cleanMedia = ""; // ignore local-only (blob:) or invalid URLs
        }
        if (cleanContent.isEmpty() && cleanMedia.isEmpty()) {
            throw new IllegalArgumentException("Status needs text or a photo");
        }
        if (cleanContent.length() > 1000) {
            cleanContent = cleanContent.substring(0, 1000);
        }
        if (cleanMedia.length() > 1000) {
            throw new IllegalArgumentException("Media URL is too long");
        }

        StatusStory story = new StatusStory();
        story.setUser(currentUser);
        story.setContent(cleanContent);
        story.setMediaUrl(cleanMedia.isEmpty() ? null : cleanMedia);
        String cleanGradient = gradient == null ? "" : gradient.trim();
        story.setBackgroundGradient(cleanGradient.length() > 200 ? null : cleanGradient);
        StatusStory saved = statusStoryRepository.save(story);
        return StatusStoryDto.fromEntity(saved);
    }

    @Transactional
    public void delete(User currentUser, Long storyId) {
        StatusStory story = statusStoryRepository.findById(storyId)
                .orElseThrow(() -> new IllegalArgumentException("Status not found"));
        if (!story.getUser().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("You can only delete your own status");
        }
        statusStoryRepository.delete(story);
    }
}
