# 🎉 The Marauder's Map - Visual Showcase

**"I solemnly swear that I am up to no good."**

> A full-stack incident tracking system built with Express, PostgreSQL, and Socket.io
> Following TDD methodology and idiomatic design patterns

---

## 📊 Project Overview

### Version History

| Version | Features | Status |
|---------|----------|--------|
| **v1.0.0** | Core CRUD Operations | ✅ Complete |
| **v2.0.0** | Authentication & Authorization (JWT) | ✅ Complete |
| **v3.0.0** | Real-Time Features (WebSockets) | ✅ Complete (Phase 1-2) |

### Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND STACK                         │
├─────────────────────────────────────────────────────────┤
│  Runtime       Node.js (ES Modules)                     │
│  Framework     Express.js 4.18                          │
│  WebSockets    Socket.io 4.6                            │
│  Database      PostgreSQL 16                            │
│  Auth          JWT (jsonwebtoken 9.0)                   │
│  Password      bcrypt (cost factor 10)                  │
│  Testing       Jest 29.7 + Supertest                    │
│  Dev Tools     Nodemon, Parseltongue v1.4.3            │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

### High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                          │
│  (Future: React Frontend or Any REST/WebSocket Client)       │
└────────────┬────────────────────────┬────────────────────────┘
             │                        │
             │ HTTP (REST)            │ WebSocket
             │                        │
┌────────────▼────────────────────────▼────────────────────────┐
│                    APPLICATION LAYER                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Express.js HTTP Server (v3.0.0)            │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Routes (22 endpoints)                         │  │   │
│  │  │  • Authentication (6)  • Incidents (6)         │  │   │
│  │  │  • Notifications (6)   • Presence (4)          │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Middleware                                     │  │   │
│  │  │  • CORS  • Body Parser  • JWT Auth             │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Socket.io WebSocket Server                   │   │
│  │  • JWT Authentication Middleware                     │   │
│  │  • Room-Based Broadcasting                           │   │
│  │  • Presence Tracking                                 │   │
│  │  • Event Handlers (join, leave, typing)              │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────┬────────────────────────┘
             │                        │
             │ SQL Queries            │ Presence Sessions
             │                        │
┌────────────▼────────────────────────▼────────────────────────┐
│                    DATA LAYER (PostgreSQL)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tables:                                              │   │
│  │  • users                  • incidents                 │   │
│  │  • refresh_tokens         • notifications            │   │
│  │  • presence_sessions      • analytics_overview       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Stored Functions:                                    │   │
│  │  • resolve_incident()                                 │   │
│  │  • refresh_analytics()                                │   │
│  │  • cleanup_stale_presence_sessions()                 │   │
│  │  • get_online_users_by_role()                        │   │
│  │  • get_users_viewing_incident()                      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints Catalog

### 🔐 Authentication Endpoints (`/api/auth`)

All authentication endpoints with request/response examples:

#### 1. **POST /api/auth/register** - User Registration

**Request:**
```http
POST /api/auth/register HTTP/1.1
Content-Type: application/json

{
  "email": "harry.potter@hogwarts.edu",
  "password": "Gryffindor123!",
  "firstName": "Harry",
  "lastName": "Potter"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "harry.potter@hogwarts.edu",
    "first_name": "Harry",
    "last_name": "Potter",
    "role": "STUDENT",
    "house": null,
    "created_at": "2026-02-07T10:30:00Z",
    "updated_at": "2026-02-07T10:30:00Z"
  }
}
```

**Validation:**
- Email must end with `@hogwarts.edu`
- Password minimum 8 characters
- All fields required

---

#### 2. **POST /api/auth/login** - User Login

**Request:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "harry.potter@hogwarts.edu",
  "password": "Gryffindor123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "harry.potter@hogwarts.edu",
    "first_name": "Harry",
    "last_name": "Potter",
    "role": "STUDENT",
    "house": "GRYFFINDOR",
    "created_at": "2026-02-07T10:30:00Z",
    "updated_at": "2026-02-07T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Token Details:**
- **Access Token:** 15-minute expiry
- **Refresh Token:** 7-day expiry with rotation

---

