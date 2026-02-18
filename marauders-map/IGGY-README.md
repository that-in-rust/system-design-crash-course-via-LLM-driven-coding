# Iggy Event Streaming Integration - README
## *"The Complete Guide to Year 3.5"*

**Status**: Ready for Implementation
**Difficulty**: Intermediate
**Time Estimate**: 5 days (1 developer)
**Prerequisites**: Years 1-3 Complete

---

## What You're About to Build

Transform your Marauder's Map from direct Socket.io broadcasting to a **production-grade event streaming architecture** using Iggy.

```
BEFORE (Year 3):
API → broadcastToAllClients() → Socket.io → Clients
❌ Tight coupling
❌ No persistence
❌ No replay

AFTER (Year 3.5):
API → Publish to Iggy → [Event Log] → Consumer → Socket.io → Clients
✅ Decoupled
✅ Persistent
✅ Replayable
✅ Multiple consumers possible
```

---

## Quick Start (Get Iggy Running in 5 Minutes)

```bash
# 1. Add Iggy to docker-compose.yml
# (See IGGY-QUICKSTART.md for complete docker-compose.yml)

# 2. Start Iggy
docker-compose up -d iggy

# 3. Verify it works
curl http://localhost:3000/health
# Expected: {"status":"ok","version":"0.x.x"}

# 4. Install Node.js client
cd gryffindor/server/
npm install @iggy-rs/client

# 5. Test connection
node test-iggy.js  # (See IGGY-QUICKSTART.md for script)
```

**Result**: You now have a working Iggy event broker ready to receive events.

---

## Documentation Index

This integration includes 4 comprehensive documents:

### 1. **IGGY-INTEGRATION-SPECS.md** (Technical Specifications)

**Read this for**: Complete technical details, component specifications, implementation steps.

**Contents**:
- System architecture diagrams
- Event schema specifications
- Docker infrastructure setup
- Component implementations (Producer, Consumer, Event Envelope Factory)
- Step-by-step implementation order
- Troubleshooting guide

**Length**: ~800 lines
**Audience**: Developers implementing the integration

---

### 2. **IGGY-QUICKSTART.md** (Quick Start Guide)

**Read this for**: Fast setup, observation techniques, testing commands.

**Contents**:
- 5-minute setup guide
- How to observe Iggy working (HTTP API, CLI, logs)
- Terminal setup for observing event flow
- Browser console testing
- Demo scripts
- Quick health checks

**Length**: ~500 lines
**Audience**: Developers who want to see it working immediately

---

### 3. **IGGY-TESTING-CHECKLIST.md** (Testing & Verification)

**Read this for**: Systematic testing strategy, verification steps, automated test scripts.

**Contents**:
- Phase-by-phase testing checklist
- 50+ test cases
- Performance testing
- Resilience testing
- Automated test scripts
- CI/CD integration

**Length**: ~700 lines
**Audience**: QA engineers, developers verifying implementation

---

### 4. **IGGY-README.md** (This Document)

**Read this for**: Overview, decision-making, learning path, getting started.

**Contents**:
- High-level overview
- Why Iggy vs alternatives
- Learning objectives
- Implementation roadmap
- Links to other docs

**Audience**: Everyone (start here!)

---

## Why Iggy? (Decision Matrix)

### Iggy vs Kafka

| Feature | Kafka | Iggy | Winner |
|---------|-------|------|--------|
| **Streaming Model** | Append-only log | Append-only log | Tie |
| **Setup Complexity** | High (ZooKeeper, JVM, configs) | Low (single binary) | **Iggy** |
| **Memory Usage** | 1GB+ (JVM) | ~50MB (Rust) | **Iggy** |
| **Dependencies** | ZooKeeper (or KRaft) | None | **Iggy** |
| **Performance** | Excellent (100k+ msg/s) | Good (50k+ msg/s) | Kafka |
| **Operational Cost** | High | Low | **Iggy** |
| **Production Maturity** | Very High | Medium | Kafka |
| **Learning Curve** | Steep | Gentle | **Iggy** |

**For a learning project**: Iggy wins (same concepts, zero ops overhead).
**For production at scale**: Kafka wins (battle-tested at Netflix, LinkedIn, Uber).

**Interview line**:
*"I chose Iggy over Kafka for this learning project because it has the same streaming semantics (streams, topics, partitions, consumer groups) with zero operational overhead. In production, I'd evaluate Kafka, Pulsar, or cloud-managed options like AWS Kinesis."*

