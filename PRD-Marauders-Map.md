# Product Requirements Document: The Marauder's Map
## A Multi-Stack Educational Dark Activity Tracker

**Version:** 1.0
**Date:** February 2, 2026
**Status:** Draft for Review
**Project Codename:** Hogwarts Multi-Stack Academy

---

## Executive Summary

### Vision Statement

The Marauder's Map is an innovative educational platform that demonstrates full-stack application development across three distinct technology ecosystems by building the same magical incident tracking system three different ways. Named after the famous enchanted parchment from Harry Potter lore, this project reveals the "footprints" of different architectural approaches solving identical problems.

### The Core Innovation

Unlike traditional tutorials that teach a single stack, The Marauder's Map enables developers to:

1. **Choose their "house" (technology stack)** based on career goals or curiosity
2. **Build a complete production-grade application** from CRUD operations to real-time features
3. **Compare approaches side-by-side** using the same database and API contract
4. **Learn through contrast** - understanding *why* different stacks make different trade-offs

### The Three Houses

| House | Stack | Philosophy | Best For |
|-------|-------|------------|----------|
| 🦁 **Gryffindor** | React + Express | "Move fast, ship fearlessly" | Startups, rapid prototyping, JavaScript-first teams |
| 🐍 **Slytherin** | Angular + .NET | "Ambition through structure" | Enterprise, large teams, type-safety advocates |
| 🦅 **Ravenclaw** | Spring Boot + Java | "Wisdom through convention" | Financial services, legacy integration, JVM ecosystems |

### Success Criteria

This project succeeds when a developer can:
- Complete all 7 "Years" in their chosen stack (40-60 hours)
- Understand the architectural trade-offs between stacks
- Deploy a production-ready application with Docker
- Contribute patterns learned back to the community

---

## Project Goals & Objectives

### Primary Goals

**G1: Educational Excellence**
- Provide hands-on learning for intermediate to advanced developers
- Demonstrate real-world patterns, not just "hello world" examples
- Build muscle memory for production-grade application development

**G2: Technology Comparison Framework**
- Enable objective comparison of React/Angular/Spring approaches
- Surface the "why" behind architectural decisions
- Demonstrate that good software transcends technology choices

**G3: Production Readiness**
- Every "Year" adds production-grade capabilities
- By Year 7, the application is deployable to production
- Includes error handling, logging, monitoring, and deployment

**G4: Community-Driven Learning**
- Open-source codebase with comprehensive documentation
- Encourage contributions of additional "houses" (Vue + Python, Svelte + Go, etc.)
- Build a learning community around multi-stack development

### Secondary Goals

**G5: Career Development**
- Help developers transition between ecosystems
- Provide portfolio-worthy projects
- Demonstrate polyglot engineering capabilities

**G6: Interview Preparation**
- Cover common interview topics (auth, real-time, CRUD, optimization)
- Demonstrate system design thinking
- Showcase full-stack capabilities

---

## Target Audience

### Primary Personas

#### Persona 1: The Stack Switcher
**Name:** Alex Chen
**Background:** 3 years React experience, new job requires Angular
**Goal:** Understand Angular patterns by comparison to familiar React concepts
**Pain Points:** Tutorials assume no prior knowledge; needs *translation*, not introduction
**Success Metric:** Can contribute to Angular codebase within 2 weeks

#### Persona 2: The Polyglot Engineer
**Name:** Jordan Martinez
**Background:** Senior engineer, works across multiple codebases
**Goal:** Maintain expertise in multiple stacks simultaneously
**Pain Points:** Context switching between different architectural patterns
**Success Metric:** Can debug issues in any of the three stacks

#### Persona 3: The Architecture Student
**Name:** Sam Patel
**Background:** Junior developer, wants to understand "why" behind choices
**Goal:** Learn architectural patterns and trade-offs
**Pain Points:** Tutorials teach "how" but not "when" or "why"
**Success Metric:** Can make informed technology selection decisions