#### 3. **POST /api/auth/refresh** - Refresh Access Token

**Request:**
```http
POST /api/auth/refresh HTTP/1.1
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Security Features:**
- Automatic token rotation (old refresh token invalidated)
- Revocation tracking in database
- Prevents token reuse attacks

---

#### 4. **GET /api/auth/me** - Get Current User 🔒

**Request:**
```http
GET /api/auth/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "harry.potter@hogwarts.edu",
    "first_name": "Harry",
    "last_name": "Potter",
    "role": "STUDENT",
    "house": "GRYFFINDOR",
    "created_at": "2026-02-07T10:30:00Z",
    "updated_at": "2026-02-07T10:30:00Z"
  }
}
```

---

### 📋 Incidents Endpoints (`/api/incidents`)

All endpoints require JWT authentication 🔒

#### 1. **POST /api/incidents** - Create Incident (+ Real-Time Broadcast)

**Request:**
```http
POST /api/incidents HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Suspicious activity in Forbidden Forest",
  "description": "Dark shadows moving between trees",
  "severity": "DANGEROUS",
  "location": "FORBIDDEN_FOREST"
}
```

**Response (201 Created):**
```json
{
  "id": 42,
  "title": "Suspicious activity in Forbidden Forest",
  "description": "Dark shadows moving between trees",
  "severity": "DANGEROUS",
  "location": "FORBIDDEN_FOREST",
  "status": "OPEN",
  "reported_by": "550e8400-e29b-41d4-a716-446655440000",
  "reported_at": "2026-02-07T15:30:00Z",
  "updated_at": "2026-02-07T15:30:00Z"
}
```

**WebSocket Broadcast (to all clients):**
```json
{
  "event": "incident:created",
  "payload": {
    "incident": { ... },
    "createdBy": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Harry",
      "lastName": "Potter",
      "role": "STUDENT"
    }
  }
}
```

**Enums:**
- **Severity:** `MISCHIEF`, `SUSPICIOUS`, `DANGEROUS`, `UNFORGIVABLE`
- **Location:** `HOGWARTS`, `HOGSMEADE`, `KNOCKTURN_ALLEY`, `FORBIDDEN_FOREST`, `MINISTRY`, `AZKABAN`, `DIAGON_ALLEY`, `PLATFORM_9_3_4`

---

#### 2. **GET /api/incidents** - List Incidents

**Request:**
```http
GET /api/incidents?status=OPEN&severity=DANGEROUS HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `status` - Filter by status (OPEN, RESOLVED)
- `severity` - Filter by severity
- `location` - Filter by location

**Response (200 OK):**
```json
{
  "incidents": [
    {
      "id": 42,
      "title": "Suspicious activity in Forbidden Forest",
      "severity": "DANGEROUS",
      "status": "OPEN",
      "reported_at": "2026-02-07T15:30:00Z"
    }
  ],
  "count": 1
}
```

---

#### 3. **PATCH /api/incidents/:id/resolve** - Resolve Incident (+ Broadcast)

**Request:**
```http
PATCH /api/incidents/42/resolve HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "id": 42,
  "title": "Suspicious activity in Forbidden Forest",
  "status": "RESOLVED",
  "resolved_by": "550e8400-e29b-41d4-a716-446655440000",
  "resolved_at": "2026-02-07T16:00:00Z"
}
```

**WebSocket Broadcast (to all clients):**
```json
{
  "event": "incident:resolved",
  "payload": {
    "incidentId": "42",
    "resolvedBy": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Harry",
      "lastName": "Potter",
      "role": "STUDENT"
    },
    "resolution": "Incident resolved by Harry Potter"
  }
}
```

---

### 🔔 Notifications Endpoints (`/api/notifications`)

All endpoints require JWT authentication 🔒

#### 1. **GET /api/notifications** - Get User Notifications

**Request:**
```http
GET /api/notifications?unread=true&limit=10 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "mention",
      "message": "You were mentioned in a comment by Hermione Granger",
      "link": "/incidents/42",
      "is_read": false,
      "created_at": "2026-02-07T14:30:00Z",
      "read_at": null
    }
  ]
}
```

