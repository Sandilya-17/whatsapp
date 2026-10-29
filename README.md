# ConnectNow

A WhatsApp-style real-time chat app, built end to end and used by friends and family.

**Stack:** Java 17 · Spring Boot · STOMP/WebSocket · React + TypeScript · MySQL · JWT · Docker

## Features

- One-to-one and group chats with real-time delivery
- Sent / delivered / read ticks, typing indicators, online presence
- Replies, reactions, message editing and deleting
- Image, video and file sharing
- Contact requests and blocking
- Voice and video call signaling
- Web Push notifications, even when the tab is closed
- QR-code login to link a computer to your phone
- Installable as a PWA

## How it works

```
React app  ── REST + JWT ──────────▶  Spring Boot API ──▶ MySQL
           ◀── STOMP / WebSocket ──▶
```

- **Reliable sending:** every message has a client-generated ID. The server checks it before saving, so a retry after a network failure never creates a duplicate.
- **Secure WebSockets:** the JWT is verified once when the connection opens.
- **Auto-reconnect:** the client reconnects and restores its subscriptions on its own.

## Run it

**With Docker:**

```bash
git clone https://github.com/Sandilya-17/whatsapp.git
cd whatsapp
cp .env.example .env     # set your own JWT_SECRET
docker compose up --build
```

Open http://localhost (API on port 8085).

**Without Docker:**

```bash
cd backend && mvn spring-boot:run      # uses a built-in H2 database
cd frontend && npm install && npm run dev
```

## Configuration

| Variable | What it does |
|---|---|
| `JWT_SECRET` | Key used to sign login tokens. Set your own. |
| `SPRING_DATASOURCE_URL` | Database connection (defaults to H2) |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins |
| `VITE_API_URL` | Backend address used by the frontend |

## Tests

```bash
cd backend && mvn test
```

Covers sign-up and login, contact requests, and messaging, including the retry case.

## Roadmap

- Run on more than one server (needs an external message broker)
- Tighter access rules for WebSocket topics
- Database constraint to fully prevent duplicate messages
- Automated builds and tests on every push

## Author

P. V. Sai Sandilya · [github.com/Sandilya-17](https://github.com/Sandilya-17)