#### Persona 4: The Hiring Manager
**Name:** Morgan Lee
**Background:** Tech lead evaluating candidates
**Goal:** Assess candidate's breadth of knowledge
**Pain Points:** Candidates know syntax but not architectural thinking
**Success Metric:** Can identify candidates who understand trade-offs

### Secondary Personas

- **Bootcamp Graduates:** Building first production-grade portfolio project
- **CS Students:** Bridging academic knowledge to industry patterns
- **Self-Taught Developers:** Filling gaps in formal software architecture education
- **Tech Leads:** Training teams on new technology stacks

---

## User Stories by Year

### Year 1: Core CRUD Operations
*"I solemnly swear that I am up to no good."*

**Epic:** As a magical law enforcement officer, I need to track dark incidents across wizarding locations.

#### US-1.1: Report Incident
**As an** Auror
**I want to** report a new dark magic incident
**So that** the Ministry can track and respond to threats

**Acceptance Criteria:**
- Form includes: title (text), severity (dropdown), location (dropdown), description (textarea)
- Severity options: MISCHIEF, SUSPICIOUS, DANGEROUS, UNFORGIVABLE
- Location options: HOGWARTS, HOGSMEADE, KNOCKTURN_ALLEY, FORBIDDEN_FOREST, MINISTRY, AZKABAN
- Successful submission shows confirmation message
- Failed submission shows validation errors
- Incident appears in the main list immediately

**Technical Notes:**
- POST /api/incidents
- Returns 201 Created with incident object
- Validates required fields server-side

#### US-1.2: View All Incidents
**As a** Prefect
**I want to** see all reported incidents
**So that** I can monitor activity in my area

**Acceptance Criteria:**
- List displays: title, severity (color-coded), location, time ago, status
- Most recent incidents appear first
- Empty state shows "No incidents reported" message
- Loading state displays while fetching

**Technical Notes:**
- GET /api/incidents
- Returns array of incident objects
- Default sort: reported_at DESC

#### US-1.3: Update Incident Severity
**As an** Auror
**I want to** escalate incident severity
**So that** appropriate resources can be deployed

**Acceptance Criteria:**
- Click incident to see details
- Edit button available for severity field
- Dropdown allows changing to any severity level
- Save button commits change
- Updated severity reflects in list view
- Audit trail records who changed severity and when

**Technical Notes:**
- PATCH /api/incidents/:id
- Returns 200 OK with updated incident
- Validates severity enum values

#### US-1.4: Resolve Incident
**As an** Auror
**I want to** mark incidents as resolved
**So that** we can focus on active threats

**Acceptance Criteria:**
- "Resolve" button available on open incidents
- Confirmation dialog: "Mark as resolved?"
- Resolved incidents move to "Resolved" tab
- Cannot edit resolved incidents (read-only)
- Can reopen with "Reopen" button if needed

**Technical Notes:**
- PATCH /api/incidents/:id with status: RESOLVED
- Soft delete pattern (status change, not deletion)
- Includes resolved_at timestamp and resolved_by user

---

### Year 2: Authentication & Authorization
*"After all this time? Always."*

**Epic:** As the Ministry, I need role-based access control to protect sensitive incident data.

#### US-2.1: User Registration
**As a** new Ministry employee
**I want to** create an account
**So that** I can access the incident tracking system

**Acceptance Criteria:**
- Registration form: email, password, confirm password, role selection
- Password requirements: minimum 8 characters, 1 uppercase, 1 number, 1 special
- Email must be unique (validation error if duplicate)
- Role options: STUDENT, PREFECT, AUROR
- Successful registration redirects to login page
- Confirmation email sent (optional for MVP)

**Technical Notes:**
- POST /api/auth/register
- Password hashed with bcrypt (cost factor: 12)
- Returns user object (without password)
- Email validation regex

#### US-2.2: User Login
**As a** Ministry employee
**I want to** log in with my credentials
**So that** I can access my personalized dashboard