**Notification Types:**
- `mention` - User mentioned in comment
- `assignment` - Incident assigned to user
- `escalation` - Incident severity escalated
- `resolution` - Incident resolved
- `comment` - New comment on watched incident

---

#### 2. **PATCH /api/notifications/read-all** - Mark All as Read

**Request:**
```http
PATCH /api/notifications/read-all HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "message": "All notifications marked as read",
  "count": 12
}
```

---

### 👥 Presence Endpoints (`/api/presence`)

All endpoints require JWT authentication 🔒

#### 1. **GET /api/presence/online/by-role** - Online Users by Role

**Request:**
```http
GET /api/presence/online/by-role HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "byRole": {
    "STUDENT": 45,
    "PREFECT": 8,
    "AUROR": 3
  },
  "total": 56
}
```

---

#### 2. **GET /api/presence/incident/:id** - Users Viewing Incident

**Request:**
```http
GET /api/presence/incident/42 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "viewers": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "first_name": "Harry",
      "last_name": "Potter",
      "role": "STUDENT",
      "connected_at": "2026-02-07T15:30:00Z"
    },
    {
      "user_id": "660e8400-e29b-41d4-a716-446655440001",
      "first_name": "Hermione",
      "last_name": "Granger",
      "role": "PREFECT",
      "connected_at": "2026-02-07T15:31:00Z"
    }
  ],
  "count": 2
}
```

---

## 🔌 WebSocket Events

### Connection Flow

```
┌─────────────┐                           ┌──────────────┐
│   CLIENT    │                           │    SERVER    │
└──────┬──────┘                           └──────┬───────┘
       │                                         │
       │  CONNECT with JWT token                │
       ├────────────────────────────────────────>│
       │                                         │
       │  connection:acknowledged                │
       │<────────────────────────────────────────┤
       │  {socketId, user}                       │
       │                                         │
       │  presence:join (broadcast to all)       │
       │<────────────────────────────────────────┤
       │  {userId, user}                         │
       │                                         │
       │  room:join {room: "incident:42"}        │
       ├────────────────────────────────────────>│
       │                                         │
       │  room:joined {room}                     │
       │<────────────────────────────────────────┤
       │                                         │
```

### Server → Client Events

**1. Connection Acknowledgment**
```javascript
socket.on('connection:acknowledged', (data) => {
  // data = {
  //   socketId: "abc123xyz",
  //   user: { userId, firstName, lastName, role }
  // }
});
```

**2. Incident Created (Global Broadcast)**
```javascript
socket.on('incident:created', (data) => {
  // data = {
  //   incident: { id, title, severity, location, ... },
  //   createdBy: { userId, firstName, lastName, role }
  // }
});
```

**3. Incident Updated (Room Broadcast)**
```javascript
socket.on('incident:updated', (data) => {
  // data = {
  //   incident: { id, title, severity, location, ... },
  //   updatedBy: { userId, firstName, lastName, role }
  // }
});
```

**4. Typing Indicator**
```javascript
socket.on('presence:typing', (data) => {
  // data = {
  //   userId: "550e8400-...",
  //   userName: "Harry Potter",
  //   incidentId: "42",
  //   isTyping: true
  // }
});
```

### Client → Server Events

**1. Join Room**
```javascript
socket.emit('room:join', {
  room: 'incident:42'
});
```

**2. Leave Room**
```javascript
socket.emit('room:leave', {
  room: 'incident:42'
});
```

**3. Start Typing**
```javascript
socket.emit('typing:start', {
  incidentId: '42'
});
```

**4. Heartbeat**
```javascript
// Send every 25 seconds
socket.emit('heartbeat');
```

---

## 💾 Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK) UUID        │
│ email UNIQUE        │
│ password_hash       │
│ first_name          │
│ last_name           │
│ role ENUM           │
│ house ENUM          │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
           │ reported_by (FK)
           │
┌──────────▼──────────┐
│     incidents       │
│─────────────────────│
│ id (PK) BIGSERIAL   │
│ title               │
│ description         │
│ severity ENUM       │
│ location ENUM       │
│ status ENUM         │
│ reported_by (FK)    │
│ resolved_by (FK)    │
│ reported_at         │
│ resolved_at         │
│ updated_at          │
│ deleted_at          │
│ tags TEXT[]         │
└─────────────────────┘

