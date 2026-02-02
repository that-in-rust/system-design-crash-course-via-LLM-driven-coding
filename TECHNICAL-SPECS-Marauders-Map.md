# Technical Specifications: The Marauder's Map
## Multi-Stack Educational Platform - Architecture & Implementation

**Version:** 1.0
**Date:** February 2, 2026
**Status:** Draft for Review
**Target Audience:** Software Engineers, Architects, DevOps

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Database Schema](#database-schema)
3. [API Contract](#api-contract)
4. [Technology Stack Breakdown](#technology-stack-breakdown)
5. [Real-Time Communication](#real-time-communication)
6. [Authentication & Authorization](#authentication--authorization)
7. [Deployment Architecture](#deployment-architecture)
8. [Development Workflow](#development-workflow)
9. [Testing Strategy](#testing-strategy)
10. [Performance Optimization](#performance-optimization)
11. [Security Considerations](#security-considerations)

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Gryffindor  │  │  Slytherin   │  │  Ravenclaw   │          │
│  │   React UI   │  │  Angular UI  │  │   Thymeleaf  │          │
│  │ :3001        │  │  :3002       │  │   :3003      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │ HTTP/WS          │ HTTP/WS          │ HTTP/WS
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────────┐
│         │    Application Layer (API Servers)  │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼──────┐          │
│  │   Express    │  │  ASP.NET     │  │ Spring Boot  │          │
│  │   Node.js    │  │   Core       │  │    Java      │          │
│  │  :4001       │  │  :4002       │  │   :4003      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             │ SQL
                             │
                    ┌────────▼─────────┐
                    │   PostgreSQL     │
                    │  (Gringotts)     │
                    │     :5432        │
                    └──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │      Redis       │
                    │   (Optional)     │
                    │     :6379        │
                    └──────────────────┘
```

### Shared Infrastructure ("Gringotts Vault")

**Database:** Single PostgreSQL 16 instance shared across all three implementations

**Why Shared Database?**
1. **Educational focus:** Demonstrates different ORM approaches to same schema
2. **Data consistency:** All UIs show identical data in real-time
3. **Realistic constraint:** Simulates brownfield development (existing schema)
4. **Simplicity:** Single source of truth, no synchronization complexity

**Shared API Contract:**
- OpenAPI 3.1 specification defines endpoints
- All three backends implement identical REST API
- Response formats must match exactly
- Enables UI swapping (React frontend can call .NET backend)

---

## Database Schema

### Tables

#### `users`
```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'PREFECT', 'AUROR')),
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    house               VARCHAR(20) CHECK (house IN ('GRYFFINDOR', 'SLYTHERIN', 'RAVENCLAW', 'HUFFLEPUFF')),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at       TIMESTAMP WITH TIME ZONE,
    is_active           BOOLEAN DEFAULT TRUE,
    avatar_url          TEXT,

    -- Indexes
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

#### `incidents`
```sql
CREATE TYPE severity_level AS ENUM ('MISCHIEF', 'SUSPICIOUS', 'DANGEROUS', 'UNFORGIVABLE');
CREATE TYPE incident_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');
CREATE TYPE location_type AS ENUM (
    'HOGWARTS',
    'HOGSMEADE',
    'KNOCKTURN_ALLEY',
    'FORBIDDEN_FOREST',
    'MINISTRY',
    'AZKABAN',
    'DIAGON_ALLEY',
    'PLATFORM_9_3_4'
);

CREATE TABLE incidents (
    id                  BIGSERIAL PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    severity            severity_level NOT NULL DEFAULT 'MISCHIEF',
    location            location_type NOT NULL,
    status              incident_status NOT NULL DEFAULT 'OPEN',

    -- Audit fields
    reported_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reported_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at         TIMESTAMP WITH TIME ZONE,
    resolved_by         UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Metadata
    tags                TEXT[],
    evidence_urls       TEXT[],
    witness_count       INTEGER DEFAULT 0,

    -- Full-text search
    search_vector       TSVECTOR,

    -- Soft delete
    deleted_at          TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_resolution CHECK (
        (status = 'RESOLVED' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL) OR
        (status != 'RESOLVED')
    )
);

-- Indexes for performance
CREATE INDEX idx_incidents_severity ON incidents(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_location ON incidents(location) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_status ON incidents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);

-- Full-text search index
CREATE INDEX idx_incidents_search ON incidents USING GIN(search_vector);

-- Composite index for common queries
CREATE INDEX idx_incidents_status_severity ON incidents(status, severity) WHERE deleted_at IS NULL;

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION incidents_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.location::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incidents_search_update
    BEFORE INSERT OR UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION incidents_search_vector_update();
```

#### `incident_comments`
```sql
CREATE TABLE incident_comments (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content             TEXT NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE,

    CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX idx_comments_incident ON incident_comments(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_created_at ON incident_comments(created_at DESC);
```

#### `incident_history`
```sql
CREATE TABLE incident_history (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    changed_by          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    changed_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    field_name          VARCHAR(50) NOT NULL,
    old_value           TEXT,
    new_value           TEXT NOT NULL,

    -- For event sourcing (Year 6)
    event_type          VARCHAR(50),
    event_payload       JSONB
);

CREATE INDEX idx_history_incident ON incident_history(incident_id, changed_at DESC);
CREATE INDEX idx_history_user ON incident_history(changed_by);
CREATE INDEX idx_history_event_type ON incident_history(event_type) WHERE event_type IS NOT NULL;
```

#### `notifications`
```sql
CREATE TYPE notification_type AS ENUM (
    'INCIDENT_CREATED',
    'INCIDENT_ESCALATED',
    'INCIDENT_RESOLVED',
    'COMMENT_ADDED',
    'MENTION'
);

CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                notification_type NOT NULL,
    title               VARCHAR(255) NOT NULL,
    message             TEXT NOT NULL,
    incident_id         BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at             TIMESTAMP WITH TIME ZONE,

    -- Notification payload for extensibility
    metadata            JSONB
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at)
    WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

#### `sessions` (for cookie-based auth)
```sql
CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash          VARCHAR(255) NOT NULL UNIQUE,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address          INET,
    user_agent          TEXT
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE expires_at > NOW();

-- Cleanup expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

#### `refresh_tokens` (for JWT)
```sql
CREATE TABLE refresh_tokens (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash          VARCHAR(255) NOT NULL UNIQUE,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at          TIMESTAMP WITH TIME ZONE,
    replaced_by_token   BIGINT REFERENCES refresh_tokens(id) ON DELETE SET NULL
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;
```

### Materialized Views (Year 5+)

#### `analytics_overview`
```sql
CREATE MATERIALIZED VIEW analytics_overview AS
SELECT
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS total_incidents_30d,
    COUNT(*) FILTER (WHERE status = 'OPEN') AS open_incidents,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_incidents,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_incidents,
    AVG(EXTRACT(EPOCH FROM (resolved_at - reported_at))/3600)
        FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_hours,
    mode() WITHIN GROUP (ORDER BY location) AS most_common_location,
    COUNT(*) FILTER (WHERE severity = 'UNFORGIVABLE') AS unforgivable_count
FROM incidents
WHERE deleted_at IS NULL;

-- Refresh nightly
CREATE INDEX ON analytics_overview (total_incidents_30d);
```

#### `leaderboard`
```sql
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
    u.id,
    u.first_name || ' ' || u.last_name AS full_name,
    u.house,
    COUNT(*) AS incidents_resolved,
    AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.reported_at))/3600) AS avg_resolution_hours,
    SUM(CASE
        WHEN i.severity = 'MISCHIEF' THEN 10
        WHEN i.severity = 'SUSPICIOUS' THEN 25
        WHEN i.severity = 'DANGEROUS' THEN 50
        WHEN i.severity = 'UNFORGIVABLE' THEN 100
    END) AS total_points,
    RANK() OVER (ORDER BY SUM(CASE
        WHEN i.severity = 'MISCHIEF' THEN 10
        WHEN i.severity = 'SUSPICIOUS' THEN 25
        WHEN i.severity = 'DANGEROUS' THEN 50
        WHEN i.severity = 'UNFORGIVABLE' THEN 100
    END) DESC) AS rank
FROM users u
LEFT JOIN incidents i ON i.resolved_by = u.id
    AND i.resolved_at >= NOW() - INTERVAL '30 days'
    AND i.deleted_at IS NULL
WHERE u.is_active = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.house
ORDER BY total_points DESC;

CREATE INDEX ON leaderboard (rank);
```

### Database Functions

#### `escalate_incident_severity`
```sql
CREATE OR REPLACE FUNCTION escalate_incident_severity(
    p_incident_id BIGINT,
    p_new_severity severity_level,
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    v_old_severity severity_level;
BEGIN
    -- Get current severity
    SELECT severity INTO v_old_severity FROM incidents WHERE id = p_incident_id;

    -- Update incident
    UPDATE incidents
    SET severity = p_new_severity, updated_at = NOW()
    WHERE id = p_incident_id;

    -- Log history
    INSERT INTO incident_history (incident_id, changed_by, field_name, old_value, new_value)
    VALUES (p_incident_id, p_user_id, 'severity', v_old_severity::text, p_new_severity::text);

    -- Create notifications for all Aurors
    INSERT INTO notifications (user_id, type, title, message, incident_id)
    SELECT
        u.id,
        'INCIDENT_ESCALATED',
        'Incident Escalated',
        'Incident #' || p_incident_id || ' escalated from ' || v_old_severity || ' to ' || p_new_severity,
        p_incident_id
    FROM users u
    WHERE u.role = 'AUROR' AND u.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Seed Data

```sql
-- Create sample users
INSERT INTO users (email, password_hash, role, first_name, last_name, house) VALUES
    ('harry.potter@hogwarts.edu', '$2b$12$...', 'AUROR', 'Harry', 'Potter', 'GRYFFINDOR'),
    ('hermione.granger@hogwarts.edu', '$2b$12$...', 'PREFECT', 'Hermione', 'Granger', 'GRYFFINDOR'),
    ('draco.malfoy@hogwarts.edu', '$2b$12$...', 'PREFECT', 'Draco', 'Malfoy', 'SLYTHERIN'),
    ('luna.lovegood@hogwarts.edu', '$2b$12$...', 'STUDENT', 'Luna', 'Lovegood', 'RAVENCLAW');

-- Create sample incidents
INSERT INTO incidents (title, description, severity, location, reported_by)
SELECT
    'Suspicious activity in ' || location::text,
    'Multiple reports of unusual behavior',
    (ARRAY['MISCHIEF', 'SUSPICIOUS', 'DANGEROUS'])[floor(random() * 3 + 1)]::severity_level,
    location,
    (SELECT id FROM users ORDER BY random() LIMIT 1)
FROM unnest(enum_range(NULL::location_type)) AS location;
```

---

## API Contract

### OpenAPI 3.1 Specification Outline

```yaml
openapi: 3.1.0
info:
  title: Marauder's Map API
  version: 1.0.0
  description: Dark incident tracking system API - shared contract across all implementations

servers:
  - url: http://localhost:4001
    description: Gryffindor (Express)
  - url: http://localhost:4002
    description: Slytherin (.NET)
  - url: http://localhost:4003
    description: Ravenclaw (Spring Boot)

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        role:
          type: string
          enum: [STUDENT, PREFECT, AUROR]
        firstName:
          type: string
        lastName:
          type: string
        house:
          type: string
          enum: [GRYFFINDOR, SLYTHERIN, RAVENCLAW, HUFFLEPUFF]
        createdAt:
          type: string
          format: date-time

    Incident:
      type: object
      required:
        - title
        - severity
        - location
      properties:
        id:
          type: integer
          format: int64
        title:
          type: string
          maxLength: 255
        description:
          type: string
        severity:
          type: string
          enum: [MISCHIEF, SUSPICIOUS, DANGEROUS, UNFORGIVABLE]
        location:
          type: string
          enum: [HOGWARTS, HOGSMEADE, KNOCKTURN_ALLEY, FORBIDDEN_FOREST, MINISTRY, AZKABAN, DIAGON_ALLEY, PLATFORM_9_3_4]
        status:
          type: string
          enum: [OPEN, IN_PROGRESS, RESOLVED, ARCHIVED]
        reportedBy:
          $ref: '#/components/schemas/User'
        reportedAt:
          type: string
          format: date-time
        resolvedAt:
          type: string
          format: date-time
          nullable: true
        resolvedBy:
          $ref: '#/components/schemas/User'
          nullable: true
        tags:
          type: array
          items:
            type: string

    PaginatedIncidents:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Incident'
        total:
          type: integer
        page:
          type: integer
        limit:
          type: integer
        hasMore:
          type: boolean

    ErrorResponse:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: array
              items:
                type: object

paths:
  # Authentication
  /api/auth/register:
    post:
      tags: [Authentication]
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, firstName, lastName, role]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                firstName:
                  type: string
                lastName:
                  type: string
                role:
                  type: string
                  enum: [STUDENT, PREFECT, AUROR]
                house:
                  type: string
                  enum: [GRYFFINDOR, SLYTHERIN, RAVENCLAW, HUFFLEPUFF]
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/auth/login:
    post:
      tags: [Authentication]
      summary: Login user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                password:
                  type: string
                rememberMe:
                  type: boolean
                  default: false
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken:
                    type: string
                  refreshToken:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'
        '401':
          description: Invalid credentials

  # Incidents
  /api/incidents:
    get:
      tags: [Incidents]
      summary: List incidents with filtering and pagination
      security:
        - BearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
        - name: search
          in: query
          schema:
            type: string
        - name: severity
          in: query
          schema:
            type: array
            items:
              type: string
              enum: [MISCHIEF, SUSPICIOUS, DANGEROUS, UNFORGIVABLE]
        - name: location
          in: query
          schema:
            type: array
            items:
              type: string
        - name: status
          in: query
          schema:
            type: array
            items:
              type: string
              enum: [OPEN, IN_PROGRESS, RESOLVED, ARCHIVED]
        - name: sort
          in: query
          schema:
            type: string
            enum: [reportedAt, severity, status]
            default: reportedAt
        - name: order
          in: query
          schema:
            type: string
            enum: [asc, desc]
            default: desc
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedIncidents'

    post:
      tags: [Incidents]
      summary: Create new incident
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Incident'
      responses:
        '201':
          description: Incident created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Incident'

  /api/incidents/{id}:
    get:
      tags: [Incidents]
      summary: Get incident by ID
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Incident'
        '404':
          description: Incident not found

    patch:
      tags: [Incidents]
      summary: Update incident
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                severity:
                  type: string
                  enum: [MISCHIEF, SUSPICIOUS, DANGEROUS, UNFORGIVABLE]
                status:
                  type: string
                  enum: [OPEN, IN_PROGRESS, RESOLVED, ARCHIVED]
                description:
                  type: string
      responses:
        '200':
          description: Updated successfully

    delete:
      tags: [Incidents]
      summary: Delete incident (soft delete)
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '204':
          description: Deleted successfully
        '403':
          description: Insufficient permissions

  # Analytics
  /api/analytics/overview:
    get:
      tags: [Analytics]
      summary: Get analytics overview
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  totalIncidents30d:
                    type: integer
                  openIncidents:
                    type: integer
                  avgResolutionHours:
                    type: number
                  mostCommonLocation:
                    type: string

  /api/analytics/leaderboard:
    get:
      tags: [Analytics]
      summary: Get performance leaderboard
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    rank:
                      type: integer
                    fullName:
                      type: string
                    house:
                      type: string
                    incidentsResolved:
                      type: integer
                    totalPoints:
                      type: integer

  # WebSocket Events (documented separately - not standard OpenAPI)
  # See Real-Time Communication section below
```

---

## Technology Stack Breakdown

### 🦁 Gryffindor Wing (React + Express)

**Philosophy:** "Move fast, ship fearlessly" - minimal ceremony, JavaScript-first

#### Frontend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | React 18 | Industry standard, hooks-based, vast ecosystem |
| **Language** | TypeScript 5.3 | Type safety while maintaining JS flexibility |
| **State Management** | Zustand | Lightweight, no boilerplate, hooks-friendly |
| **Routing** | React Router 6 | De facto standard, data loading support |
| **Forms** | React Hook Form | Minimal re-renders, built-in validation |
| **HTTP Client** | Axios | Interceptors for auth, better error handling |
| **Real-Time** | Socket.io-client | Simple API, auto-reconnection, fallbacks |
| **UI Library** | Tailwind CSS | Utility-first, rapid development |
| **Charts** | Recharts | React-native, composable, responsive |
| **Build Tool** | Vite | Fast HMR, modern, ES modules |

#### Backend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js 20 LTS | JavaScript everywhere, async I/O |
| **Framework** | Express 4.18 | Minimalist, flexible, huge ecosystem |
| **Language** | TypeScript 5.3 | Shared types with frontend |
| **Database** | pg (node-postgres) | Low-level control, or Prisma ORM |
| **Authentication** | jsonwebtoken + bcrypt | Standard JWT implementation |
| **Real-Time** | Socket.io | WebSocket with fallbacks |
| **Validation** | Zod | TypeScript-first schema validation |
| **Logging** | Winston | Structured logging, transports |
| **Testing** | Jest + Supertest | Industry standard, great DX |

#### Project Structure
```
gryffindor/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── IncidentList/
│   │   │   ├── IncidentForm/
│   │   │   └── common/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   └── IncidentDetail.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useIncidents.ts
│   │   │   └── useWebSocket.ts
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   └── incidentStore.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── websocket.ts
│   │   ├── types/
│   │   │   └── incident.ts
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── incidents.routes.ts
│   │   │   └── analytics.routes.ts
│   │   ├── controllers/
│   │   │   ├── AuthController.ts
│   │   │   └── IncidentController.ts
│   │   ├── services/
│   │   │   ├── IncidentService.ts
│   │   │   └── WebSocketService.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   ├── models/
│   │   │   └── (if using Prisma) schema.prisma
│   │   ├── db/
│   │   │   └── pool.ts
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

### 🐍 Slytherin Wing (Angular + .NET)

**Philosophy:** "Ambition through structure" - type safety, enterprise patterns

#### Frontend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | Angular 17 | Full-featured, opinionated, enterprise-grade |
| **Language** | TypeScript 5.3 | Mandatory in Angular, first-class support |
| **State Management** | NgRx | Redux pattern, RxJS integration, DevTools |
| **Routing** | Angular Router | Built-in, guards, lazy loading |
| **Forms** | Reactive Forms | Type-safe, complex validation |
| **HTTP Client** | HttpClient | Built-in, RxJS observables, interceptors |
| **Real-Time** | SignalR Client | ASP.NET integration, .NET-native |
| **UI Library** | Angular Material | Official, comprehensive, accessible |
| **Charts** | ngx-charts | Angular-native, D3-powered |
| **Build Tool** | Angular CLI | Zero-config, optimized builds |

#### Backend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | ASP.NET Core 8.0 | Modern .NET, cross-platform |
| **Language** | C# 12 | Mature, type-safe, async/await |
| **ORM** | Entity Framework Core | LINQ queries, migrations, change tracking |
| **Authentication** | ASP.NET Identity + JWT | Built-in user management |
| **Real-Time** | SignalR | WebSocket abstraction, hubs |
| **Validation** | FluentValidation | Clean separation, reusable rules |
| **Logging** | Serilog | Structured logging, sinks |
| **Testing** | xUnit + Moq | .NET standard, mocking support |

#### Project Structure
```
slytherin/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── services/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   └── models/
│   │   │   ├── features/
│   │   │   │   ├── incidents/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── services/
│   │   │   │   │   ├── store/
│   │   │   │   │   └── incidents.module.ts
│   │   │   │   ├── auth/
│   │   │   │   └── analytics/
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   ├── directives/
│   │   │   │   ├── pipes/
│   │   │   │   └── shared.module.ts
│   │   │   └── app.module.ts
│   │   ├── environments/
│   │   └── main.ts
│   ├── angular.json
│   └── package.json
│
├── backend/
│   ├── MaraudersMap.API/
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   ├── IncidentsController.cs
│   │   │   └── AnalyticsController.cs
│   │   ├── Hubs/
│   │   │   └── IncidentHub.cs
│   │   ├── Program.cs
│   │   └── appsettings.json
│   ├── MaraudersMap.Core/
│   │   ├── Entities/
│   │   │   ├── Incident.cs
│   │   │   └── User.cs
│   │   ├── Interfaces/
│   │   │   └── IIncidentRepository.cs
│   │   └── DTOs/
│   ├── MaraudersMap.Infrastructure/
│   │   ├── Data/
│   │   │   └── ApplicationDbContext.cs
│   │   ├── Repositories/
│   │   │   └── IncidentRepository.cs
│   │   └── Services/
│   └── MaraudersMap.Tests/
│
└── README.md
```

---

### 🦅 Ravenclaw Wing (Spring Boot + Java)

**Philosophy:** "Wisdom through convention" - annotation-driven, battle-tested

#### Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | Spring Boot 3.2 | Convention over configuration, ecosystem |
| **Language** | Java 21 (LTS) | Records, pattern matching, virtual threads |
| **Frontend** | Thymeleaf + HTMX | Server-rendered, progressive enhancement |
| **ORM** | Spring Data JPA + Hibernate | Annotations, repository pattern |
| **Authentication** | Spring Security | Comprehensive, annotation-based |
| **Real-Time** | WebSocket (STOMP) | Spring integration, message broker |
| **Validation** | Jakarta Validation | Annotation-based (@NotNull, @Valid) |
| **Logging** | Logback (SLF4J) | Spring default, mature |
| **Build Tool** | Maven | Dependency management, plugins |
| **Testing** | JUnit 5 + Mockito | Spring Boot test support |

#### Project Structure
```
ravenclaw/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/hogwarts/maraudersmap/
│   │   │       ├── controller/
│   │   │       │   ├── IncidentController.java
│   │   │       │   ├── AuthController.java
│   │   │       │   └── WebSocketController.java
│   │   │       ├── service/
│   │   │       │   ├── IncidentService.java
│   │   │       │   └── UserService.java
│   │   │       ├── repository/
│   │   │       │   ├── IncidentRepository.java
│   │   │       │   └── UserRepository.java
│   │   │       ├── model/
│   │   │       │   ├── Incident.java
│   │   │       │   └── User.java
│   │   │       ├── dto/
│   │   │       │   └── IncidentDTO.java
│   │   │       ├── security/
│   │   │       │   ├── JwtAuthFilter.java
│   │   │       │   └── SecurityConfig.java
│   │   │       ├── config/
│   │   │       │   └── WebSocketConfig.java
│   │   │       └── MaraudersMapApplication.java
│   │   └── resources/
│   │       ├── templates/ (Thymeleaf)
│   │       ├── static/ (CSS, JS)
│   │       ├── application.yml
│   │       └── db/migration/ (Flyway)
│   └── test/
│       └── java/
│
├── pom.xml
└── README.md
```

---

## Real-Time Communication

### WebSocket Architecture Comparison

#### 🦁 Gryffindor: Socket.io

**Server (Express):**
```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3001' },
  transports: ['websocket', 'polling']
});

// Middleware: Authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!verifyJWT(token)) {
    return next(new Error('Authentication error'));
  }
  socket.data.userId = extractUserId(token);
  next();
});

// Connection handling
io.on('connection', (socket) => {
  const userId = socket.data.userId;

  // Join user's personal room
  socket.join(`user:${userId}`);

  // Broadcast presence
  socket.broadcast.emit('presence:join', { userId });

  // Listen for typing indicators
  socket.on('comment:typing', (data) => {
    socket.to(`incident:${data.incidentId}`).emit('comment:typing', {
      userId,
      incidentId: data.incidentId
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    socket.broadcast.emit('presence:leave', { userId });
  });
});

// Broadcast new incident to all connected clients
export function broadcastIncidentCreated(incident: Incident) {
  io.emit('incident:created', incident);
}

// Notify specific users
export function notifyUsers(userIds: string[], event: string, data: any) {
  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit(event, data);
  });
}
```

**Client (React):**
```typescript
import { io, Socket } from 'socket.io-client';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    const newSocket = io('http://localhost:4001', {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('incident:created', (incident) => {
      // Add to local state
      incidentStore.getState().addIncident(incident);
      // Show toast notification
      toast.success(`New incident: ${incident.title}`);
    });

    newSocket.on('incident:escalated', (data) => {
      // Update local state
      incidentStore.getState().updateIncident(data.id, { severity: data.newSeverity });
      // Desktop notification
      if (Notification.permission === 'granted') {
        new Notification('Incident Escalated', {
          body: `${data.title} escalated to ${data.newSeverity}`
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return socket;
}
```

---

#### 🐍 Slytherin: SignalR

**Server (.NET):**
```csharp
// Hubs/IncidentHub.cs
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

[Authorize]
public class IncidentHub : Hub
{
    private readonly IIncidentService _incidentService;

    public IncidentHub(IIncidentService incidentService)
    {
        _incidentService = incidentService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
        await Clients.Others.SendAsync("PresenceJoin", new { UserId = userId });
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        await Clients.Others.SendAsync("PresenceLeave", new { UserId = userId });
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinIncidentRoom(long incidentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"incident:{incidentId}");
    }

    public async Task SendTypingIndicator(long incidentId)
    {
        var userId = Context.UserIdentifier;
        await Clients.OthersInGroup($"incident:{incidentId}")
            .SendAsync("CommentTyping", new { UserId = userId, IncidentId = incidentId });
    }
}

// Startup configuration
builder.Services.AddSignalR();
app.MapHub<IncidentHub>("/hub/incidents");

// Broadcasting from service
public class IncidentService : IIncidentService
{
    private readonly IHubContext<IncidentHub> _hubContext;

    public async Task<Incident> CreateIncidentAsync(CreateIncidentDto dto)
    {
        var incident = // ... create incident

        // Broadcast to all connected clients
        await _hubContext.Clients.All
            .SendAsync("IncidentCreated", incident);

        return incident;
    }

    public async Task NotifyUsersAsync(List<string> userIds, string method, object data)
    {
        foreach (var userId in userIds)
        {
            await _hubContext.Clients.Group($"user:{userId}")
                .SendAsync(method, data);
        }
    }
}
```

**Client (Angular):**
```typescript
// services/signalr.service.ts
import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection: signalR.HubConnection;
  private incidentCreated$ = new BehaviorSubject<Incident | null>(null);

  constructor(private authService: AuthService) {}

  public startConnection(): void {
    const token = this.authService.getToken();

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:4002/hub/incidents', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => console.log('SignalR connected'))
      .catch(err => console.error('SignalR connection error', err));

    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.hubConnection.on('IncidentCreated', (incident: Incident) => {
      this.incidentCreated$.next(incident);
    });

    this.hubConnection.on('IncidentEscalated', (data: any) => {
      // Handle escalation
      this.showNotification(`Incident escalated to ${data.newSeverity}`);
    });
  }

  public joinIncidentRoom(incidentId: number): void {
    this.hubConnection.invoke('JoinIncidentRoom', incidentId);
  }

  public sendTypingIndicator(incidentId: number): void {
    this.hubConnection.invoke('SendTypingIndicator', incidentId);
  }

  public getIncidentCreatedObservable() {
    return this.incidentCreated$.asObservable();
  }
}
```

---

#### 🦅 Ravenclaw: STOMP over WebSocket

**Server (Spring Boot):**
```java
// config/WebSocketConfig.java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOrigins("http://localhost:3003")
            .withSockJS();
    }
}

// controller/WebSocketController.java
@Controller
public class WebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/incident.typing")
    @SendTo("/topic/incident/{incidentId}")
    public TypingIndicator handleTyping(
        @DestinationVariable Long incidentId,
        Principal principal
    ) {
        return new TypingIndicator(principal.getName(), incidentId);
    }
}

// Broadcasting from service
@Service
public class IncidentService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Incident createIncident(CreateIncidentDto dto) {
        Incident incident = // ... save incident

        // Broadcast to all subscribers
        messagingTemplate.convertAndSend("/topic/incidents", incident);

        return incident;
    }

    public void notifyUser(String userId, String destination, Object payload) {
        messagingTemplate.convertAndSendToUser(
            userId,
            destination,
            payload
        );
    }
}
```

**Client (JavaScript with SockJS):**
```javascript
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.stompClient = null;
  }

  connect(token) {
    const socket = new SockJS('http://localhost:4003/ws');
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect(
      { Authorization: `Bearer ${token}` },
      (frame) => {
        console.log('WebSocket connected', frame);
        this.subscribeToTopics();
      },
      (error) => {
        console.error('WebSocket error', error);
      }
    );
  }

  subscribeToTopics() {
    // Subscribe to all incidents
    this.stompClient.subscribe('/topic/incidents', (message) => {
      const incident = JSON.parse(message.body);
      this.handleIncidentCreated(incident);
    });

    // Subscribe to user-specific queue
    this.stompClient.subscribe('/user/queue/notifications', (message) => {
      const notification = JSON.parse(message.body);
      this.handleNotification(notification);
    });
  }

  joinIncidentRoom(incidentId) {
    this.stompClient.subscribe(`/topic/incident/${incidentId}`, (message) => {
      const data = JSON.parse(message.body);
      this.handleIncidentUpdate(data);
    });
  }

  sendTypingIndicator(incidentId) {
    this.stompClient.send(
      '/app/incident.typing',
      {},
      JSON.stringify({ incidentId })
    );
  }
}
```

---

### WebSocket Event Catalog

| Event Name | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `incident:created` | Server → Client | `Incident` | New incident reported |
| `incident:updated` | Server → Client | `{ id, changes }` | Incident modified |
| `incident:escalated` | Server → Client | `{ id, oldSeverity, newSeverity }` | Severity increased |
| `incident:resolved` | Server → Client | `{ id, resolvedBy }` | Incident marked resolved |
| `comment:added` | Server → Client | `Comment` | New comment on incident |
| `comment:typing` | Client → Server → Clients | `{ userId, incidentId }` | User typing comment |
| `presence:join` | Server → Clients | `{ userId }` | User connected |
| `presence:leave` | Server → Clients | `{ userId }` | User disconnected |
| `notification:push` | Server → Client | `Notification` | Alert for user |

---

## Authentication & Authorization

### JWT-Based Flow (Gryffindor, Ravenclaw)

```
┌────────┐                                    ┌────────┐
│ Client │                                    │ Server │
└───┬────┘                                    └───┬────┘
    │                                             │
    │ POST /api/auth/login                        │
    │ { email, password }                         │
    ├────────────────────────────────────────────>│
    │                                             │
    │                                  Verify credentials
    │                                  Generate JWT access token (1h expiry)
    │                                  Generate refresh token (30d)
    │                                             │
    │ 200 OK                                      │
    │ { accessToken, refreshToken, user }         │
    │<────────────────────────────────────────────┤
    │                                             │
Store tokens in                                  │
localStorage/cookie                              │
    │                                             │
    │ GET /api/incidents                          │
    │ Authorization: Bearer <accessToken>         │
    ├────────────────────────────────────────────>│
    │                                             │
    │                                  Verify JWT signature
    │                                  Extract user claims
    │                                  Check authorization
    │                                             │
    │ 200 OK [incidents]                          │
    │<────────────────────────────────────────────┤
    │                                             │
    │ (After 1 hour, token expires)               │
    │                                             │
    │ GET /api/incidents                          │
    │ Authorization: Bearer <expired token>       │
    ├────────────────────────────────────────────>│
    │                                             │
    │                                  Token expired
    │ 401 Unauthorized                            │
    │<────────────────────────────────────────────┤
    │                                             │
    │ POST /api/auth/refresh                      │
    │ { refreshToken }                            │
    ├────────────────────────────────────────────>│
    │                                             │
    │                                  Verify refresh token
    │                                  Generate new access token
    │                                  Rotate refresh token (optional)
    │                                             │
    │ 200 OK                                      │
    │ { accessToken, refreshToken }               │
    │<────────────────────────────────────────────┤
```

**JWT Payload Structure:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "harry.potter@hogwarts.edu",
  "role": "AUROR",
  "iat": 1706889600,
  "exp": 1706893200,
  "jti": "unique-token-id"
}
```

---

### Cookie-Based Session (Slytherin Alternative)

```
┌────────┐                                    ┌────────┐
│ Client │                                    │ Server │
└───┬────┘                                    └───┬────┘
    │                                             │
    │ POST /api/auth/login                        │
    │ { email, password }                         │
    ├────────────────────────────────────────────>│
    │                                             │
    │                                  Verify credentials
    │                                  Create session in DB
    │                                  Generate session token
    │                                             │
    │ 200 OK                                      │
    │ Set-Cookie: sessionId=abc123;               │
    │   HttpOnly; Secure; SameSite=Strict         │
    │<────────────────────────────────────────────┤
    │                                             │
Browser automatically                            │
includes cookie                                  │
    │                                             │
    │ GET /api/incidents                          │
    │ Cookie: sessionId=abc123                    │
    ├────────────────────────────────────────────>│
    │                                             │
    │                                  Lookup session in DB/Redis
    │                                  Validate expiry
    │                                  Load user from session
    │                                             │
    │ 200 OK [incidents]                          │
    │<────────────────────────────────────────────┤
```

**Advantages:**
- HttpOnly cookie prevents XSS attacks
- CSRF protection required (CSRF tokens)
- Revocable sessions (delete from database)

**Disadvantages:**
- Requires server-side storage (Redis recommended)
- Doesn't work well for mobile apps
- CORS complexity

---

### Role-Based Access Control (RBAC) Implementation

#### Middleware (Express)
```typescript
export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        actual: req.user.role
      });
    }

    next();
  };
}

// Usage
router.delete('/incidents/:id',
  authenticate,
  requireRole('AUROR'),
  IncidentController.delete
);
```

#### Attribute-Based (.NET)
```csharp
[Authorize(Roles = "AUROR")]
[HttpDelete("incidents/{id}")]
public async Task<IActionResult> DeleteIncident(long id)
{
    await _incidentService.DeleteAsync(id);
    return NoContent();
}

// Custom policy
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanEscalateToUnforgivable", policy =>
        policy.RequireRole("AUROR"));

    options.AddPolicy("CanViewAnalytics", policy =>
        policy.RequireAssertion(context =>
            context.User.IsInRole("AUROR") ||
            context.User.IsInRole("PREFECT")));
});

