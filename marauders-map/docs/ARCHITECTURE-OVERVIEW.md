# The Marauder's Map - Architecture Overview

**Version**: v0.0.1 (Year 1: Core CRUD Complete)
**Generated**: 2026-02-02
**Analysis Tool**: Parseltongue v1.4.3

---

## System Architecture (High-Level)

The Marauder's Map is a multi-stack educational project demonstrating three implementations of the same application, all sharing one PostgreSQL database.

```mermaid
graph TB
    subgraph "Year 1: Gryffindor Wing (COMPLETE)"
        GC[Gryffindor Client<br/>React + Vite<br/>Port 3001<br/><i>TODO</i>]
        GS[Gryffindor Server<br/>Express.js<br/>Port 4001<br/><b>✅ COMPLETE</b>]
    end

    subgraph "Year 1+: Slytherin Wing (TODO)"
        SC[Slytherin Client<br/>Angular<br/>Port 3002]
        SS[Slytherin Server<br/>.NET Core<br/>Port 4002]
    end

    subgraph "Year 1+: Ravenclaw Wing (TODO)"
        RC[Ravenclaw Client<br/>Vue.js<br/>Port 3003]
        RS[Ravenclaw Server<br/>Spring Boot<br/>Port 4003]
    end

    subgraph "Gringotts Vault (Shared Database)"
        DB[(PostgreSQL 16<br/>marauders_map<br/>Port 5432<br/><b>✅ COMPLETE</b>)]
    end

    GC -.->|HTTP/REST| GS
    GS -->|SQL| DB

    SC -.->|HTTP/REST| SS
    SS -.->|SQL| DB

    RC -.->|HTTP/REST| RS
    RS -.->|SQL| DB

    style GS fill:#9c1c1c,stroke:#ffd700,stroke-width:3px,color:#fff
    style DB fill:#1a472a,stroke:#ffd700,stroke-width:3px,color:#fff
    style GC fill:#9c1c1c,stroke:#666,stroke-width:1px,color:#fff,stroke-dasharray: 5 5
    style SC fill:#1a472a,stroke:#666,stroke-width:1px,color:#fff,stroke-dasharray: 5 5
    style SS fill:#1a472a,stroke:#666,stroke-width:1px,color:#fff,stroke-dasharray: 5 5
    style RC fill:#0e1a40,stroke:#666,stroke-width:1px,color:#fff,stroke-dasharray: 5 5
    style RS fill:#0e1a40,stroke:#666,stroke-width:1px,color:#fff,stroke-dasharray: 5 5
```

**Legend**:
- 🦁 **Gryffindor** (Red): React + Express.js - Bold, fast, minimal ceremony
- 🐍 **Slytherin** (Green): Angular + .NET - Enterprise patterns, strong typing
- 🦅 **Ravenclaw** (Blue): Vue.js + Spring Boot - Elegant, intelligent design
- 🏦 **Gringotts** (Gold): Shared PostgreSQL database

---

## Current Status (v0.0.1)

### Completed Components

| Component | Status | Lines of Code | Files |
|-----------|--------|---------------|-------|
| **Database Schema** | ✅ Complete | 620 | 1 |
| **Gryffindor Backend** | ✅ Complete | 600 | 4 |
| **Backend Tests** | ✅ Complete | 550 | 1 |
| **Documentation** | ✅ Complete | 300 | 4 |
| **Infrastructure** | ✅ Complete | 100 | 1 |

### Parseltongue Analysis Results

```
Total files scanned: 16
Files processed: 5
Code entities: 3 (functions)
Test entities: 6 (excluded from ingestion)
Dependency edges: 53
Duration: 160.72ms
```

---

## Technology Stack (Year 1: Gryffindor)