---

### Iggy vs RabbitMQ

| Feature | RabbitMQ | Iggy | Winner |
|---------|----------|------|--------|
| **Messaging Model** | Queue (consume = delete) | Log (consume = read) | **Iggy** |
| **Replay** | No | Yes | **Iggy** |
| **Multiple Consumers** | Competing consumers | Independent offsets | **Iggy** |
| **Message Ordering** | Per-queue | Per-partition | Tie |
| **Persistence** | Optional | Always | **Iggy** |
| **Setup** | Medium | Easy | **Iggy** |

**When to use RabbitMQ**: Task queues, job distribution, work-once semantics.
**When to use Iggy**: Event streaming, audit logs, analytics pipelines, replay scenarios.

---

## Learning Objectives

After completing Year 3.5, you will understand:

### Core Concepts (Interview-Ready)

1. **Event Streaming vs Message Queues**
   - Why logs (Iggy/Kafka) are different from queues (RabbitMQ)
   - When to use each pattern

2. **Producer/Consumer Pattern**
   - Decoupling services with event brokers
   - Fire-and-forget vs request-response

3. **Streams, Topics, Partitions**
   - How events are organized
   - Scaling with partitions

4. **Consumer Groups and Offsets**
   - How consumers track their position
   - Replay semantics
   - Crash recovery

5. **Event-Driven Architecture**
   - Benefits of decoupling
   - Adding consumers without changing producers

6. **Event Sourcing Foundation**
   - Events as source of truth
   - Replaying to reconstruct state
   - (Full event sourcing in Year 6)

---

## Implementation Roadmap

### Phase 1: Infrastructure (Day 1)

**Goal**: Get Iggy running and accessible.

```bash
# 1. Update docker-compose.yml
# 2. docker-compose up -d iggy
# 3. curl http://localhost:3000/health
# 4. npm install @iggy-rs/client
```

**Success**: Iggy container running, HTTP API accessible.

**Read**: IGGY-QUICKSTART.md sections 0-3

---

### Phase 2: Producer Setup (Day 1-2)

**Goal**: API publishes events to Iggy.

**Create**:
- `src/streaming/iggyClientConnectionManager.js`
- `src/streaming/eventEnvelopeFactory.js`
- `src/streaming/iggyProducerClient.js`

**Update**:
- `src/server.js` (initialize Iggy on startup)
- `src/routes/incidentsRouteHandler.js` (publish events)

**Success**: Events appear in Iggy after API calls.

**Read**: IGGY-INTEGRATION-SPECS.md sections "Component 1-3, Component 5"

---

### Phase 3: Consumer Implementation (Day 3-4)

**Goal**: Consumer reads from Iggy and broadcasts via Socket.io.

**Create**:
- `src/streaming/iggyWebSocketBroadcastConsumer.js`

**Update**:
- `src/server.js` (start consumer)

**Success**: Events published → consumed → broadcast to WebSocket clients.

**Read**: IGGY-INTEGRATION-SPECS.md section "Component 4"

---

### Phase 4: Testing & Verification (Day 4-5)

**Goal**: Comprehensive testing of all scenarios.

**Test**:
- Server restart (events persist)
- Iggy restart (consumer reconnects)
- High load (100+ events/sec)
- Monitoring endpoints

**Success**: All tests in IGGY-TESTING-CHECKLIST.md pass.

**Read**: IGGY-TESTING-CHECKLIST.md (all phases)

---

### Phase 5: Documentation & Polish (Day 5)

**Goal**: Production-ready code and docs.

**Tasks**:
- Update README.md
- Update SHOWCASE.md
- Add monitoring dashboard (optional)
- Performance tuning

**Success**: Ready to demo and explain.

---

## How to Observe It Working

### Visual Observation Setup

**Terminal 1: Server Logs**
```bash
npm run dev
# Watch for: 📤 Published, 📥 Received, 📢 Broadcasting
```

**Terminal 2: Iggy Message Count**
```bash
watch -n 1 'curl -s http://localhost:3000/streams/marauders-map/topics/incident-events | jq ".messages_count"'
# Watch count increment in real-time
```