**Acceptance Criteria:**
- Login form: email, password, "Remember me" checkbox
- Successful login redirects to dashboard
- Failed login shows "Invalid credentials" error
- "Remember me" extends session to 30 days
- Session persists across page refreshes
- Logout button available in header

**Technical Notes:**
- POST /api/auth/login
- Returns JWT token (Gryffindor/Ravenclaw) or session cookie (Slytherin)
- Token expiry: 1 hour (15 minutes if not "remember me")
- Refresh token pattern for extended sessions

#### US-2.3: Role-Based Access Control
**As the** Ministry
**I want** different roles to have different permissions
**So that** students can't access sensitive Auror investigations

**Permissions Matrix:**

| Action | STUDENT | PREFECT | AUROR |
|--------|---------|---------|-------|
| View incidents | ✅ (MISCHIEF only) | ✅ (All except UNFORGIVABLE) | ✅ (All) |
| Create incident | ✅ | ✅ | ✅ |
| Update severity | ❌ | ✅ (Up to DANGEROUS) | ✅ (All) |
| Resolve incident | ❌ | ✅ | ✅ |
| Delete incident | ❌ | ❌ | ✅ |
| View analytics | ❌ | ✅ (Own house) | ✅ (All) |

**Acceptance Criteria:**
- Students see only MISCHIEF-level incidents
- Prefects cannot see UNFORGIVABLE incidents
- Aurors have full access
- Attempting unauthorized action shows 403 Forbidden error
- UI hides buttons for unauthorized actions

**Technical Notes:**
- Middleware validates JWT/session before each request
- Role claim included in token
- Server-side enforcement (never trust client)

#### US-2.4: Protected Routes
**As the** system
**I want to** redirect unauthenticated users to login
**So that** sensitive data is protected

**Acceptance Criteria:**
- Accessing /dashboard without auth redirects to /login
- After login, user returns to originally requested page
- Token expiry redirects to login with message "Session expired"
- Manual logout redirects to homepage

**Technical Notes:**
- Route guards (Gryffindor: React Router, Slytherin: Angular Guards, Ravenclaw: Spring Security)
- Refresh token rotation for security
- CSRF protection for cookie-based sessions

---

### Year 3: Real-Time Features
*"The ones that love us never really leave us."*

**Epic:** As an Auror, I need real-time updates so I can respond to incidents as they happen.

#### US-3.1: Live Incident Feed (Owl Post)
**As an** Auror
**I want to** see new incidents appear automatically
**So that** I don't have to manually refresh the page

**Acceptance Criteria:**
- New incidents appear in list without page refresh
- Animation highlights new incident (fade-in effect)
- Sound notification plays (optional, user can disable)
- Works when browser tab is in background
- Connection status indicator (connected/disconnected)

**Technical Notes:**
- WebSocket connection (Gryffindor: Socket.io, Slytherin: SignalR, Ravenclaw: STOMP)
- Server pushes incident.created event
- Client adds to local state and UI
- Reconnection logic if connection drops

#### US-3.2: Severity Escalation Alerts
**As a** Prefect
**I want to** be notified when incidents are escalated
**So that** I can respond to worsening situations

**Acceptance Criteria:**
- Push notification when incident severity increases
- Notification includes: incident title, old severity → new severity
- Desktop notification (if permission granted)
- In-app notification badge on bell icon
- Click notification navigates to incident detail

**Technical Notes:**
- Server pushes incident.escalated event
- Client shows toast notification
- Browser Notification API for desktop alerts
- Notification history stored in state

#### US-3.3: User Presence Indicators
**As an** Auror
**I want to** see who else is online
**So that** I can coordinate responses with colleagues

**Acceptance Criteria:**
- Online users list in sidebar
- Avatar + name + role badge
- Green dot for online, gray for offline
- "Viewing incident #123" status if user has incident open
- Updates in real-time as users join/leave

**Technical Notes:**
- Server tracks connected socket IDs
- Broadcast presence.join and presence.leave events
- Client maintains presence map
- Heartbeat mechanism to detect disconnects