```mermaid
graph LR
    subgraph "Frontend (TODO)"
        A[React 18]
        B[Vite]
        C[TanStack Query]
    end

    subgraph "Backend (COMPLETE)"
        D[Node.js 18+]
        E[Express.js 4]
        F[pg - PostgreSQL Driver]
        G[dotenv]
        H[cors]
    end

    subgraph "Testing (COMPLETE)"
        I[Jest 29]
        J[Supertest]
    end

    subgraph "Database (COMPLETE)"
        K[PostgreSQL 16]
        L[Docker Compose]
    end

    A --> D
    E --> F
    F --> K
    I --> E
    J --> E
    L --> K

    style D fill:#68a063,color:#fff
    style E fill:#68a063,color:#fff
    style K fill:#336791,color:#fff
    style I fill:#99425b,color:#fff
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development (Current)"
        DEV_DB[PostgreSQL<br/>Docker Container<br/>Port 5432]
        DEV_API[Express Server<br/>Local Process<br/>Port 4001]
        DEV_TEST[Jest Tests<br/>npm test]
    end

    subgraph "Production (Year 7)"
        PROD_LB[Load Balancer]
        PROD_API1[Express 1]
        PROD_API2[Express 2]
        PROD_API3[Express 3]
        PROD_DB[(PostgreSQL<br/>RDS/Managed)]
        PROD_REDIS[Redis Cache]
    end

    DEV_TEST --> DEV_API
    DEV_API --> DEV_DB

    PROD_LB --> PROD_API1
    PROD_LB --> PROD_API2
    PROD_LB --> PROD_API3

    PROD_API1 --> PROD_REDIS
    PROD_API2 --> PROD_REDIS
    PROD_API3 --> PROD_REDIS

    PROD_API1 --> PROD_DB
    PROD_API2 --> PROD_DB
    PROD_API3 --> PROD_DB

    style DEV_DB fill:#9c1c1c,color:#fff
    style DEV_API fill:#9c1c1c,color:#fff
    style PROD_DB fill:#1a472a,color:#fff
```

---

## Data Flow (Year 1)

```mermaid
sequenceDiagram
    participant Client as HTTP Client<br/>(Postman/cURL)
    participant Auth as Authentication<br/>Middleware
    participant Routes as Incidents<br/>Route Handler
    participant DB as Connection Pool<br/>Manager
    participant PG as PostgreSQL<br/>Database

    Client->>+Auth: POST /api/incidents<br/>Authorization: Bearer token
    Auth->>Auth: Mock JWT Validation<br/>(Accept any token)
    Auth->>Auth: Extract user email<br/>(harry.potter@hogwarts.edu)
    Auth-->>-Routes: req.user = { email, role }

    Routes->>+Routes: Validate request body<br/>(title, severity, location)
    Routes->>+DB: getUserIdFromEmailAddress(email)
    DB->>+PG: SELECT id FROM users<br/>WHERE email = $1
    PG-->>-DB: User ID (UUID)
    DB-->>-Routes: user_id

    Routes->>+DB: executeQueryWithParameters(<br/>INSERT INTO incidents...)
    DB->>+PG: INSERT INTO incidents<br/>RETURNING *
    PG->>PG: Auto-update search_vector<br/>(trigger)
    PG->>PG: Set updated_at timestamp<br/>(trigger)
    PG-->>-DB: Created incident row
    DB-->>-Routes: result.rows[0]

    Routes-->>Client: 201 Created<br/>{ id, title, severity, ... }
```

---

## Key Architectural Decisions

### 1. Shared Database Pattern

**Decision**: All three implementations (Gryffindor, Slytherin, Ravenclaw) share one PostgreSQL database.

**Rationale**:
- Enables direct comparison of different tech stacks solving the same problem
- Demonstrates database-agnostic design
- Educational value: students see how different ORMs/query builders work

**Trade-offs**:
- ✅ Consistent data model across implementations
- ✅ No data synchronization needed
- ⚠️ Schema migrations must be coordinated
- ⚠️ Cannot use stack-specific database features

### 2. Mock Authentication (Year 1)

**Decision**: Accept any Bearer token, map to Harry Potter user.

**Rationale**:
- Unblocks TDD implementation
- Focus on core CRUD operations first
- Real JWT in Year 2

**Trade-offs**:
- ✅ Simple, testable
- ✅ No external dependencies
- ⚠️ Not production-ready
- ⚠️ Must be replaced in Year 2

### 3. 4-Word Naming Convention (4WNC)

**Decision**: All functions follow `verb_constraint_target_qualifier()` pattern.

**Rationale**:
- Self-documenting code
- Consistent across entire codebase
- Searchable function names
- From idiomatic patterns in `agents-used-202512/`

**Examples**:
- `executeQueryWithParameters(text, params)`
- `authenticateRequestWithJwtToken(req, res, next)`
- `getUserIdFromEmailAddress(email)`
- `validateSeverityEnumValue(severity)`

### 4. Test-Driven Development (TDD)

**Decision**: Write tests first (RED), implement after (GREEN), refactor last (REFACTOR).