[Authorize(Policy = "CanEscalateToUnforgivable")]
[HttpPatch("incidents/{id}/escalate")]
public async Task<IActionResult> Escalate(long id, EscalateDto dto) { }
```

#### Annotation-Based (Spring)
```java
@PreAuthorize("hasRole('AUROR')")
@DeleteMapping("/incidents/{id}")
public ResponseEntity<Void> deleteIncident(@PathVariable Long id) {
    incidentService.delete(id);
    return ResponseEntity.noContent().build();
}

// Method-level security
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/incidents/**").authenticated()
                .requestMatchers("/api/analytics/**").hasAnyRole("PREFECT", "AUROR")
                .anyRequest().denyAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt());
        return http.build();
    }
}
```

---

## Deployment Architecture

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  # Shared Database (Gringotts Vault)
  postgres:
    image: postgres:16-alpine
    container_name: marauders-map-db
    environment:
      POSTGRES_DB: marauders_map
      POSTGRES_USER: hogwarts
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./gringotts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hogwarts"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis (for caching, sessions, pub/sub)
  redis:
    image: redis:7-alpine
    container_name: marauders-map-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Gryffindor Backend (Express)
  gryffindor-api:
    build:
      context: ./gryffindor/backend
      dockerfile: Dockerfile
    container_name: gryffindor-api
    environment:
      NODE_ENV: production
      PORT: 4001
      DATABASE_URL: postgresql://hogwarts:${DB_PASSWORD:-password}@postgres:5432/marauders_map
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "4001:4001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:4001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Gryffindor Frontend (React)
  gryffindor-web:
    build:
      context: ./gryffindor/frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:4001
    container_name: gryffindor-web
    ports:
      - "3001:80"
    depends_on:
      - gryffindor-api

  # Slytherin Backend (.NET)
  slytherin-api:
    build:
      context: ./slytherin/backend
      dockerfile: Dockerfile
    container_name: slytherin-api
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__DefaultConnection: "Host=postgres;Database=marauders_map;Username=hogwarts;Password=${DB_PASSWORD:-password}"
      Redis__Configuration: redis:6379
      Jwt__Secret: ${JWT_SECRET}
    ports:
      - "4002:80"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Slytherin Frontend (Angular)
  slytherin-web:
    build:
      context: ./slytherin/frontend
      dockerfile: Dockerfile
      args:
        API_URL: http://localhost:4002
    container_name: slytherin-web
    ports:
      - "3002:80"
    depends_on:
      - slytherin-api

  # Ravenclaw (Spring Boot - monolith)
  ravenclaw:
    build:
      context: ./ravenclaw
      dockerfile: Dockerfile
    container_name: ravenclaw
    environment:
      SPRING_PROFILES_ACTIVE: production
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/marauders_map
      SPRING_DATASOURCE_USERNAME: hogwarts
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD:-password}
      SPRING_REDIS_HOST: redis
      SPRING_REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "4003:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:

networks:
  default:
    name: hogwarts-network
```

### Multi-Stage Dockerfile Examples

**Gryffindor Frontend (React + Vite):**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Slytherin Backend (.NET):**
```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["MaraudersMap.API/MaraudersMap.API.csproj", "MaraudersMap.API/"]
COPY ["MaraudersMap.Core/MaraudersMap.Core.csproj", "MaraudersMap.Core/"]
COPY ["MaraudersMap.Infrastructure/MaraudersMap.Infrastructure.csproj", "MaraudersMap.Infrastructure/"]
RUN dotnet restore "MaraudersMap.API/MaraudersMap.API.csproj"
COPY . .
RUN dotnet build "MaraudersMap.API/MaraudersMap.API.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "MaraudersMap.API/MaraudersMap.API.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "MaraudersMap.API.dll"]
```

**Ravenclaw (Spring Boot):**
```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN ./mvnw dependency:go-offline
COPY src src
RUN ./mvnw package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## Development Workflow

### Getting Started (One Command)

```bash
# Clone repository
git clone https://github.com/hogwarts/marauders-map.git
cd marauders-map

# Set environment variables
cp .env.example .env
# Edit .env with your secrets

# Start all services
docker-compose up --build

# Application URLs:
# Gryffindor: http://localhost:3001
# Slytherin:  http://localhost:3002
# Ravenclaw:  http://localhost:3003
# Database:   postgresql://localhost:5432/marauders_map
```

### Local Development (Without Docker)

**Prerequisites:**
- Node.js 20+ (Gryffindor, Slytherin frontend)
- .NET 8 SDK (Slytherin backend)
- Java 21 + Maven (Ravenclaw)
- PostgreSQL 16
- Redis (optional for development)

**Database Setup:**
```bash
# Create database
createdb marauders_map

# Run migrations
psql marauders_map < gringotts/init.sql
```

**Gryffindor:**
```bash
cd gryffindor/backend
npm install
npm run dev # Runs on :4001

cd ../frontend
npm install
npm run dev # Runs on :3001
```

**Slytherin:**
```bash
cd slytherin/backend
dotnet restore
dotnet run # Runs on :4002

cd ../frontend
npm install
ng serve # Runs on :3002
```

**Ravenclaw:**
```bash
cd ravenclaw
./mvnw spring-boot:run # Runs on :4003
```

### Git Workflow

```
main
  ├── gryffindor/year-1
  ├── gryffindor/year-2
  ├── ...
  ├── slytherin/year-1
  ├── ...
  └── ravenclaw/year-1
```

**Branch Naming:**
- Feature: `gryffindor/year-3-realtime`
- Bugfix: `slytherin/fix-auth-token-expiry`
- Docs: `docs/update-api-contract`

**Commit Messages:**
```
[Gryffindor] Implement incident creation (Year 1)
[Slytherin] Add SignalR hub for real-time updates (Year 3)
[Ravenclaw] Configure Spring Security with JWT (Year 2)
[Shared] Update database schema for notifications table
[Docs] Add WebSocket event catalog to technical specs
```

---

## Testing Strategy

### Testing Pyramid

```
           ┌─────────────┐
          /   E2E Tests   \     10%
         /─────────────────\
        / Integration Tests \   30%
       /─────────────────────\
      /     Unit Tests        \ 60%
     ───────────────────────────
```

### Unit Tests

**Coverage Targets:**
- Business logic: 90%+
- Controllers/API: 70%+
- Utilities: 95%+

**Gryffindor (Jest):**
```typescript
// services/IncidentService.test.ts
import { IncidentService } from './IncidentService';
import { mockIncidentRepository } from '../test/mocks';

describe('IncidentService', () => {
  let service: IncidentService;
  let mockRepo: typeof mockIncidentRepository;

  beforeEach(() => {
    mockRepo = mockIncidentRepository;
    service = new IncidentService(mockRepo);
  });

  describe('createIncident', () => {
    it('should create incident with valid data', async () => {
      const dto = {
        title: 'Dark Mark sighting',
        severity: 'DANGEROUS',
        location: 'HOGWARTS'
      };

      mockRepo.create.mockResolvedValue({ id: 1, ...dto });

      const result = await service.createIncident(dto, 'user-123');

      expect(result.id).toBe(1);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: dto.title })
      );
    });

    it('should throw error for invalid severity', async () => {
      const dto = {
        title: 'Test',
        severity: 'INVALID',
        location: 'HOGWARTS'
      };

      await expect(service.createIncident(dto, 'user-123'))
        .rejects.toThrow('Invalid severity level');
    });
  });
});
```

**Slytherin (xUnit):**
```csharp
public class IncidentServiceTests
{
    private readonly Mock<IIncidentRepository> _mockRepo;
    private readonly IncidentService _service;

    public IncidentServiceTests()
    {
        _mockRepo = new Mock<IIncidentRepository>();
        _service = new IncidentService(_mockRepo.Object);
    }

    [Fact]
    public async Task CreateIncident_WithValidData_ReturnsIncident()
    {
        // Arrange
        var dto = new CreateIncidentDto
        {
            Title = "Dark Mark sighting",
            Severity = SeverityLevel.DANGEROUS,
            Location = LocationType.HOGWARTS
        };
        var userId = Guid.NewGuid();

        _mockRepo.Setup(r => r.CreateAsync(It.IsAny<Incident>()))
            .ReturnsAsync((Incident i) => i);

        // Act
        var result = await _service.CreateIncidentAsync(dto, userId);

        // Assert
        Assert.Equal(dto.Title, result.Title);
        _mockRepo.Verify(r => r.CreateAsync(
            It.Is<Incident>(i => i.ReportedBy == userId)
        ), Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task CreateIncident_WithEmptyTitle_ThrowsValidationException(
        string title
    )
    {
        // Arrange
        var dto = new CreateIncidentDto { Title = title };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateIncidentAsync(dto, Guid.NewGuid())
        );
    }
}
```

### Integration Tests

**Gryffindor (Supertest):**
```typescript
import request from 'supertest';
import { app } from '../src/server';
import { setupTestDB, teardownTestDB } from './helpers/db';

describe('Incidents API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/incidents', () => {
    it('should create incident when authenticated', async () => {
      const token = await getAuthToken({ role: 'AUROR' });

      const response = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test incident',
          severity: 'SUSPICIOUS',
          location: 'HOGWARTS',
          description: 'Test description'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Test incident',
        severity: 'SUSPICIOUS'
      });
      expect(response.body.id).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      await request(app)
        .post('/api/incidents')
        .send({
          title: 'Test incident',
          severity: 'SUSPICIOUS',
          location: 'HOGWARTS'
        })
        .expect(401);
    });
  });
});
```

### End-to-End Tests

**Playwright (All Stacks):**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Incident Management Flow', () => {
  test('user can create, view, and resolve incident', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3001/login');
    await page.fill('[name="email"]', 'harry.potter@hogwarts.edu');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/dashboard/);

    // Create incident
    await page.click('button:has-text("Report Incident")');
    await page.fill('[name="title"]', 'E2E Test Incident');
    await page.selectOption('[name="severity"]', 'SUSPICIOUS');
    await page.selectOption('[name="location"]', 'HOGWARTS');
    await page.fill('[name="description"]', 'This is a test');
    await page.click('button:has-text("Submit")');

    // Verify incident appears
    await expect(page.locator('text=E2E Test Incident')).toBeVisible();

    // Click incident to view details
    await page.click('text=E2E Test Incident');
    await expect(page.locator('text=This is a test')).toBeVisible();

    // Resolve incident
    await page.click('button:has-text("Resolve")');
    await page.click('button:has-text("Confirm")');

    // Verify status changed
    await expect(page.locator('text=RESOLVED')).toBeVisible();
  });

  test('real-time updates work across tabs', async ({ browser }) => {
    // Create two contexts (different users or same user, two tabs)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login both
    await loginUser(page1, 'harry.potter@hogwarts.edu');
    await loginUser(page2, 'hermione.granger@hogwarts.edu');

    // Page 1 creates incident
    await createIncident(page1, {
      title: 'Real-time Test',
      severity: 'DANGEROUS'
    });

    // Page 2 should see it appear automatically
    await expect(page2.locator('text=Real-time Test'))
      .toBeVisible({ timeout: 5000 });
  });
});
```

### Performance Tests

**Artillery (Load Testing):**
```yaml
# artillery.yml
config:
  target: 'http://localhost:4001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 120
      arrivalRate: 50
      name: Sustained load
    - duration: 60
      arrivalRate: 100
      name: Spike

scenarios:
  - name: Create and list incidents
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@hogwarts.edu"
            password: "password"
          capture:
            - json: "$.accessToken"
              as: "token"

      - get:
          url: "/api/incidents?page=1&limit=20"
          headers:
            Authorization: "Bearer {{ token }}"
          expect:
            - statusCode: 200

      - post:
          url: "/api/incidents"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            title: "Load test incident"
            severity: "MISCHIEF"
            location: "HOGWARTS"
          expect:
            - statusCode: 201
```

**Run tests:**
```bash
artillery run artillery.yml
```

**Expected Results:**
- p95 latency < 200ms
- p99 latency < 500ms
- Error rate < 1%
- Throughput: 1000 req/sec

---

## Performance Optimization

### Database Optimization

**Indexes (Already in Schema):**
```sql
-- Composite index for common query pattern
CREATE INDEX idx_incidents_status_severity
ON incidents(status, severity)
WHERE deleted_at IS NULL;

-- Partial index for active incidents
CREATE INDEX idx_incidents_active
ON incidents(reported_at DESC)
WHERE status != 'ARCHIVED' AND deleted_at IS NULL;
```

**Query Optimization:**
```sql
-- Inefficient: N+1 query problem
SELECT * FROM incidents;
-- Then for each incident:
SELECT * FROM users WHERE id = incident.reported_by;

-- Optimized: Single query with join
SELECT
  i.*,
  u.first_name,
  u.last_name,
  u.house
FROM incidents i
JOIN users u ON i.reported_by = u.id
WHERE i.deleted_at IS NULL
ORDER BY i.reported_at DESC
LIMIT 20;
```

**Connection Pooling:**
- Gryffindor: `pg.Pool` with max 20 connections
- Slytherin: EF Core connection pooling (default)
- Ravenclaw: HikariCP (Spring Boot default)

### Caching Strategy

**Redis Cache Layers:**

```typescript
// L1: In-memory cache (application-level)
const incidentCache = new Map<number, Incident>();

// L2: Redis cache (shared across instances)
async function getIncident(id: number): Promise<Incident> {
  // Check L1
  if (incidentCache.has(id)) {
    return incidentCache.get(id)!;
  }

  // Check L2 (Redis)
  const cached = await redis.get(`incident:${id}`);
  if (cached) {
    const incident = JSON.parse(cached);
    incidentCache.set(id, incident); // Populate L1
    return incident;
  }

  // Query database
  const incident = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);

  // Populate caches
  await redis.setex(`incident:${id}`, 300, JSON.stringify(incident)); // 5 min TTL
  incidentCache.set(id, incident);

  return incident;
}
```

**Cache Invalidation:**
```typescript
async function updateIncident(id: number, updates: Partial<Incident>) {
  // Update database
  const updated = await db.query(
    'UPDATE incidents SET ... WHERE id = $1 RETURNING *',
    [id]
  );

  // Invalidate cache
  incidentCache.delete(id);
  await redis.del(`incident:${id}`);

  // Broadcast to invalidate other instances
  await redis.publish('cache:invalidate', JSON.stringify({ type: 'incident', id }));

  return updated;
}
```

### Frontend Performance

**Code Splitting (React):**
```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const IncidentDetail = lazy(() => import('./pages/IncidentDetail'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
```

**Virtual Scrolling (Large Lists):**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function IncidentList({ incidents }: { incidents: Incident[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: incidents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Row height
    overscan: 5
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <IncidentCard incident={incidents[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Security Considerations

### OWASP Top 10 Mitigations

| Threat | Mitigation |
|--------|------------|
| **A01: Broken Access Control** | Server-side authorization checks, role-based middleware |
| **A02: Cryptographic Failures** | HTTPS only, password hashing (bcrypt cost 12), JWT RS256 |
| **A03: Injection** | Parameterized queries, ORM usage, input validation |
| **A04: Insecure Design** | Threat modeling, secure defaults, principle of least privilege |
| **A05: Security Misconfiguration** | Security headers, disable debug in prod, CORS whitelist |
| **A06: Vulnerable Components** | Dependabot, npm audit, Snyk scans |
| **A07: Authentication Failures** | MFA support (future), rate limiting, secure session management |
| **A08: Data Integrity Failures** | CSRF tokens, signed JWTs, integrity checks |
| **A09: Logging Failures** | Structured logging, audit trail, anomaly detection |
| **A10: SSRF** | URL validation, internal network isolation |

### Security Headers

```typescript
// Express middleware
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws://localhost:4001"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

---

## Appendix: File Structure Overview

```
hogwarts/
├── .github/
│   └── workflows/
│       ├── gryffindor-ci.yml
│       ├── slytherin-ci.yml
│       └── ravenclaw-ci.yml
├── contracts/
│   ├── openapi.yml
│   └── websocket-events.md
├── gringotts/
│   ├── init.sql
│   ├── seed.sql
│   └── migrations/
├── gryffindor/
│   ├── frontend/
│   ├── backend/
│   ├── docker-compose.dev.yml
│   └── README.md
├── slytherin/
│   ├── frontend/
│   ├── backend/
│   ├── docker-compose.dev.yml
│   └── README.md
├── ravenclaw/
│   ├── src/
│   ├── pom.xml
│   ├── docker-compose.dev.yml
│   └── README.md
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL-SPECS.md
│   ├── architecture/
│   │   ├── system-diagram.mmd
│   │   └── database-erd.mmd
│   └── tutorials/
│       ├── year-1-getting-started.md
│       └── ...
├── docker-compose.yml
├── .env.example
├── README.md
└── LICENSE
```

---

**Document Version:** 1.0
**Last Updated:** February 2, 2026
**Next Review:** March 2, 2026

---

*"Wit beyond measure is man's greatest treasure." — Rowena Ravenclaw*
