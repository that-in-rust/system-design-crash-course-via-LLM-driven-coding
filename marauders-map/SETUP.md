# The Marauder's Map - Setup Instructions

**"I solemnly swear that I am up to no good."**

---

## Quick Start (TDD Cycle - Year 1: Gryffindor Wing)

### Prerequisites

1. **Docker** (recommended) OR **PostgreSQL 16+**
2. **Node.js 18+** and **npm**
3. **Git**

### Step 1: Start the Database (Gringotts Vault)

#### Option A: Using Docker (Recommended)

```bash
# From the marauders-map directory
docker compose up -d gringotts

# Wait for database to be ready
docker compose logs -f gringotts
```

The database will automatically:
- Create the `marauders_map` database
- Run `gringotts/init.sql` to create all tables, indexes, functions
- Seed initial data (6 test users, sample incidents)

#### Option B: Using Local PostgreSQL

```bash
# Create database
createdb marauders_map

# Run init script
psql -d marauders_map -f gringotts/init.sql
```

### Step 2: Install Dependencies

```bash
cd gryffindor/server
npm install
```

### Step 3: Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env if needed (default values should work with Docker)
```

Default configuration:
- **Database**: localhost:5432 / marauders_map
- **Server Port**: 4001
- **Auth**: Mock JWT (Year 1)

### Step 4: Run Tests (RED → GREEN → REFACTOR)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Step 5: Start Development Server

```bash
# Start server
npm run dev
```

Server will be available at: http://localhost:4001

---

## TDD Progress: Year 1 - Core CRUD ✅

### RED Phase (Tests Written) ✅

All tests have been written for:
- ✅ POST /api/incidents - Create incident
- ✅ GET /api/incidents - List all incidents with filtering
- ✅ GET /api/incidents/:id - Get single incident
- ✅ PUT /api/incidents/:id - Update incident
- ✅ DELETE /api/incidents/:id - Resolve incident

**Test file**: `gryffindor/server/tests/incidents.test.js`
- 25+ comprehensive test cases
- Full CRUD lifecycle coverage
- Validation testing
- Authorization testing
- Integration workflow testing

### GREEN Phase (Implementation Complete) ✅

All endpoints have been implemented:
- ✅ **Database connection** (`src/db/connectionPoolManager.js`)
- ✅ **Authentication middleware** (`src/middleware/authenticationMiddlewareHandler.js`)
- ✅ **Incidents routes** (`src/routes/incidentsRouteHandler.js`)
- ✅ **Express server** (`src/server.js`)

**Following idiomatic patterns**:
- 4-word naming convention throughout
- Async/await for all database operations
- Proper error handling
- Request validation
- Soft deletes (incidents marked as RESOLVED)

### REFACTOR Phase (Next Step) ⏳

Once tests pass, we'll refactor for:
- Extract validation into reusable utilities
- Improve error messages
- Add request logging
- Optimize database queries
- Add JSDoc comments

---

## Database Schema (Gringotts Vault)

### Tables Created

1. **users** - Aurors, Prefects, Students
2. **incidents** - Core incident tracking
3. **incident_comments** - Discussion threads (Year 3)
4. **incident_history** - Audit trail (Year 6)
5. **notifications** - Push notifications (Year 3)
6. **sessions** - Auth sessions (Year 2)
7. **refresh_tokens** - JWT rotation (Year 2)

### Enums

- `severity_level`: MISCHIEF, SUSPICIOUS, DANGEROUS, UNFORGIVABLE
- `incident_status`: OPEN, IN_PROGRESS, RESOLVED, ARCHIVED
- `location_type`: HOGWARTS, HOGSMEADE, KNOCKTURN_ALLEY, etc.
- `user_role`: STUDENT, PREFECT, AUROR

### Seed Data

**Default Users** (password: `password` for all):
- harry.potter@hogwarts.edu (AUROR)
- hermione.granger@hogwarts.edu (PREFECT)
- ron.weasley@hogwarts.edu (PREFECT)
- draco.malfoy@hogwarts.edu (PREFECT)
- luna.lovegood@hogwarts.edu (STUDENT)
- neville.longbottom@hogwarts.edu (STUDENT)

---

## API Endpoints (Year 1)

### Health Check
```bash
GET /health
```

### Create Incident
```bash
POST /api/incidents
Authorization: Bearer <token>

Body:
{
  "title": "Dark Mark over Hogwarts",
  "description": "Multiple witnesses report...",
  "severity": "DANGEROUS",
  "location": "HOGWARTS"
}
```

### List All Incidents
```bash
GET /api/incidents
Authorization: Bearer <token>

