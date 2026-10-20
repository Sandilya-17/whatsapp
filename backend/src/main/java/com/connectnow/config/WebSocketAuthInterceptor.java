package com.connectnow.config;

import com.connectnow.model.User;
import com.connectnow.repository.UserRepository;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    public WebSocketAuthInterceptor(JwtTokenProvider tokenProvider, UserRepository userRepository) {
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = null;

            // Check Authorization header in native STOMP headers
            List<String> authHeaders = accessor.getNativeHeader("Authorization");
            if (authHeaders != null && !authHeaders.isEmpty()) {
                String bearer = authHeaders.get(0);
                if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
                    token = bearer.substring(7);
                }
            }

            // Fallback to token header
            if (token == null) {
                List<String> tokenHeaders = accessor.getNativeHeader("token");
                if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
                    token = tokenHeaders.get(0);
                }
            }

            if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
                String username = tokenProvider.getUsernameFromToken(token);
                Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username);

                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    Principal principal = new UsernamePasswordAuthenticationToken(
                            user.getUsername(), null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                    );
                    accessor.setUser(principal);
                }
            }
        }

        return message;
    }
}