┌─────────────────────┐
│  refresh_tokens     │
│─────────────────────│
│ id (PK) UUID        │
│ user_id (FK)        │
│ token_hash          │
│ is_revoked BOOLEAN  │
│ expires_at          │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐
│   notifications     │
│─────────────────────│
│ id (PK) UUID        │
│ user_id (FK)        │
│ type VARCHAR        │
│ message TEXT        │
│ link TEXT           │
│ is_read BOOLEAN     │
│ created_at          │
│ read_at             │
└─────────────────────┘

┌─────────────────────┐
│ presence_sessions   │
│─────────────────────│
│ socket_id (PK)      │
│ user_id (FK)        │
│ connected_at        │
│ last_seen           │
│ current_room        │
└─────────────────────┘
```

### Key Database Features

**Enums:**
- `user_role`: STUDENT, PREFECT, AUROR
- `severity_level`: MISCHIEF, SUSPICIOUS, DANGEROUS, UNFORGIVABLE
- `location_type`: 8 magical locations
- `incident_status`: OPEN, IN_PROGRESS, RESOLVED

**Indexes:**
- Primary keys on all tables
- Foreign key indexes
- Partial index on unread notifications
- Presence session room index

**Stored Functions:**
- `resolve_incident(incident_id, user_id)` - Automatic status update
- `refresh_analytics()` - Materialized view refresh
- `cleanup_stale_presence_sessions()` - Periodic cleanup
- `get_online_users_by_role()` - Aggregated presence query
- `get_users_viewing_incident(incident_id)` - Room viewers

---

## 📂 Code Structure

### Project Layout

```
marauders-map/
├── gringotts/                      # Shared PostgreSQL Database
│   └── init.sql                    # Complete schema (760 lines)
│       ├── Year 1: Core tables
│       ├── Year 2: Auth tables
│       └── Year 3: Real-time tables
│
├── gryffindor/server/              # Express.js Backend
│   ├── src/
│   │   ├── server.js               # Main entry point
│   │   ├── db/
│   │   │   └── connectionPoolManager.js  # PostgreSQL pool
│   │   ├── middleware/
│   │   │   └── authenticationMiddlewareHandler.js  # JWT auth
│   │   ├── services/
│   │   │   └── authenticationService.js  # Auth business logic
│   │   ├── routes/
│   │   │   ├── authRouteHandler.js         # 6 endpoints
│   │   │   ├── incidentsRouteHandler.js    # 6 endpoints
│   │   │   ├── notificationsRouteHandler.js # 6 endpoints
│   │   │   └── presenceRouteHandler.js     # 4 endpoints
│   │   └── websocket/
│   │       └── socketServer.js     # Socket.io server (540 lines)
│   ├── tests/
│   │   └── auth.test.js            # 55 TDD tests
│   └── package.json
│
├── docs/                           # Architecture Documentation
│   ├── ARCHITECTURE-OVERVIEW.md
│   ├── ARCHITECTURE-BACKEND-LAYERS.md
│   ├── ARCHITECTURE-DATABASE.md
│   └── ARCHITECTURE-DEPENDENCIES.md
│
├── YEAR-2-PLAN.md through YEAR-7-PLAN.md  # Implementation plans
├── SESSION-SUMMARY-20260202.md
└── SHOWCASE.md                     # This file!
```

---

## 🧪 Test Coverage

### Authentication Tests (55 tests)

**Test File:** `tests/auth.test.js`

**Phase Breakdown:**
- **Phase 1:** Password Security (9 tests) ✅
- **Phase 2:** User Registration (8 tests) ✅
- **Phase 3:** JWT Token Generation (6 tests) ✅
- **Phase 4:** User Login (8 tests) ✅
- **Phase 5:** Token Verification (6 tests) ✅
- **Phase 6:** Token Refresh & Logout (10 tests) ✅
- **Phase 7:** Password Management (8 tests) ✅

**Test Categories:**
- ✅ bcrypt hashing and verification
- ✅ Password strength validation
- ✅ Email domain validation (@hogwarts.edu)
- ✅ JWT token generation and expiry
- ✅ Token rotation security
- ✅ Refresh token revocation
- ✅ Password change with verification

**Testing Stack:**
- **Jest** 29.7 - Test framework
- **Supertest** 6.3 - HTTP testing
- **ES Modules** - Modern JavaScript

---

## 🔒 Security Features

### Authentication & Authorization

✅ **bcrypt Password Hashing**
- Cost factor 10 (~40-80ms on modern hardware)
- Automatic salt generation
- Constant-time comparison

✅ **JWT Tokens**
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry
- Automatic rotation on refresh
- Revocation tracking in database

✅ **Middleware Protection**
- JWT verification on all protected routes
- Token type validation (access vs refresh)
- User data extraction from token payload
- Graceful error handling

### API Security

✅ **SQL Injection Prevention**
- Parameterized queries everywhere
- PostgreSQL prepared statements
- Input validation

✅ **CORS Configuration**
- Configurable allowed origins
- Credentials support
- Pre-flight handling

✅ **Error Handling**
- Generic error messages (timing attack prevention)
- No password/token exposure in logs
- Stack traces only in development

---

## 📊 Code Statistics

### Lines of Code

| Component | Lines | Files |
|-----------|-------|-------|
| Database Schema | 760 | 1 |
| WebSocket Server | 540 | 1 |
| Authentication Service | 420 | 1 |
| Incidents Handler | 430 | 1 |
| Notifications API | 240 | 1 |
| Presence API | 190 | 1 |
| Auth Routes | 380 | 1 |
| Tests | 1,160 | 1 |
| **Total Backend** | **~4,120** | **~15** |

### Commits Timeline

```
v1.0.0  Year 1: Core CRUD              (commit 9cf0242) ✅
v2.0.0  Year 2: Authentication         (commits b44a4f2 → 814e724) ✅
        Phase 1-3: Foundation          (b44a4f2)
        Phase 4: User Login            (ac2d477)
        Phase 5: JWT Verification      (95f44fd)
        Phase 6: Token Refresh         (a556dd1)
        Phase 7: Password Management   (814e724)
        HTTP Layer Integration         (7d97e71)