#### US-3.4: Typing Indicators (Comments)
**As a** Prefect
**I want to** see when someone is typing a comment
**So that** I can wait before adding my own

**Acceptance Criteria:**
- "User is typing..." appears below comment box
- Disappears after 3 seconds of inactivity
- Shows up to 3 users typing simultaneously
- Does not show own typing indicator

**Technical Notes:**
- Emit comment.typing event on keypress (debounced 500ms)
- Server broadcasts to room
- Client displays typing users
- Cleanup timer removes stale indicators

---

### Year 4: Search & Filtering
*"It does not do to dwell on dreams and forget to live."*

**Epic:** As a Prefect, I need to find specific incidents quickly among thousands of reports.

#### US-4.1: Full-Text Search
**As an** Auror
**I want to** search incidents by keywords
**So that** I can find related cases quickly

**Acceptance Criteria:**
- Search bar in header, always visible
- Searches: title, description, location, reporter name
- Results update as user types (debounced 300ms)
- Highlights matching text in results
- Shows "No results for '{query}'" if empty
- Clears search with X button

**Technical Notes:**
- GET /api/incidents?search=dark%20mark
- PostgreSQL full-text search (tsvector + GIN index)
- Alternative: Elasticsearch integration (Year 6 extension)
- Returns relevance score for ranking

#### US-4.2: Advanced Filters
**As a** Prefect
**I want to** filter incidents by multiple criteria
**So that** I can narrow down to specific cases

**Filter Options:**
- Severity: multi-select (MISCHIEF, SUSPICIOUS, DANGEROUS, UNFORGIVABLE)
- Location: multi-select (all locations)
- Status: multi-select (OPEN, IN_PROGRESS, RESOLVED)
- Date range: start date, end date
- Reported by: user dropdown

**Acceptance Criteria:**
- Filters sidebar toggles open/close
- Apply button fetches filtered results
- Active filters shown as chips (removable)
- "Clear all filters" resets to default view
- Filter state persists in URL query params

**Technical Notes:**
- GET /api/incidents?severity=DANGEROUS,UNFORGIVABLE&location=HOGWARTS&status=OPEN
- SQL WHERE clause built dynamically
- Client-side filter state management

#### US-4.3: Pagination
**As a** user
**I want** incidents loaded in pages
**So that** the app performs well with thousands of incidents

**Acceptance Criteria:**
- Default: 20 incidents per page
- Page size options: 10, 20, 50, 100
- Pagination controls: First, Previous, 1, 2, 3, ..., Next, Last
- Shows "Showing 1-20 of 1,234 incidents"
- URL updates with page number (?page=2)
- Preserves filters when paginating

**Technical Notes:**
- GET /api/incidents?page=2&limit=20
- Returns: { data: [], total: 1234, page: 2, limit: 20 }
- SQL LIMIT and OFFSET
- Cursor-based pagination for Year 6 optimization

#### US-4.4: Sorting
**As a** user
**I want to** sort incidents by different fields
**So that** I can prioritize my work

**Sortable Fields:**
- Reported at (default: newest first)
- Severity (highest first)
- Location (alphabetical)
- Status (open → in progress → resolved)

**Acceptance Criteria:**
- Click column header to sort
- Arrow icon indicates sort direction (↑ ↓)
- Click again to reverse order
- URL updates with sort param (?sort=severity&order=desc)

**Technical Notes:**
- GET /api/incidents?sort=severity&order=desc
- SQL ORDER BY clause
- Validate sort field against whitelist (prevent SQL injection)

---

### Year 5: Analytics Dashboard
*"Happiness can be found even in the darkest of times, if one only remembers to turn on the light."*

**Epic:** As the Ministry, I need visibility into incident trends to allocate resources effectively.

#### US-5.1: Incident Overview Dashboard
**As a** Ministry official
**I want to** see key metrics at a glance
**So that** I can assess current threat levels

