package com.connectnow;

import com.connectnow.dto.*;
import com.connectnow.model.MessageType;
import com.connectnow.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class MessagingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ContactRequestRepository contactRequestRepository;

    @Autowired
    private BlockedUserRepository blockedUserRepository;

    @Autowired
    private ConversationMemberRepository conversationMemberRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private MessageDeletionRepository messageDeletionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private Long user1Id;

    private String user2Token;
    private Long user2Id;

    @BeforeEach
    void setUp() throws Exception {
        messageDeletionRepository.deleteAll();
        messageRepository.deleteAll();
        conversationMemberRepository.deleteAll();
        conversationRepository.deleteAll();
        contactRequestRepository.deleteAll();
        blockedUserRepository.deleteAll();
        userRepository.deleteAll();

        // User 1: David
        RegisterRequest u1 = new RegisterRequest();
        u1.setUsername("david");
        u1.setEmail("david@example.com");
        u1.setPassword("Password123!");
        u1.setDisplayName("David Miller");

        MvcResult r1 = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u1)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse a1 = objectMapper.readValue(r1.getResponse().getContentAsString(), AuthResponse.class);
        user1Token = a1.getToken();
        user1Id = a1.getUser().getId();

        // User 2: Emma
        RegisterRequest u2 = new RegisterRequest();
        u2.setUsername("emma");
        u2.setEmail("emma@example.com");
        u2.setPassword("Password123!");
        u2.setDisplayName("Emma Watson");

        MvcResult r2 = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u2)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse a2 = objectMapper.readValue(r2.getResponse().getContentAsString(), AuthResponse.class);
        user2Token = a2.getToken();
        user2Id = a2.getUser().getId();
    }

    @Test
    void testDirectMessagingFlowAndIdempotency() throws Exception {
        // 1. Create or open direct conversation
        MvcResult convRes = mockMvc.perform(post("/api/conversations/direct/" + user2Id)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andReturn();

        ConversationDto conv = objectMapper.readValue(convRes.getResponse().getContentAsString(), ConversationDto.class);
        Long convId = conv.getId();

        // 2. David sends message with unique clientMessageId
        String clientMsgId = UUID.randomUUID().toString();
        SendMessageRequest sendReq = new SendMessageRequest();
        sendReq.setConversationId(convId);
        sendReq.setClientMessageId(clientMsgId);
        sendReq.setContent("Hello Emma! Welcome to ConnectNow.");
        sendReq.setMessageType(MessageType.TEXT);

        MvcResult sendRes = mockMvc.perform(post("/api/messages")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sendReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.content").value("Hello Emma! Welcome to ConnectNow."))
                .andReturn();

        MessageDto msg1 = objectMapper.readValue(sendRes.getResponse().getContentAsString(), MessageDto.class);

        // 3. Test retry idempotency: Resending with the EXACT same clientMessageId returns same message and does not duplicate
        MvcResult retryRes = mockMvc.perform(post("/api/messages")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sendReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(msg1.getId()))
                .andReturn();

        MessageDto retryMsg = objectMapper.readValue(retryRes.getResponse().getContentAsString(), MessageDto.class);
        assertThat(retryMsg.getId()).isEqualTo(msg1.getId());
        assertThat(messageRepository.count()).isEqualTo(1); // Only 1 message in database!

        // 4. Emma checks conversations and sees unreadCount = 1
        mockMvc.perform(get("/api/conversations")
                        .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(convId))
                .andExpect(jsonPath("$[0].unreadCount").value(1));

        // 5. Emma fetches conversation messages
        mockMvc.perform(get("/api/messages/conversations/" + convId)
                        .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(msg1.getId()))
                .andExpect(jsonPath("$.content[0].sender.username").value("david"));

        // 6. Emma marks conversation as read
        mockMvc.perform(post("/api/messages/conversations/" + convId + "/read")
                        .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isOk());

        // 7. Emma's unreadCount is now 0
        mockMvc.perform(get("/api/conversations")
                        .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].unreadCount").value(0));

        // 8. David edits his message
        mockMvc.perform(put("/api/messages/" + msg1.getId())
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("content", "Hello Emma! Updated message."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Hello Emma! Updated message."))
                .andExpect(jsonPath("$.edited").value(true));

        // 9. David deletes message for everyone
        mockMvc.perform(delete("/api/messages/" + msg1.getId() + "?forEveryone=true")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk());

        // 10. Emma views messages and sees deleted placeholder
        mockMvc.perform(get("/api/messages/conversations/" + convId)
                        .header("Authorization", "Bearer " + user2Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].deletedForEveryone").value(true))
                .andExpect(jsonPath("$.content[0].content").value("This message was deleted"));
    }
}
