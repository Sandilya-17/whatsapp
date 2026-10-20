package com.connectnow;

import com.connectnow.dto.AuthResponse;
import com.connectnow.dto.ContactRequestDto;
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

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ContactIntegrationTest {

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

    private String bobToken;
    private Long bobId;

    private String charlieToken;
    private Long charlieId;

    @BeforeEach
    void setUp() throws Exception {
        messageDeletionRepository.deleteAll();
        messageRepository.deleteAll();
        conversationMemberRepository.deleteAll();
        conversationRepository.deleteAll();
        contactRequestRepository.deleteAll();
        blockedUserRepository.deleteAll();
        userRepository.deleteAll();

        // Register Bob
        RegisterRequest bobReq = new RegisterRequest();
        bobReq.setUsername("bob");
        bobReq.setEmail("bob@example.com");
        bobReq.setPassword("Password123!");
        bobReq.setDisplayName("Bob Builder");

        MvcResult bobRes = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bobReq)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse bobAuth = objectMapper.readValue(bobRes.getResponse().getContentAsString(), AuthResponse.class);
        bobToken = bobAuth.getToken();
        bobId = bobAuth.getUser().getId();

        // Register Charlie
        RegisterRequest charlieReq = new RegisterRequest();
        charlieReq.setUsername("charlie");
        charlieReq.setEmail("charlie@example.com");
        charlieReq.setPassword("Password123!");
        charlieReq.setDisplayName("Charlie Brown");

        MvcResult charlieRes = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(charlieReq)))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse charlieAuth = objectMapper.readValue(charlieRes.getResponse().getContentAsString(), AuthResponse.class);
        charlieToken = charlieAuth.getToken();
        charlieId = charlieAuth.getUser().getId();
    }

    @Test
    void testSearchAndConnectionRequestFlow() throws Exception {
        // 1. Bob searches for Charlie
        mockMvc.perform(get("/api/contacts/search")
                        .param("query", "char")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("charlie"))
                .andExpect(jsonPath("$[0].relationshipStatus").value("NONE"));

        // 2. Bob sends connection request to Charlie
        MvcResult reqRes = mockMvc.perform(post("/api/contacts/requests")
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("recipientId", charlieId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        ContactRequestDto reqDto = objectMapper.readValue(reqRes.getResponse().getContentAsString(), ContactRequestDto.class);

        // 3. Charlie sees pending request
        mockMvc.perform(get("/api/contacts/requests/pending")
                        .header("Authorization", "Bearer " + charlieToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(reqDto.getId()))
                .andExpect(jsonPath("$[0].sender.username").value("bob"));

        // 4. Charlie accepts request
        mockMvc.perform(post("/api/contacts/requests/" + reqDto.getId() + "/accept")
                        .header("Authorization", "Bearer " + charlieToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        // 5. Bob now has Charlie in contacts
        mockMvc.perform(get("/api/contacts")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("charlie"));

        // 6. Charlie now has Bob in contacts
        mockMvc.perform(get("/api/contacts")
                        .header("Authorization", "Bearer " + charlieToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("bob"));
    }
}
