# ConnectNow — Real-Time Messaging Platform

ConnectNow is a modern, production-oriented real-time messaging application inspired by WhatsApp, Signal, and Telegram. Built with a robust **Java 21 / Spring Boot 3** backend and a responsive **React + TypeScript (Vite)** frontend with original branding and obsidian-emerald glassmorphism aesthetics.

---

## Architecture Overview

```
                          ┌─────────────────────────────────────┐
                          │         React + TypeScript          │
                          │   (PWA / Vite Frontend :5173)       │
                          └──────────────┬──────────────────────┘
                                         │
                    REST API (JSON)      │      STOMP over WebSocket
             (Auth, Profiles, Contacts)  │   (Real-Time Messages, Presence)
                                         ▼
                          ┌─────────────────────────────────────┐
                          │       Spring Boot 3 Backend         │
                          │             (Port 8085)             │
                          │                                     │
                          │ ├── Spring Security + Stateless JWT │
                          │ ├── Spring WebSocket (STOMP)        │
                          │ ├── Spring Data JPA & Hibernate     │
                          │ └── In-Memory / File / MySQL DB     │
                          └─────────────────────────────────────┘
```

---

## Milestones Completed (Milestones 1–3)

### Milestone 1: Core System, Authentication & Profiles
- [x] **Spring Boot 3.3.4 Backend** with Java 17 LTS / Java 21 support and Maven.
- [x] **Stateless JWT Security** using HMAC-SHA256 (`io.jsonwebtoken 0.12.x`) with Spring Security filters.
- [x] **User Registration & Login**: Unique usernames, email validation, and BCrypt password hashing.
- [x] **Profile Management**: Display name, avatar URL (DiceBear automated avatars), and custom status message.
- [x] **Granular Privacy Settings**: Controls for profile photo visibility (`EVERYONE`, `CONTACTS`, `NOBODY`), last seen visibility, and read receipts.
- [x] **Global Exception Handler**: Consistent JSON API error responses.

### Milestone 2: User Discovery & Contact Connections
- [x] **User Search**: Query users across the platform by username or display name (excluding blocked users).
- [x] **Connection Requests**: Send, accept, and decline contact requests.
- [x] **Mutual Acceptance**: Automatically initializes direct conversation channels upon acceptance.
- [x] **Blocking & Unblocking**: Complete privacy shielding (blocked users cannot see online status or initiate conversations).
- [x] **Real-time Notifications**: WebSocket STOMP notification dispatch to user personal queues (`/user/queue/notifications`).

### Milestone 3: Persistent One-to-One Messaging & Real-Time Delivery
- [x] **Persistent Conversations & Messages**: Database-backed message history with pagination.
- [x] **Delivery States**: Sent, delivered, and read receipt confirmations with double checkmark indicators.
- [x] **Idempotency & Retry Safety**: Uses unique `clientMessageId` to prevent duplicate message sends when clients retry.
- [x] **Real-Time Delivery**: Subscriptions to `/topic/conversations/{id}` and targeted `/user/queue/messages`.
- [x] **Typing Indicators**: Live typing notification broadcast (`/topic/conversations/{id}/typing`).
- [x] **Message Editing & Deletion**: Support for editing messages (with `(edited)` tag), "Delete for me", and "Delete for everyone".
- [x] **Reply Preview**: Link and preview quoted replies directly in chat bubbles.

---

## Automated Test Suite

Run all backend integration tests:
```bash
cd backend
mvn test
```

Tests include:
- `AuthIntegrationTest`: User registration, duplicate constraint enforcement, login with BCrypt verification, and protected profile access.
- `ContactIntegrationTest`: Search, friend requests, pending request management, acceptance, and contact synchronization.
- `MessagingIntegrationTest`: Direct conversation initiation, sending messages, idempotency deduplication, unread counts, read receipts, message edit, and message deletion.

---

## Running the Application Locally

### 1. Start Backend (Spring Boot)
```bash
cd backend
mvn spring-boot:run
```
*Backend runs on port `8085` (H2 Database Console available at `http://localhost:8085/h2-console`).*

### 2. Start Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with automatic reverse proxy to the backend.*