v3.0.0  Year 3: Real-Time Features     (commits 09c1598 → 4978bf4) ✅
        Phase 1: WebSocket Foundation  (09c1598)
        Phase 2: Broadcasts & APIs     (4978bf4)
```

---

## 🎯 Design Patterns & Best Practices

### 4-Word Naming Convention

All functions follow the pattern: `verb_constraint_target_qualifier()`

**Examples:**
```javascript
// Authentication
hashPasswordWithBcryptSalt()
comparePasswordWithStoredHash()
registerUserWithEmailPassword()
loginUserWithEmailPassword()
verifyAccessTokenAndReturnPayload()

// WebSocket
initializeSocketServerWithHttpServer()
authenticateSocketConnectionWithJwtToken()
handleSocketConnectionWithPresenceTracking()
broadcastIncidentCreatedToAllClients()
broadcastIncidentUpdatedToRoom()

// Database
createPresenceSessionInDatabase()
removePresenceSessionFromDatabase()
updatePresenceSessionHeartbeat()
```

### TDD Methodology

**RED → GREEN → REFACTOR Cycle:**

1. **RED**: Write failing tests first
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Clean up and optimize

**Example Flow:**
```
Phase 1: Write 9 password tests → All fail (RED)
        ↓
        Implement bcrypt functions → All pass (GREEN)
        ↓
        Adjust timing thresholds → Optimized (REFACTOR)
```

### Layered Architecture

```
┌─────────────────────────────────────┐
│         Routes (HTTP/WS)             │  ← API endpoints, request validation
├─────────────────────────────────────┤
│      Services (Business Logic)       │  ← Core functionality, auth logic
├─────────────────────────────────────┤
│      Database (Data Layer)           │  ← PostgreSQL queries, transactions
└─────────────────────────────────────┘
```

---

## 🚀 Running the System

### Prerequisites

```bash
# Required
- Node.js 18+
- PostgreSQL 16
- Docker & Docker Compose (optional)