**Metrics:**
- Total incidents (last 30 days)
- Open incidents (count + percentage)
- Average resolution time
- Most dangerous location
- Severity breakdown (pie chart)

**Acceptance Criteria:**
- Dashboard loads on login
- Metrics update in real-time
- Color-coded severity levels
- Click metric to see filtered list

**Technical Notes:**
- GET /api/analytics/overview
- Aggregate queries with COUNT, AVG, GROUP BY
- Caching (Redis) for performance

#### US-5.2: Trend Charts
**As an** Auror
**I want to** see incident trends over time
**So that** I can identify patterns

**Charts:**
1. **Incidents by Day** (line chart, last 30 days)
2. **Severity Distribution** (stacked bar chart)
3. **Location Heatmap** (geographic visualization)
4. **Response Time Trends** (line chart)

**Acceptance Criteria:**
- Interactive charts (hover for details)
- Date range selector (7d, 30d, 90d, 1y)
- Export to PNG button
- Responsive design (mobile-friendly)

**Technical Notes:**
- Charting library: Chart.js (Gryffindor), ngx-charts (Slytherin), JFreeChart (Ravenclaw)
- Aggregate data server-side, not client-side
- Consider materialized views for large datasets

#### US-5.3: Performance Leaderboard
**As a** Prefect
**I want to** see who resolves incidents fastest
**So that** we can recognize top performers

**Leaderboard Columns:**
- Rank
- User name
- Incidents resolved (last 30 days)
- Average resolution time
- Points earned

**Point System:**
- MISCHIEF resolved: 10 points
- SUSPICIOUS resolved: 25 points
- DANGEROUS resolved: 50 points
- UNFORGIVABLE resolved: 100 points
- Bonus: Resolved within 1 hour: +50%

**Acceptance Criteria:**
- Top 10 users displayed
- User's own rank always visible (even if not top 10)
- Filterable by house (Gryffindor, Slytherin, Ravenclaw)
- Updates daily at midnight UTC

**Technical Notes:**
- GET /api/analytics/leaderboard
- Materialized view refreshed nightly
- Score calculation stored procedure

#### US-5.4: Exportable Reports
**As a** Ministry official
**I want to** export incident data
**So that** I can share with external stakeholders

**Export Formats:**
- CSV (all incidents with filters applied)
- PDF (summary report with charts)
- JSON (API integration)

**Acceptance Criteria:**
- Export button on dashboard and list view
- Includes all filtered/sorted data
- CSV: all fields, human-readable
- PDF: branded template with logo
- Download triggers immediately (no email)

**Technical Notes:**
- GET /api/incidents/export?format=csv&filters=...
- Streaming response for large datasets
- Rate limit: 5 exports per hour per user

---

### Year 6: Advanced Patterns
*"It is our choices, Harry, that show what we truly are, far more than our abilities."*

**Epic:** As a developer, I want to implement advanced architectural patterns to optimize performance and scalability.

#### US-6.1: Optimistic Updates (Gryffindor)
**As a** user
**I want** instant feedback when I perform actions
**So that** the app feels fast and responsive

**Implementation:**
- Update UI immediately before server response
- Rollback if server request fails
- Show subtle loading indicator during server round-trip
- Handle conflicts gracefully

**Acceptance Criteria:**
- Clicking "Resolve" instantly moves incident to resolved tab
- If server fails, incident returns to original tab with error message
- Works offline (queues request until reconnected)

**Technical Notes:**
- React: useState + useEffect with cleanup
- Optimistic update then await server response
- Rollback mechanism with undo toast

#### US-6.2: CQRS Pattern (Slytherin)
**As a** developer
**I want** separate read and write models
**So that** I can optimize queries and commands independently

**Implementation:**
- Separate IncidentCommandService and IncidentQueryService
- Write operations update database + publish events
- Read operations use denormalized views
- Event handlers update read models asynchronously

**Acceptance Criteria:**
- Write operations complete in <100ms
- Read operations scale independently
- Analytics queries do not slow down writes
- Eventual consistency acceptable for non-critical reads