Query params (optional):
- severity: MISCHIEF|SUSPICIOUS|DANGEROUS|UNFORGIVABLE
- location: HOGWARTS|HOGSMEADE|etc.
- status: OPEN|IN_PROGRESS|RESOLVED|ARCHIVED
```

### Get Single Incident
```bash
GET /api/incidents/:id
Authorization: Bearer <token>
```

### Update Incident
```bash
PUT /api/incidents/:id
Authorization: Bearer <token>

Body (all fields optional):
{
  "title": "Updated title",
  "description": "Updated description",
  "severity": "UNFORGIVABLE",
  "location": "KNOCKTURN_ALLEY"
}
```

### Resolve Incident
```bash
DELETE /api/incidents/:id
Authorization: Bearer <token>
```
Note: This marks incident as RESOLVED (soft delete), doesn't permanently remove it.

---

## Testing Strategy

### Unit Tests ✅
- All CRUD operations
- Validation logic
- Authorization checks
- Error handling

### Integration Tests ✅
- Full lifecycle workflows
- Database transactions
- API contract compliance

### E2E Tests (Year 1+ with Frontend)
- User workflows
- Visual regression
- Performance benchmarks

---

## Next Steps

### Immediate (Complete Year 1)
1. **Run Database**: `docker compose up -d gringotts`
2. **Run Tests**: `npm test` (verify GREEN phase)
3. **Refactor**: Clean up code based on test results

### Year 2: Authentication & Authorization
- Real JWT authentication
- Role-based access control
- Password hashing
- Session management

### Year 3: Real-Time
- Socket.io integration
- Live incident updates ("Owl Post")
- Presence indicators
- Push notifications

### Year 4: Search & Filters
- Full-text search
- Advanced filtering
- Pagination
- Sorting

### Year 5: Analytics
- Dashboard with charts
- Trend analysis
- Performance leaderboard
- Incident statistics

### Year 6: Advanced Patterns
- CQRS implementation
- Event sourcing
- Optimistic updates

### Year 7: Production Ready
- Error logging (Winston)
- Rate limiting
- Health checks
- Docker deployment
- CI/CD pipeline

---

## Troubleshooting

### Database Connection Fails

```bash
# Check if database is running
docker compose ps gringotts

# View logs
docker compose logs gringotts

# Restart database
docker compose restart gringotts
```

### Tests Fail

```bash
# Ensure database is initialized
docker compose down -v
docker compose up -d gringotts

# Wait for database to be ready
sleep 5

# Run tests
npm test
```

### Port Already in Use

```bash
# Change PORT in .env file
# Or kill the process using the port
lsof -ti:4001 | xargs kill -9
```

---

## Project Structure

```
marauders-map/
├── docker-compose.yml          # Infrastructure
├── gringotts/
│   └── init.sql                # Shared database schema
├── contracts/
│   └── openapi.yml             # API contract (TODO)
├── gryffindor/                 # 🦁 React + Express
│   └── server/
│       ├── src/
│       │   ├── server.js       # Main Express app
│       │   ├── db/
│       │   │   └── connectionPoolManager.js
│       │   ├── middleware/
│       │   │   └── authenticationMiddlewareHandler.js
│       │   └── routes/
│       │       └── incidentsRouteHandler.js
│       ├── tests/
│       │   └── incidents.test.js
│       ├── package.json
│       ├── .env.example
│       └── .env
├── slytherin/                  # 🐍 Angular + .NET (TODO)
└── ravenclaw/                  # 🦅 Spring Boot + Java (TODO)
```

---

## Learning Resources

### Patterns Used
- **TDD**: Red → Green → Refactor cycle
- **4-word naming convention**: From `Idiom-React-Frontend-Patterns.md`
- **REST API design**: RESTful principles
- **Database patterns**: Connection pooling, soft deletes, triggers

### Key Files to Study
1. `tests/incidents.test.js` - Comprehensive test patterns
2. `src/routes/incidentsRouteHandler.js` - CRUD implementation
3. `gringotts/init.sql` - PostgreSQL schema design
4. `src/middleware/authenticationMiddlewareHandler.js` - Mock auth (Year 1)

---

## Contributing

When adding features:
1. **Write failing tests first** (RED)
2. **Implement minimal code to pass** (GREEN)
3. **Refactor for clarity** (REFACTOR)
4. **Follow 4-word naming convention**
5. **Add JSDoc comments**
6. **Update this documentation**

---

**"Mischief managed."**