**Terminal 3: Create Incidents**
```bash
TOKEN=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.accessToken')

for i in {1..5}; do
  curl -X POST http://localhost:4001/api/incidents \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"title\":\"Test $i\",\"severity\":\"MISCHIEF\",\"location\":\"HOGWARTS\"}"
  sleep 1
done
```

**Browser Console: WebSocket Client**
```javascript
const socket = io('http://localhost:4001', {
  auth: { token: '<TOKEN>' }
});

socket.on('incident:created', (data) => {
  console.log('📢 Incident created:', data);
});
```

**What You'll See**:
- Terminal 1: `📤 Published → 📥 Received → 📢 Broadcasting`
- Terminal 2: Message count increments: 1, 2, 3, 4, 5
- Terminal 3: API responses (201 Created)
- Browser Console: `📢 Incident created: {...}` events

---

## Key Commands Reference

```bash
# Iggy Health Check
curl http://localhost:3000/health

# List Streams
curl http://localhost:3000/streams

# Topic Message Count
curl -s http://localhost:3000/streams/marauders-map/topics/incident-events | jq ".messages_count"

# Consumer Status
curl http://localhost:4001/api/monitoring/iggy-status

# Iggy Logs
docker logs -f marauders-iggy

# Server Logs
npm run dev

# Restart Iggy
docker-compose restart iggy

# View Messages (Iggy CLI)
iggy-cli message poll -s marauders-map -t incident-events -p 1 --offset 0 --count 10
```

---

## Success Metrics

After completing Year 3.5, you should achieve:

### Functional Metrics

- ✅ API publishes events to Iggy (not direct Socket.io)
- ✅ Events persist across server restarts
- ✅ Consumer resumes from last offset
- ✅ WebSocket clients receive events in real-time
- ✅ Multiple event types (incident.created, incident.updated, incident.resolved)
- ✅ Monitoring endpoints work

### Performance Metrics

- ✅ Producer latency: < 5ms
- ✅ Consumer latency: < 100ms (event creation to broadcast)
- ✅ Throughput: > 100 events/second
- ✅ Zero events lost during restarts

### Code Quality Metrics

- ✅ All functions follow 4-word naming convention
- ✅ Unit test coverage: > 80%
- ✅ Integration tests: pass
- ✅ E2E tests: pass
- ✅ No TODOs or STUBs in code

---

## Common Pitfalls and Solutions

### Pitfall 1: Events Published but Not Consumed

**Symptom**: `📤 Published` logs appear, but no `📥 Received` logs.

**Solution**:
```bash
# 1. Verify consumer started
docker logs marauders-gryffindor-server | grep "Starting WebSocket broadcast consumer"

# 2. Check poll interval
# In consumer code: await sleep(100); // Should be 100-500ms

# 3. Verify events are in Iggy
curl http://localhost:3000/streams/marauders-map/topics/incident-events
```

---

### Pitfall 2: Duplicate Events

**Symptom**: Same incident broadcast multiple times to WebSocket clients.

**Solution**:
```bash
# 1. Check offset tracking
# In consumer code, ensure: currentOffset = message.offset + 1;

# 2. Add idempotency in client
const processedEventIds = new Set();
socket.on('incident:created', (data) => {
  if (processedEventIds.has(data.incident.id)) return;
  processedEventIds.add(data.incident.id);
  // ... handle event
});
```

---

### Pitfall 3: Publishing Blocks API Response

**Symptom**: API responses are slow after adding Iggy.

**Solution**:
```javascript
// ❌ WRONG: Awaiting publish
await publishIncidentCreatedEvent(eventEnvelope);

// ✅ RIGHT: Fire-and-forget
publishIncidentCreatedEvent(eventEnvelope); // No await
```

---

## What's Next? (Future Years)

### Year 4: Frontend Implementation

Connect the React frontend to the event-driven backend.

**Learn**: React state management with real-time events.

---

### Year 5: Analytics Consumer

Add a second consumer that reads the same events for analytics.

```
Iggy Events
├─ Consumer 1: WebSocket Broadcaster (existing)
└─ Consumer 2: Analytics Pipeline (NEW)
   - Aggregate incidents by location
   - Calculate MTTR (mean time to resolution)
   - Update materialized views
```

**Learn**: Multiple independent consumers, CQRS patterns.

---

### Year 6: Event Sourcing (Ravenclaw)

Use Iggy as the event store. Replay events to reconstruct state.

**Learn**: Event sourcing, snapshots, projections.

---

### Year 7: Production Monitoring