**Technical Notes:**
- .NET: MediatR for command/query bus
- Separate DbContexts for read/write
- Event sourcing optional (Year 6 extension)

#### US-6.3: Event Sourcing (Ravenclaw)
**As a** developer
**I want** complete audit history of all changes
**So that** I can reconstruct state at any point in time

**Implementation:**
- Store events (IncidentCreated, SeverityEscalated, IncidentResolved)
- Rebuild current state by replaying events
- Never delete events (immutable log)
- Snapshot pattern for performance

**Acceptance Criteria:**
- Can view incident state at any point in past
- Audit log shows all changes with timestamps
- Event replay succeeds in <1 second for typical incident
- Snapshots created every 100 events

**Technical Notes:**
- Spring Boot: Axon Framework or Eventuate
- Event store table with sequence number
- Snapshot table for optimization
- Event upcasting for schema evolution

#### US-6.4: Real-Time Performance Optimization
**As a** developer
**I want** efficient real-time updates
**So that** the system scales to 10,000 concurrent users

**Optimizations:**
1. **Connection pooling:** Reuse WebSocket connections
2. **Room-based broadcasting:** Only send updates to relevant users
3. **Throttling:** Batch rapid updates (max 10/second)
4. **Backpressure:** Queue if client can't keep up

**Acceptance Criteria:**
- 10,000 concurrent WebSocket connections supported
- Message delivery latency <100ms p99
- Server memory usage <2GB
- Graceful degradation under load

**Technical Notes:**
- Redis pub/sub for horizontal scaling
- Sticky sessions for WebSocket connections
- Load balancer with WebSocket support

---

### Year 7: Production Readiness
*"Words are, in my not-so-humble opinion, our most inexhaustible source of magic."*

**Epic:** As a DevOps engineer, I need production-grade reliability, observability, and deployment.

#### US-7.1: Comprehensive Error Handling
**As a** user
**I want** helpful error messages
**So that** I know what went wrong and how to fix it

**Error Categories:**
1. **Validation errors:** "Severity is required"
2. **Authorization errors:** "You do not have permission to resolve UNFORGIVABLE incidents"
3. **Not found errors:** "Incident #999 not found"
4. **Server errors:** "An unexpected error occurred. Please try again."

**Acceptance Criteria:**
- All errors display user-friendly messages (no stack traces)
- 4xx errors show actionable guidance
- 5xx errors logged with full context
- Error boundary catches React crashes
- Retry mechanism for transient failures

**Technical Notes:**
- Global error handler middleware
- Structured error responses: { error: { code, message, details } }
- Client-side error tracking (Sentry/LogRocket)

#### US-7.2: Logging & Observability
**As a** developer
**I want** structured logs
**So that** I can debug production issues

**Log Levels:**
- ERROR: Unhandled exceptions
- WARN: Degraded performance, fallback used
- INFO: Request completed, user logged in
- DEBUG: Detailed execution flow (dev only)

**Structured Fields:**
- timestamp
- level
- message
- userId
- requestId (correlation)
- duration
- stackTrace (if error)

**Acceptance Criteria:**
- All HTTP requests logged with duration
- Database queries logged with execution time
- Errors include full context (user, request, stack)
- Logs queryable by requestId across services

**Technical Notes:**
- Winston (Gryffindor), Serilog (Slytherin), Logback (Ravenclaw)
- JSON format for log aggregation
- ELK stack or Datadog integration

#### US-7.3: Rate Limiting & Security
**As the** system
**I want** protection against abuse
**So that** malicious users cannot overwhelm the service

**Rate Limits:**
- Authentication: 5 failed logins per 15 minutes (then CAPTCHA)
- API requests: 100 requests per minute per user
- Incident creation: 10 incidents per hour per user
- Export: 5 per hour per user

**Security Measures:**
- HTTPS only (HSTS header)
- CSRF tokens for state-changing requests
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- Password complexity requirements
- JWT token expiry and rotation

