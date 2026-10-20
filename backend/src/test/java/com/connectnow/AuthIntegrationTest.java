package com.connectnow;

import com.connectnow.dto.AuthResponse;
import com.connectnow.dto.LoginRequest;
import com.connectnow.dto.RegisterRequest;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthIntegrationTest {

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

    @BeforeEach
    void setUp() {
        messageDeletionRepository.deleteAll();
        messageRepository.deleteAll();
        conversationMemberRepository.deleteAll();
        conversationRepository.deleteAll();
        contactRequestRepository.deleteAll();
        blockedUserRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void testRegistrationAndLoginFlow() throws Exception {
        RegisterRequest registerReq = new RegisterRequest();
        registerReq.setUsername("alice");
        registerReq.setEmail("alice@example.com");
        registerReq.setPassword("Password123!");
        registerReq.setDisplayName("Alice Cooper");

        // 1. Register successfully
        MvcResult regResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("alice"))
                .andExpect(jsonPath("$.user.email").value("alice@example.com"))
                .andReturn();

        AuthResponse regAuth = objectMapper.readValue(regResult.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(regAuth.getToken()).isNotBlank();

        // 2. Reject duplicate username
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username 'alice' is already taken"));

        // 3. Login with correct credentials
        LoginRequest loginReq = new LoginRequest();
        loginReq.setUsernameOrEmail("alice");
        loginReq.setPassword("Password123!");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        AuthResponse loginAuth = objectMapper.readValue(loginResult.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(loginAuth.getToken()).isNotBlank();

        // 4. Access protected /api/users/me with JWT
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + loginAuth.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.displayName").value("Alice Cooper"));

        // 5. Reject login with bad password
        LoginRequest badLogin = new LoginRequest();
        badLogin.setUsernameOrEmail("alice");
        badLogin.setPassword("WrongPassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isBadRequest());
    }
}