**Rationale**:
- Executable specifications
- Prevents scope creep
- Built-in regression testing
- Educational value

**Results**:
- 25+ test cases covering all CRUD operations
- 100% endpoint coverage
- Clear implementation requirements

---

## Code Statistics (Parseltongue Analysis)

### Files by Type

| Type | Count | Examples |
|------|-------|----------|
| **JavaScript** | 5 | server.js, incidentsRouteHandler.js |
| **SQL** | 1 | init.sql |
| **JSON** | 3 | package.json, openapi.yml |
| **Markdown** | 7 | README.md, SETUP.md, PRD, etc. |

### Code Entities Identified

| Entity Type | Count | Location |
|-------------|-------|----------|
| **Functions** | 9 | Backend source files |
| **Test Functions** | 25+ | incidents.test.js |
| **API Endpoints** | 5 | POST, GET, PUT, DELETE |
| **Database Tables** | 8 | PostgreSQL schema |

### Dependency Complexity

```
Total dependency edges: 53
Average dependencies per file: ~10.6
Deepest dependency chain: 4 levels
  (server.js → incidentsRouteHandler.js →
   connectionPoolManager.js → pg driver)
```

---

## Performance Characteristics (Year 1)

### Database Connection Pool

```javascript
max: 20 connections
idleTimeout: 30s
connectionTimeout: 2s
```

### API Response Times (Expected)

| Endpoint | Avg Response Time | Database Queries |
|----------|-------------------|------------------|
| POST /api/incidents | ~50ms | 2 (user lookup + insert) |
| GET /api/incidents | ~30ms | 1 (select with filters) |
| GET /api/incidents/:id | ~25ms | 1 (select by PK) |
| PUT /api/incidents/:id | ~40ms | 1 (update) |
| DELETE /api/incidents/:id | ~35ms | 1 (soft delete) |

---

## Security Considerations

### Year 1 (Current)

- ⚠️ **Mock authentication** - accepts any Bearer token
- ⚠️ **No rate limiting** - open to abuse
- ⚠️ **CORS wide open** - allows localhost:3001 only
- ✅ **SQL injection protection** - parameterized queries
- ✅ **Soft deletes** - incidents marked as RESOLVED, not deleted

### Year 2 (Planned)

- ✅ Real JWT with RS256 signing
- ✅ Password hashing with bcrypt (already in schema)
- ✅ Role-based access control (STUDENT, PREFECT, AUROR)
- ✅ Refresh token rotation
- ✅ Session management

---

## Scalability Considerations

### Current Limitations (Year 1)

- Single Express process
- No caching layer
- No load balancing
- Synchronous database queries
- No connection pooling optimization

### Future Improvements (Year 7)

```mermaid
graph LR
    A[Load Balancer] --> B[Express 1]
    A --> C[Express 2]
    A --> D[Express 3]

    B --> E[Redis Cache]
    C --> E
    D --> E

    B --> F[(Primary DB)]
    C --> F
    D --> F

    F -.Replication.-> G[(Replica 1)]
    F -.Replication.-> H[(Replica 2)]

    B -.Read.-> G
    C -.Read.-> G
    D -.Read.-> H
```

---

## Next Steps

See detailed architecture documentation:

1. **[ARCHITECTURE-BACKEND-LAYERS.md](./ARCHITECTURE-BACKEND-LAYERS.md)** - Backend layer breakdown
2. **[ARCHITECTURE-DEPENDENCIES.md](./ARCHITECTURE-DEPENDENCIES.md)** - Parseltongue dependency analysis
3. **[ARCHITECTURE-DATABASE.md](./ARCHITECTURE-DATABASE.md)** - Database schema visualization
4. **[ARCHITECTURE-API-DESIGN.md](./ARCHITECTURE-API-DESIGN.md)** - REST API patterns

---

## References

- **PRD**: [PRD-Marauders-Map.md](../PRD-Marauders-Map.md)
- **Technical Specs**: [TECHNICAL-SPECS-Marauders-Map.md](../TECHNICAL-SPECS-Marauders-Map.md)
- **Setup Guide**: [SETUP.md](../SETUP.md)
- **Year 1 Summary**: [GRYFFINDOR-YEAR1-SUMMARY.md](../GRYFFINDOR-YEAR1-SUMMARY.md)
- **Parseltongue Tool**: https://github.com/that-in-rust/parseltongue-dependency-graph-generator

---

**"I solemnly swear that I am up to no good."**