**Acceptance Criteria:**
- Exceeding rate limit returns 429 Too Many Requests
- Rate limit headers included: X-RateLimit-Limit, X-RateLimit-Remaining
- Security headers present (CSP, X-Frame-Options, etc.)
- Penetration test passes (OWASP Top 10)

**Technical Notes:**
- Redis for distributed rate limiting
- express-rate-limit (Gryffindor)
- ASP.NET AspNetCoreRateLimit (Slytherin)
- Spring Cloud Gateway filters (Ravenclaw)

#### US-7.4: Health Checks & Monitoring
**As a** DevOps engineer
**I want** health check endpoints
**So that** I can monitor service availability

**Endpoints:**
- GET /health (basic liveness)
- GET /health/ready (readiness with dependencies)
- GET /metrics (Prometheus format)

**Health Check Components:**
- Database connectivity
- Redis connectivity (if used)
- Disk space available
- Memory usage

**Acceptance Criteria:**
- /health returns 200 if service is alive
- /health/ready returns 503 if database is unreachable
- /metrics includes: request count, latency p50/p95/p99, error rate
- Grafana dashboard for visualization

**Technical Notes:**
- Spring Boot Actuator (Ravenclaw)
- ASP.NET Health Checks (Slytherin)
- Express + prom-client (Gryffindor)

#### US-7.5: Docker Deployment
**As a** developer
**I want** one-command deployment
**So that** I can run the entire stack locally or in production

**docker-compose.yml includes:**
- PostgreSQL (Gringotts vault)
- Gryffindor frontend + backend
- Slytherin frontend + backend
- Ravenclaw monolith (or separate containers)
- Redis (for caching/sessions)
- Nginx (reverse proxy)

**Acceptance Criteria:**
- `docker-compose up` starts all services
- All three UIs accessible:
  - Gryffindor: http://localhost:3001
  - Slytherin: http://localhost:3002
  - Ravenclaw: http://localhost:3003
- Shared database accessible to all backends
- Hot reload enabled for development
- Production build optimized (no dev dependencies)

**Technical Notes:**
- Multi-stage Dockerfiles for smaller images
- Named volumes for database persistence
- Health checks in docker-compose
- Environment variables for configuration

---

## Success Metrics

### Educational Success Metrics

**M1: Completion Rate**
- Target: 60% of students who start Year 1 complete Year 7
- Measured by: GitHub analytics (stars, forks, commits)

**M2: Learning Effectiveness**
- Target: 80% of learners report understanding architectural trade-offs
- Measured by: Post-completion survey

**M3: Stack Diversity**
- Target: 33% adoption across all three stacks (no single stack >50%)
- Measured by: GitHub traffic to each directory

**M4: Community Engagement**
- Target: 100 GitHub issues/PRs in first 6 months
- Measured by: GitHub activity

### Technical Success Metrics

**M5: Performance Benchmarks**
- API response time: p95 < 200ms
- WebSocket message latency: p99 < 100ms
- Database query time: p95 < 50ms
- Full page load: p75 < 2 seconds

**M6: Code Quality**
- Test coverage: >80% for all stacks
- No critical security vulnerabilities (Snyk/SonarQube)
- Lighthouse score: >90 for performance, accessibility

**M7: Deployment Success**
- `docker-compose up` succeeds on fresh install: 100%
- All health checks pass: 100%
- Zero-downtime deployments: Yes (with load balancer)

---

## Non-Functional Requirements

### Performance

**NFR-1: Scalability**
- Support 10,000 concurrent users
- Handle 1,000 requests per second
- Database: 1 million incidents without degradation

**NFR-2: Response Time**
- API p95 latency: <200ms
- Real-time message delivery: <100ms
- Page load time: <2s on 3G connection

**NFR-3: Availability**
- Uptime: 99.5% (excluding planned maintenance)
- Graceful degradation: Read-only mode if database is degraded
- Zero-downtime deployments

### Security

