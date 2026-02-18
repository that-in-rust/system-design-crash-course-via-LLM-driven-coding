# The Marauder's Map
### *I solemnly swear that I am up to no good.*

> A multi-stack educational project: Build the same dark activity tracker THREE times using different technology stacks, all sharing the same PostgreSQL database.

---

## Table of Contents

- [Overview](#overview)
- [The Three Houses](#the-three-houses)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Learning Path: 7 Years at Hogwarts](#learning-path-7-years-at-hogwarts)
- [Documentation](#documentation)
- [Technology Stacks](#technology-stacks)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Marauder's Map is an innovative educational platform that demonstrates full-stack application development by building the **same magical incident tracking system three different ways**:

- **🦁 Gryffindor Wing**: React + Express (fast, minimal ceremony, agile)
- **🐍 Slytherin Wing**: Angular + .NET (structured, type-safe, enterprise-grade)
- **🦅 Ravenclaw Wing**: Spring Boot + Java (annotation-driven, convention-heavy)

### Why This Project?

Unlike traditional tutorials that teach a single stack, The Marauder's Map enables you to:

1. **Choose Your House**: Pick the technology stack that aligns with your career goals
2. **Learn Through Contrast**: See how different technologies solve identical problems
3. **Build Production-Grade Software**: Progress from CRUD to real-time features to deployment
4. **Understand Architectural Trade-offs**: Make informed decisions about technology selection

### What You'll Build

A complete **Dark Activity Tracking System** for the Ministry of Magic:

- 📝 **CRUD Operations**: Report, view, update, and resolve magical incidents
- 🔐 **Authentication**: Role-based access control (Student, Prefect, Auror)
- ⚡ **Real-Time Features**: Live incident feed using WebSockets
- 🔍 **Search & Filters**: Full-text search, advanced filtering, pagination
- 📊 **Analytics Dashboard**: Trend charts, performance leaderboards
- 🏗️ **Advanced Patterns**: Optimistic updates, CQRS, event sourcing
- 🚀 **Production Ready**: Error handling, logging, Docker deployment

---

## The Three Houses

### 🦁 Gryffindor (React + Express)
**Philosophy:** *"Move fast, ship fearlessly"*

**Frontend:**
- React 18 with TypeScript
- Zustand for state management
- Tailwind CSS for styling
- Vite for blazing-fast builds

**Backend:**
- Node.js 20 + Express
- Socket.io for real-time
- Prisma or raw SQL
- JWT authentication

**Best For:** Startups, rapid prototyping, JavaScript-first teams

### 🐍 Slytherin (Angular + .NET)
**Philosophy:** *"Ambition through structure"*

**Frontend:**
- Angular 17 with TypeScript
- NgRx for state management
- Angular Material UI
- Reactive programming with RxJS

**Backend:**
- ASP.NET Core 8.0 with C#
- SignalR for real-time
- Entity Framework Core
- ASP.NET Identity

**Best For:** Enterprise applications, large teams, type-safety advocates

### 🦅 Ravenclaw (Spring Boot + Java)
**Philosophy:** *"Wisdom through convention"*

**Full-Stack:**
- Spring Boot 3.2 with Java 21
- Thymeleaf + HTMX for UI
- Spring Data JPA + Hibernate
- WebSocket STOMP for real-time
- Spring Security

**Best For:** Financial services, legacy integration, JVM ecosystems

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/hogwarts/marauders-map.git
cd marauders-map

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up --build
```

That's it! All three implementations are now running:

- 🦁 **Gryffindor**: http://localhost:3001
- 🐍 **Slytherin**: http://localhost:3002
- 🦅 **Ravenclaw**: http://localhost:3003
- 🗄️ **Database**: postgresql://localhost:5432/marauders_map

### Default Login Credentials

```
Email: harry.potter@hogwarts.edu
Password: password

Other accounts:
- hermione.granger@hogwarts.edu (PREFECT)
- draco.malfoy@hogwarts.edu (PREFECT)
- luna.lovegood@hogwarts.edu (STUDENT)
```

**⚠️ Important:** Change these passwords in production!

---

## Project Structure

```
hogwarts/
├── 📄 README.md                    # You are here
├── 📄 PRD-Marauders-Map.md         # Product Requirements Document
├── 📄 TECHNICAL-SPECS-Marauders-Map.md  # Technical Specifications
├── 📄 docker-compose.yml           # Multi-container setup
├── 📄 .env.example                 # Environment variables template
│
├── 📁 gringotts/                   # Shared Database (PostgreSQL)
│   ├── init.sql                    # Schema + seed data
│   ├── seed.sql                    # Additional test data
│   └── migrations/                 # Database migrations
│
├── 📁 contracts/                   # Shared API Contract
│   ├── openapi.yml                 # REST API specification
│   └── websocket-events.md         # Real-time event catalog
│
├── 📁 gryffindor/                  # React + Express
│   ├── frontend/                   # React app
│   ├── backend/                    # Express API
│   └── README.md                   # Gryffindor-specific guide
│
├── 📁 slytherin/                   # Angular + .NET
│   ├── frontend/                   # Angular app
│   ├── backend/                    # ASP.NET Core API
│   └── README.md                   # Slytherin-specific guide
│
├── 📁 ravenclaw/                   # Spring Boot + Java
│   ├── src/                        # Java source code
│   ├── pom.xml                     # Maven configuration
│   └── README.md                   # Ravenclaw-specific guide
│
└── 📁 docs/                        # Additional Documentation
    ├── architecture/               # System diagrams
    ├── tutorials/                  # Step-by-step guides
    └── ADRs/                       # Architecture Decision Records
```

---

## Learning Path: 7 Years at Hogwarts

The project is structured as a 7-year curriculum, progressively building complexity:

### 📚 Year 1: Core CRUD
*"The basics of magic"*

- Create, Read, Update, Delete incidents
- Form validation
- Basic routing
- Database queries

**Time:** 4-6 hours | **Difficulty:** Beginner

### 🔐 Year 2: Authentication & Authorization
*"Protecting the castle"*

- User registration and login
- JWT/Session tokens
- Role-based access control
- Protected routes

**Time:** 6-8 hours | **Difficulty:** Intermediate

### ⚡ Year 3: Real-Time Features
*"Owl Post - instant delivery"*

- WebSocket connections
- Live incident feed
- Push notifications
- Presence indicators

**Time:** 8-10 hours | **Difficulty:** Intermediate

### 📨 Year 3.5: Event Streaming with Iggy
*"The Owl Post Office - messages that never get lost"*

- Message streaming with Iggy (Rust-based, like Kafka but tiny)
- Decouple API from WebSocket broadcasting
- Streams, Topics, Partitions, Offsets
- Producer/Consumer pattern
- Event replay for disconnected clients
- Foundation for CQRS & Event Sourcing (Year 6)

**Difficulty:** Intermediate-Advanced

### 🔍 Year 4: Search & Filtering
*"Finding needles in haystacks"*

- Full-text search
- Advanced filters
- Pagination & sorting
- Query optimization

**Time:** 6-8 hours | **Difficulty:** Intermediate

### 📊 Year 5: Analytics Dashboard
*"Seeing patterns in chaos"*

- Aggregate queries
- Chart visualizations
- Performance leaderboards
- Exportable reports

**Time:** 8-10 hours | **Difficulty:** Advanced

### 🏗️ Year 6: Advanced Patterns
*"The magic behind the magic"*

- Optimistic updates (Gryffindor)
- CQRS pattern (Slytherin)
- Event sourcing (Ravenclaw)
- Performance optimization

**Time:** 10-12 hours | **Difficulty:** Advanced

### 🚀 Year 7: Production Readiness
*"Preparing for battle"*

- Error handling & logging
- Rate limiting & security
- Health checks & monitoring
- Docker deployment

**Time:** 8-10 hours | **Difficulty:** Advanced

**Total Time:** 50-64 hours per stack

---

## Documentation

### Essential Reading

| Document | Description |
|----------|-------------|
| [PRD (Product Requirements Document)](./PRD-Marauders-Map.md) | User stories, success metrics, scope |
| [Technical Specifications](./TECHNICAL-SPECS-Marauders-Map.md) | Architecture, database schema, API contract |
| [OpenAPI Specification](./contracts/openapi.yml) | Complete REST API reference |
| [Database Schema](./gringotts/init.sql) | PostgreSQL setup with comments |
| [Year 3.5: Event Streaming](./YEAR-3.5-PLAN.md) | Iggy streaming backbone plan |

### House-Specific Guides

- [🦁 Gryffindor README](./gryffindor/README.md) - React + Express quickstart
- [🐍 Slytherin README](./slytherin/README.md) - Angular + .NET quickstart
- [🦅 Ravenclaw README](./ravenclaw/README.md) - Spring Boot quickstart

### Tutorials

- [Year 1 Tutorial: Building Your First Incident Form](./docs/tutorials/year-1-getting-started.md)
- [Year 2 Tutorial: Implementing JWT Authentication](./docs/tutorials/year-2-authentication.md)
- [Year 3 Tutorial: Adding WebSocket Real-Time Updates](./docs/tutorials/year-3-realtime.md)
- *(More tutorials for Years 4-7 coming soon)*

---

## Technology Stacks

### Shared Infrastructure

| Component | Technology | Version |
|-----------|-----------|---------|
| Database | PostgreSQL | 16 |
| Cache (optional) | Redis | 7 |
| Reverse Proxy | Nginx | latest |
| Container Platform | Docker | 24+ |

### Frontend Comparison

| Feature | Gryffindor | Slytherin | Ravenclaw |
|---------|-----------|-----------|-----------|
| **Framework** | React 18 | Angular 17 | Thymeleaf + HTMX |
| **Language** | TypeScript | TypeScript | Java + HTML |
| **State Management** | Zustand | NgRx | Server-driven |
| **Styling** | Tailwind CSS | Angular Material | Bootstrap |
| **Build Tool** | Vite | Angular CLI | Maven + Spring Boot |
| **Bundle Size** | ~200KB | ~400KB | Minimal JS |
| **Learning Curve** | Moderate | Steep | Gentle |

### Backend Comparison

| Feature | Gryffindor | Slytherin | Ravenclaw |
|---------|-----------|-----------|-----------|
| **Runtime** | Node.js 20 | .NET 8.0 | JVM 21 |
| **Language** | TypeScript | C# 12 | Java 21 |
| **Framework** | Express | ASP.NET Core | Spring Boot |
| **ORM** | Prisma | EF Core | Hibernate |
| **Real-Time** | Socket.io | SignalR | STOMP |
| **Auth** | JWT + bcrypt | ASP.NET Identity | Spring Security |
| **Testing** | Jest | xUnit | JUnit 5 |

---

## Development Workflow

### Local Development (Without Docker)

#### Gryffindor
```bash
# Backend
cd gryffindor/backend
npm install
npm run dev  # Runs on :4001

# Frontend
cd gryffindor/frontend
npm install
npm run dev  # Runs on :3001
```

#### Slytherin
```bash
# Backend
cd slytherin/backend
dotnet restore
dotnet run  # Runs on :4002

# Frontend
cd slytherin/frontend
npm install
ng serve  # Runs on :3002
```

#### Ravenclaw
```bash
cd ravenclaw
./mvnw spring-boot:run  # Runs on :4003
```

### Running Tests

```bash
# Gryffindor
cd gryffindor/backend && npm test
cd gryffindor/frontend && npm test

# Slytherin
cd slytherin/backend && dotnet test
cd slytherin/frontend && ng test

# Ravenclaw
cd ravenclaw && ./mvnw test
```

### Database Migrations

```bash
# Apply migrations
psql marauders_map < gringotts/migrations/001_add_tags.sql

# Reset database (WARNING: Deletes all data)
dropdb marauders_map
createdb marauders_map
psql marauders_map < gringotts/init.sql
```

---

## API Reference

The API contract is shared across all three implementations. See [OpenAPI Specification](./contracts/openapi.yml) for full details.

### Quick Reference

```bash
# Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

# Incidents
GET    /api/incidents
POST   /api/incidents
GET    /api/incidents/:id
PATCH  /api/incidents/:id
DELETE /api/incidents/:id

# Comments
GET    /api/incidents/:id/comments
POST   /api/incidents/:id/comments

# Analytics
GET    /api/analytics/overview
GET    /api/analytics/leaderboard

# Notifications
GET    /api/notifications
POST   /api/notifications/:id/read

# Health
GET    /health
GET    /health/ready
```

### Testing the API

```bash
# Using curl
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"harry.potter@hogwarts.edu","password":"password"}'

# Using HTTPie
http POST localhost:4001/api/auth/login \
  email=harry.potter@hogwarts.edu \
  password=password

# Import OpenAPI spec into Postman/Insomnia
# File: contracts/openapi.yml
```

---

## Contributing

We welcome contributions from all houses! Here's how to get involved:

### Reporting Issues

Found a bug? Have a feature request? Open an issue:

- [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)

### Contributing Code

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/year-6-cqrs`)
3. Commit your changes (`git commit -m '[Slytherin] Implement CQRS pattern'`)
4. Push to your fork (`git push origin feature/year-6-cqrs`)
5. Open a Pull Request

### Contribution Guidelines

- **Code Style**: Follow house-specific linting rules (ESLint, StyleCop, Checkstyle)
- **Testing**: Write tests for new features (minimum 80% coverage)
- **Documentation**: Update README and docs for user-facing changes
- **Commit Messages**: Use format `[House] Brief description` (e.g., `[Gryffindor] Add WebSocket reconnection logic`)

### Adding a New House

Want to add Vue + Python? Svelte + Go? See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Frequently Asked Questions

### Q: Do I need to build all three implementations?

**A:** No! Choose the house (stack) that interests you most. The goal is depth, not breadth.

### Q: Can I mix-and-match? (React frontend with .NET backend)

**A:** Yes! Since all backends implement the same API contract, you can swap frontends. This is a great way to learn.

### Q: Is this production-ready code?

**A:** By Year 7, yes! The final version includes error handling, logging, security, and Docker deployment. However, you should still:
- Change default passwords
- Configure proper secrets management
- Set up monitoring
- Review security headers

### Q: What if I get stuck?

1. Check the [docs/tutorials](./docs/tutorials) directory
2. Review the [Technical Specifications](./TECHNICAL-SPECS-Marauders-Map.md)
3. Open a [GitHub Discussion](https://github.com/hogwarts/marauders-map/discussions)
4. Join our [Discord community](https://discord.gg/marauders-map)

### Q: How is this different from other tutorials?

- **Comparative Learning**: See three solutions to the same problem
- **Progressive Complexity**: Start simple, build to production-grade
- **Shared Contract**: Learn how API specifications enable polyglot teams
- **Real-World Patterns**: CQRS, event sourcing, optimistic updates

---

## Roadmap

### Current Version: 1.0.0 (Years 1-7 Complete)

### Future Enhancements

- [ ] **Year 8: Microservices** - Split monoliths into services
- [ ] **Year 9: Cloud Deployment** - AWS, Azure, GCP guides
- [ ] **Year 10: Observability** - Prometheus, Grafana, OpenTelemetry
- [ ] **Hufflepuff House**: Vue.js + Python/Django
- [ ] **GraphQL API**: Alternative to REST
- [ ] **Mobile Apps**: React Native, Flutter
- [ ] **AI Features**: Incident categorization, anomaly detection

---

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

Inspired by:
- The magical world of Harry Potter (J.K. Rowling)
- Real-world polyglot engineering teams
- The frustration of tutorials that only teach syntax, not architecture

Built with:
- React, Angular, Spring Boot communities
- PostgreSQL excellence
- Docker simplicity

Special thanks to all contributors who make this project a reality.

---

## Project Status

| House | Year 1 | Year 2 | Year 3 | Year 3.5 | Year 4 | Year 5 | Year 6 | Year 7 |
|-------|--------|--------|--------|----------|--------|--------|--------|--------|
| 🦁 Gryffindor | ✅ | ✅ | ✅ | 📝 | 📝 | 📝 | 📝 | 📝 |
| 🐍 Slytherin | 📝 | 📝 | 📝 | 📝 | 📝 | 📝 | 📝 | 📝 |
| 🦅 Ravenclaw | 📝 | 📝 | 📝 | 📝 | 📝 | 📝 | 📝 | 📝 |

✅ = Implemented | 📝 = Planned

---

## Contact

- **Project Lead**: [Your Name](mailto:you@example.com)
- **GitHub**: https://github.com/hogwarts/marauders-map
- **Discord**: https://discord.gg/marauders-map
- **Twitter**: [@MaraudersMap](https://twitter.com/maraudersmap)

---

<div align="center">

**"Mischief Managed."**

*Remember: The most powerful magic is understanding why, not just how.*

[⬆ Back to Top](#the-marauders-map)

</div>