Add Prometheus metrics, Grafana dashboards, alerting.

**Learn**: Observability, consumer lag monitoring, SLOs.

---

## FAQs

### Q: Can I use Redis Streams instead of Iggy?

**A**: Yes! Redis Streams is another great option for learning event streaming. Choose Redis if:
- You already have Redis running
- You want simpler setup (Redis CLI familiar)
- You're okay with less separation of concerns

Choose Iggy if:
- You want dedicated event streaming
- You want more Kafka-like semantics
- You want to learn Rust ecosystem tools

---

### Q: Is Iggy production-ready?

**A**: Iggy is in active development and approaching production readiness, but it's younger than Kafka/Pulsar. For learning projects: excellent. For production: evaluate carefully, consider managed services (AWS Kinesis, Confluent Cloud).

---

### Q: How does this relate to Kafka?

**A**: Iggy implements the same core concepts as Kafka:
- Streams (like Kafka topics)
- Topics (like Kafka topics)
- Partitions (for parallelism)
- Consumer groups (for scaling consumers)
- Offsets (for tracking position)

**The learning transfers 1:1 to Kafka.** If you understand Iggy, you understand Kafka's data model.

---

### Q: Can I skip Iggy and just use direct Socket.io?

**A**: For a tiny project, yes. But you lose:
- Persistence (events lost on restart)
- Replay (disconnected clients miss events)
- Decoupling (can't add analytics without changing API)
- Auditability (no event log)

Iggy adds ~1 hour of setup for these massive benefits.

---

### Q: What if Iggy is down?

**A**: The API still works! Events fail to publish (logged), but incidents are saved to PostgreSQL. When Iggy recovers, new events resume. No API downtime.

---

## Resources

### Official Iggy Documentation

- GitHub: https://github.com/iggy-rs/iggy
- Docs: https://iggy.rs/docs

### Iggy Examples

- Getting Started: https://github.com/iggy-rs/iggy/tree/master/examples
- Node.js SDK: https://github.com/iggy-rs/iggy-node-sdk

### Related Technologies

- Kafka: https://kafka.apache.org/
- Pulsar: https://pulsar.apache.org/
- RabbitMQ Streams: https://www.rabbitmq.com/streams.html
- Redis Streams: https://redis.io/topics/streams-intro

---

## Support and Community

### Issues?

1. Check IGGY-TESTING-CHECKLIST.md troubleshooting section
2. Check Iggy GitHub issues: https://github.com/iggy-rs/iggy/issues
3. Join Iggy Discord: (link in Iggy repo)

### Contributing

This integration is open-source. Improvements welcome:
- Better error handling
- Additional event types
- Performance optimizations
- More test coverage

---

## Credits

**Marauder's Map Project**: Learning-focused system design via TDD
**Iggy**: Rust-based message streaming by @iggy-rs
**Inspiration**: Kafka, Pulsar, real-world event-driven architectures

---

## Summary: Your Journey

```
Day 1: Infrastructure
  ├─ Start Iggy
  ├─ Test connection
  └─ Create streams/topics

Day 2: Producer
  ├─ Build event envelope factory
  ├─ Build Iggy producer client
  └─ Refactor route handlers

Day 3: Consumer
  ├─ Build WebSocket broadcaster consumer
  ├─ Implement offset tracking
  └─ Test end-to-end flow

Day 4: Testing
  ├─ Resilience tests
  ├─ Performance tests
  └─ Monitoring tests

Day 5: Polish
  ├─ Documentation
  ├─ Code review
  └─ Demo preparation

Result:
  ✅ Production-grade event streaming
  ✅ Interview-ready knowledge
  ✅ Foundation for Years 4-7
```

---

## Let's Get Started!

1. **Read**: IGGY-QUICKSTART.md (sections 0-4)
2. **Do**: Start Iggy and test connection (5 minutes)
3. **Read**: IGGY-INTEGRATION-SPECS.md (Phase 1)
4. **Do**: Implement infrastructure (30 minutes)
5. **Repeat**: Phase-by-phase until complete

**You've got this.** The docs are comprehensive, the tests are clear, and the architecture is battle-tested.

---

*"The owls are ready. Time to build the Owl Post Office."*

**Version**: 1.0.0 (2026-02-16)
**Status**: Ready for Implementation
**Questions?**: See IGGY-TESTING-CHECKLIST.md troubleshooting section