**NFR-4: Authentication**
- Passwords hashed with bcrypt (cost factor: 12)
- JWT tokens signed with RS256 (not HS256)
- Session expiry: 1 hour (configurable)

**NFR-5: Authorization**
- All endpoints protected by authentication middleware
- Role-based access enforced server-side
- Principle of least privilege

**NFR-6: Data Protection**
- HTTPS only (TLS 1.3)
- Sensitive data encrypted at rest (optional for MVP)
- GDPR compliance (data export, deletion)

### Usability

**NFR-7: Accessibility**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatible
- Color contrast ratio: >4.5:1

**NFR-8: Browser Support**
- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Graceful degradation for older browsers
- Mobile responsive design

**NFR-9: Internationalization**
- English (primary)
- Extensible i18n framework for future languages
- Date/time formatted per user locale

### Maintainability

**NFR-10: Code Quality**
- Linting: ESLint, StyleCop, Checkstyle (per stack)
- Consistent naming conventions (4WNC where applicable)
- Comprehensive inline documentation

**NFR-11: Testing**
- Unit test coverage: >80%
- Integration tests for critical paths
- End-to-end tests for key user journeys

**NFR-12: Documentation**
- README for each stack with quick start
- API documentation (OpenAPI/Swagger)
- Architecture decision records (ADR)

---

## Out of Scope

### Explicitly Excluded (Current Version)

**OS-1: Mobile Applications**
- Native iOS/Android apps not included
- Mobile-responsive web UI is sufficient

**OS-2: Multi-Tenancy**
- Single organization only
- No team/workspace isolation

**OS-3: Email Notifications**
- In-app notifications only
- Email integration deferred to future version

**OS-4: File Uploads**
- No image/document attachments for incidents
- Text-only descriptions

**OS-5: Advanced Permissions**
- No fine-grained permissions (field-level, record-level)
- Role-based only (STUDENT, PREFECT, AUROR)

**OS-6: Third-Party Integrations**
- No Slack, Teams, PagerDuty integrations
- Standalone system only

**OS-7: AI/ML Features**
- No predictive analytics
- No automated incident categorization

**OS-8: Custom Theming**
- Fixed Harry Potter theme
- No user-customizable color schemes

### Future Enhancements

**FE-1: Additional Houses**
- Hufflepuff (Vue.js + Python/Django)
- Additional stacks (Svelte + Go, etc.)

**FE-2: GraphQL API**
- Alternative to REST
- Demonstrates different API paradigms

**FE-3: Microservices Architecture**
- Split monoliths into services
- Service mesh demonstration

**FE-4: Advanced Analytics**
- Machine learning for anomaly detection
- Predictive forecasting

**FE-5: Mobile Apps**
- React Native (shared with Gryffindor logic)
- Flutter (cross-platform)

---

## Appendix A: Glossary

**Auror:** Highest permission role, equivalent to administrator
**Prefect:** Middle permission role, equivalent to moderator
**Student:** Lowest permission role, equivalent to read-only user
**Gringotts Vault:** Shared PostgreSQL database
**Owl Post:** Real-time notification system
**House:** Technology stack (Gryffindor/Slytherin/Ravenclaw)
**Year:** Development phase (Year 1-7)
**Dark Incident:** Security/magical threat event tracked by the system

---

## Appendix B: References

- **OpenAPI Specification:** [contracts/openapi.yml](contracts/openapi.yml)
- **Database Schema:** [gringotts/init.sql](gringotts/init.sql)
- **Architecture Diagrams:** [docs/architecture/](docs/architecture/)
- **Contributing Guide:** [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Approval & Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | [TBD] | | |
| Tech Lead (Gryffindor) | [TBD] | | |
| Tech Lead (Slytherin) | [TBD] | | |
| Tech Lead (Ravenclaw) | [TBD] | | |
| QA Lead | [TBD] | | |

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | Claude Code | Initial draft |

---

*"It is our choices that show what we truly are, far more than our abilities." — Albus Dumbledore*