# Optional
- Postman (API testing)
- Socket.io client (WebSocket testing)
```

### Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_URL=postgresql://marauders_app:change_this_password@localhost:5432/marauders_map

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=4001
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3001

# WebSocket
SOCKET_IO_CORS_ORIGIN=http://localhost:3001
SOCKET_IO_PING_TIMEOUT=60000
SOCKET_IO_PING_INTERVAL=25000
```

### Start Database

```bash
cd marauders-map
docker-compose up -d
```

### Start Server

```bash
cd gryffindor/server
npm install
npm start
```

**Server Output:**
```
============================================================
🦁  GRYFFINDOR WING - THE MARAUDER'S MAP v3.0.0
============================================================
📡 Server running on port 4001
🌍 Environment: development
🔗 API Base URL: http://localhost:4001
💚 Health Check: http://localhost:4001/health
🔐 Auth API: http://localhost:4001/api/auth
📋 Incidents API: http://localhost:4001/api/incidents
============================================================
"I solemnly swear that I am up to no good."
============================================================

🔌 Socket.io server initialized
🔌 WebSocket server ready
```

### Run Tests

```bash
npm test
```

---

## 🎨 Visual Examples

### Example 1: Complete User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Register User                                       │
└─────────────────────────────────────────────────────────────┘
POST /api/auth/register
  ↓
  Creates user in database
  Hashes password with bcrypt
  ↓
  Returns user object (no password!)

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Login                                               │
└─────────────────────────────────────────────────────────────┘
POST /api/auth/login
  ↓
  Verifies password with bcrypt
  Generates JWT access token (15min)
  Generates JWT refresh token (7days)
  Stores refresh token in database
  ↓
  Returns user + both tokens

┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Connect WebSocket                                   │
└─────────────────────────────────────────────────────────────┘
io.connect('ws://localhost:4001', { auth: { token: accessToken }})
  ↓
  Server verifies JWT
  Creates presence session in database
  ↓
  Broadcasts 'presence:join' to all clients

┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Create Incident                                     │
└─────────────────────────────────────────────────────────────┘
POST /api/incidents (with JWT)
  ↓
  Saves incident to database
  Returns HTTP 201
  ↓
  Broadcasts 'incident:created' via WebSocket to ALL clients
  ↓
  All connected users see instant update!

┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Join Incident Room                                  │
└─────────────────────────────────────────────────────────────┘
socket.emit('room:join', { room: 'incident:42' })
  ↓
  Joins Socket.io room
  Updates presence session with current room
  ↓
  Other users in room see 'presence:join' event

┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Update Incident                                     │
└─────────────────────────────────────────────────────────────┘
PUT /api/incidents/42 (with JWT)
  ↓
  Updates incident in database
  Returns HTTP 200
  ↓
  Broadcasts 'incident:updated' to incident:42 ROOM only
  ↓
  Only users viewing that incident get the update!
```

### Example 2: Token Refresh Flow

```
┌───────────────────────────────────────────────────────┐
│  Access Token Expires (after 15 minutes)              │
└───────────────────────────────────────────────────────┘
                    ↓
        Client receives 401 Unauthorized
                    ↓
┌───────────────────────────────────────────────────────┐
│  POST /api/auth/refresh                                │
│  { refreshToken: "..." }                               │
└───────────────────────────────────────────────────────┘
                    ↓
        Server verifies refresh token
        Checks revocation status in DB
                    ↓
        Generates NEW access token
        Generates NEW refresh token
        Revokes OLD refresh token
                    ↓
┌───────────────────────────────────────────────────────┐
│  Returns both new tokens                               │
│  { accessToken: "...", refreshToken: "..." }           │
└───────────────────────────────────────────────────────┘
                    ↓
        Client stores new tokens
        Retries failed request with new access token
                    ↓
                SUCCESS! ✅
```

---

## 🏆 Achievements Unlocked

### Year 1: Core CRUD ✅
- [x] PostgreSQL database with 8 tables
- [x] Complete CRUD for incidents
- [x] Soft delete functionality
- [x] Analytics materialized view
- [x] Seeded test data

### Year 2: Authentication & Authorization ✅
- [x] bcrypt password hashing
- [x] JWT access & refresh tokens
- [x] Token rotation security
- [x] User registration & login
- [x] Password change with verification
- [x] 55 comprehensive tests (TDD)

### Year 3: Real-Time Features ✅ (Phase 1-2)
- [x] Socket.io WebSocket server
- [x] JWT authentication for WebSockets
- [x] Presence tracking system
- [x] Real-time incident broadcasts
- [x] Notifications API
- [x] Presence API
- [x] Room-based messaging
- [x] Typing indicator infrastructure

---

## 📚 What We Learned

### Technical Concepts

✅ **WebSocket Protocol**
- Bidirectional communication
- Event-driven architecture
- Room-based broadcasting
- Connection lifecycle management

✅ **JWT Authentication**
- Stateless authentication
- Token rotation for security
- Refresh token best practices
- Revocation strategies

✅ **Test-Driven Development**
- RED → GREEN → REFACTOR cycle
- Writing tests first
- Incremental implementation
- Refactoring with confidence

✅ **Database Design**
- Foreign key relationships
- Enum types for validation
- Partial indexes
- Stored procedures/functions
- Materialized views

✅ **REST API Design**
- RESTful resource naming
- HTTP status codes
- Error handling
- API versioning

---

## 🎉 Final Stats

```
┌──────────────────────────────────────────────────────┐
│             THE MARAUDER'S MAP v3.0.0                 │
├──────────────────────────────────────────────────────┤
│  Total API Endpoints:        22                      │
│  WebSocket Events:           9 (server→client)       │
│  Database Tables:            6                       │
│  Stored Functions:           5                       │
│  Test Suites:                7 phases                │
│  Total Tests:                55 (all passing)        │
│  Lines of Code:              ~4,120                  │
│  Commits:                    10                      │
│  Development Time:           1 session               │
│  Coffee Consumed:            Unlimited ☕            │
└──────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

**Immediate:**
- [ ] Test with Docker Compose and real database
- [ ] Add integration tests for WebSocket events
- [ ] Create Postman collection

**Year 3 Remaining:**
- [ ] Phase 3: Comments system
- [ ] Phase 4: @mentions and notifications
- [ ] Phase 5: File attachments

**Year 4: Search & Performance**
- [ ] Full-text search
- [ ] Redis caching layer
- [ ] Advanced filtering
- [ ] Performance optimization

**Frontend:**
- [ ] React client application
- [ ] Real-time UI updates
- [ ] Typing indicators
- [ ] Online user badges

---

## 📞 API Reference Quick Links

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | ❌ | Health check |
| `/` | GET | ❌ | API documentation |
| `/api/auth/register` | POST | ❌ | User registration |
| `/api/auth/login` | POST | ❌ | User login |
| `/api/auth/refresh` | POST | ❌ | Refresh access token |
| `/api/auth/logout` | POST | ❌ | Logout (revoke token) |
| `/api/auth/me` | GET | ✅ | Get current user |
| `/api/auth/change-password` | PUT | ✅ | Change password |
| `/api/incidents` | GET | ✅ | List incidents |
| `/api/incidents` | POST | ✅ | Create incident |
| `/api/incidents/:id` | GET | ✅ | Get incident |
| `/api/incidents/:id` | PUT | ✅ | Update incident |
| `/api/incidents/:id` | DELETE | ✅ | Delete incident |
| `/api/incidents/:id/resolve` | PATCH | ✅ | Resolve incident |
| `/api/notifications` | GET | ✅ | Get notifications |
| `/api/notifications/unread/count` | GET | ✅ | Count unread |
| `/api/notifications/:id/read` | PATCH | ✅ | Mark as read |
| `/api/notifications/read-all` | PATCH | ✅ | Mark all read |
| `/api/notifications/:id` | DELETE | ✅ | Delete notification |
| `/api/presence/online` | GET | ✅ | List online users |
| `/api/presence/online/by-role` | GET | ✅ | Online users by role |
| `/api/presence/incident/:id` | GET | ✅ | Users viewing incident |
| `/api/presence/current-user` | GET | ✅ | My active sessions |

---

**Built with ❤️ using Claude Code and TDD methodology**

*"Mischief Managed!"* ✨
