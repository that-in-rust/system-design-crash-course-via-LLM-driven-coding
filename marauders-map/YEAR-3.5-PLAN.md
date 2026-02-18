# Year 3.5: Event Streaming with Iggy
### *"The Owl Post Office - Messages That Never Get Lost"*

**Status**: Planning Phase
**Difficulty**: Intermediate-Advanced
**Prerequisites**: Years 1-3 complete
**New Dependency**: Iggy (Rust-based message streaming - `iggyrs/iggy`)

---

## Table of Contents

- [Why This Year Exists](#why-this-year-exists)
- [ELI5 - What Problem Does This Solve?](#eli5---what-problem-does-this-solve)
- [Learning Objectives](#learning-objectives)
- [Architecture: Before vs After](#architecture-before-vs-after)
- [The 3 Concepts You Need](#the-3-concepts-you-need)
- [User Stories](#user-stories)
- [Technical Specifications](#technical-specifications)
- [TDD Test Plan (RED Phase)](#tdd-test-plan-red-phase)
- [Implementation Steps (GREEN Phase)](#implementation-steps-green-phase)
- [5-Minute Taste Test](#5-minute-taste-test)
- [4-Step Learning Path](#4-step-learning-path)
- [Success Criteria](#success-criteria)

---

## Why This Year Exists

Year 3 built real-time features with **direct Socket.io broadcasts**:

```
Route handler → broadcastIncidentCreatedToAllClients() → Socket.io → Clients
```

This works, but has problems at scale:

| Problem | Impact |
|---------|--------|
| Tight coupling | API server IS the broadcaster. If it restarts, in-flight events are lost. |
| No replay | Client disconnected for 5 minutes? Those 5 minutes of events are gone forever. |
| Single consumer | Only Socket.io gets events. Want analytics? Write more code in the route handler. |
| No ordering guarantee | Under load, events can arrive out of order. |
| No persistence | Events exist only in memory for the instant they're emitted. |

Year 3.5 fixes ALL of these by inserting **Iggy** as an event streaming backbone between your API and your consumers.

---

## ELI5 - What Problem Does This Solve?

```
  ANALOGY: IGGY IS THE HOGWARTS OWL POST OFFICE
  =============================================

  Year 3 (without Iggy) - shouting across the Great Hall:

    Harry reports       ┌──────────┐
    an incident ──────> │  Server  │──shout──> Hermione hears it
                        │          │──shout──> Ron hears it
                        │          │           Draco was in the loo.
                        │          │           He MISSED it. Gone forever.
                        └──────────┘


  Year 3.5 (with Iggy) - sending owls through the post office:

    Harry reports       ┌──────────┐           ┌──────────┐
    an incident ──────> │  Server  │──owl──>   │  IGGY    │
                        └──────────┘           │ (Owlery) │
                                               │          │
                                               │ owl #1 ──┼──> Hermione reads it
                                               │ owl #2 ──┼──> Ron reads it
                                               │ owl #3 ──┼──> Draco comes back,
                                               │          │    reads ALL owls
                                               │          │    he missed!
                                               │          │
                                               │ owl #1 ──┼──> Analytics reads it
                                               │ owl #2 ──┼──> Alert system reads it
                                               └──────────┘

  The owls (messages) are STORED in the Owlery (Iggy).
  Anyone can read them. Anytime. In order. Even days later.
```

---

## Learning Objectives

By the end of Year 3.5, you will master:

### Core Concepts
1. **Message Streaming** - Append-only ordered logs (not queues!)
2. **Producers & Consumers** - Decoupled event publishers and subscribers
3. **Streams, Topics, Partitions** - How messages are organized
4. **Consumer Groups** - Multiple consumers reading independently
5. **Offset Tracking** - "Where was I?" for each consumer
6. **Event-Driven Architecture** - Fire-and-forget vs request-response
7. **Replay** - Re-processing historical events

### What Makes Iggy Different from Kafka

```
  ┌──────────────────────────────────────────────────┐
  │              IGGY vs KAFKA                        │
  │                                                   │
  │  Kafka:                                          │
  │  - Written in Java/Scala                         │
  │  - Requires JVM (1GB+ RAM minimum)               │
  │  - Needs ZooKeeper (or KRaft)                    │
  │  - 10+ config files to get started               │
  │  - Production-grade but HEAVY                    │
  │                                                   │
  │  Iggy:                                           │
  │  - Written in Rust                               │
  │  - Single ~15MB binary                           │
  │  - No dependencies (no ZooKeeper, no JVM)        │
  │  - docker run -d iggyrs/iggy:latest              │
  │  - Runs on a Raspberry Pi                        │
  │  - Same concepts: streams, topics, partitions    │
  │                                                   │
  │  Interview line:                                  │
  │  "I chose Iggy over Kafka for the learning       │
  │   project because it has the same streaming      │
  │   semantics with zero operational overhead."     │
  └──────────────────────────────────────────────────┘
```

---

## Architecture: Before vs After

### BEFORE (Year 3): Direct Broadcasting

```
  ┌──────────┐   POST /incidents   ┌──────────────────────────┐
  │  Client   │──────────────────> │     Express Server        │
  └──────────┘                     │                          │
                                   │  1. Save to PostgreSQL   │
                                   │  2. broadcastToAll()     │───> Socket.io ──> Clients
                                   │     (TIGHTLY COUPLED)    │
                                   └──────────────────────────┘

  Problems:
  - Server restart = lost in-flight events
  - One consumer (Socket.io only)
  - No replay for disconnected clients
  - Route handler does too many things
```

### AFTER (Year 3.5): Event Streaming with Iggy

```
  ┌──────────┐   POST /incidents   ┌──────────────┐
  │  Client   │──────────────────> │ Express Server│
  └──────────┘                     │ (PRODUCER)    │
                                   │               │
                                   │ 1. Save to DB │
                                   │ 2. Publish to │──────┐
                                   │    Iggy stream│      │
                                   └──────────────┘      │
                                                          │
                                                          v
                                                   ┌─────────────┐
                                                   │    IGGY      │
                                                   │  ┌─────────┐ │
                                                   │  │ Stream: │ │
                                                   │  │incidents│ │
                                                   │  │         │ │
                                                   │  │ Topic:  │ │
                                                   │  │ events  │ │
                                                   │  │         │ │
                                                   │  │ msg 0   │ │
                                                   │  │ msg 1   │ │
                                                   │  │ msg 2   │ │
                                                   │  │ ...     │ │
                                                   │  └─────────┘ │
                                                   └──────┬──────┘
                                                          │
                               ┌──────────────────────────┼───────────────┐
                               │                          │               │
                               v                          v               v
                        ┌─────────────┐          ┌──────────────┐  ┌───────────┐
                        │  CONSUMER 1 │          │  CONSUMER 2  │  │ CONSUMER 3│
                        │  WebSocket  │          │  Analytics   │  │  Alerts   │
                        │  Broadcaster│          │  Pipeline    │  │  (future) │
                        │             │          │  (future)    │  │           │
                        │ Reads events│          │ Reads same   │  │ Reads same│
                        │ from Iggy   │          │ events       │  │ events    │
                        │ pushes via  │          │ aggregates   │  │ sends     │
                        │ Socket.io   │          │ into views   │  │ alerts    │
                        └─────────────┘          └──────────────┘  └───────────┘

  Benefits:
  - Server restart? Events are persisted in Iggy. Consumer picks up where it left off.
  - Want analytics? Add a consumer. No changes to the API.
  - Client disconnected? Replay from the offset they last read.
  - Route handler only does: save + publish. Single responsibility.
```

---

## The 3 Concepts You Need

```
  ┌─────────────────────────────────────────────────┐
  │                   IGGY SERVER                    │
  │                                                  │
  │  Stream: "marauders-map"     <-- like a database │
  │  ├── Topic: "incident-events" <-- like a table   │
  │  │   ├── Partition 0          <-- ordered log    │
  │  │   │   ├── offset=0: { type: "incident.created", data: {...} }
  │  │   │   ├── offset=1: { type: "incident.updated", data: {...} }
  │  │   │   ├── offset=2: { type: "incident.resolved", data: {...} }
  │  │   │   └── offset=3: { type: "comment.added", data: {...} }
  │  │   └── Partition 1 (optional, for parallelism) │
  │  ├── Topic: "presence-events"                    │
  │  │   └── Partition 0                             │
  │  │       ├── offset=0: { type: "user.connected" }│
  │  │       └── offset=1: { type: "user.disconnected" }
  │  └── Topic: "notification-events"                │
  │      └── ...                                     │
  │                                                  │
  │  Stream = namespace (group related topics)       │
  │  Topic  = ordered append-only log of messages    │
  │  Message = JSON bytes (our event payloads)       │
  └─────────────────────────────────────────────────┘
```

### Key Insight: Log vs Queue

```
  QUEUE (RabbitMQ):                    LOG (Iggy/Kafka):
  ┌─────────────┐                     ┌─────────────────┐
  │ msg → consumer                    │ msg 0            │
  │ msg → consumer                    │ msg 1            │
  │ msg → consumer                    │ msg 2  <-- Consumer A is here
  │                                   │ msg 3            │
  │ Messages VANISH                   │ msg 4  <-- Consumer B is here
  │ after consumption.                │ msg 5            │
  │                                   │                  │
  │ Read once.                        │ Messages PERSIST.│
  │                                   │ Read many times. │
  │                                   │ Each consumer    │
  │                                   │ tracks its own   │
  │                                   │ offset.          │
  └─────────────┘                     └─────────────────┘
```

---

## User Stories

### Epic: Event Streaming Infrastructure

#### US-STREAM-001: Publish Incident Events to Iggy
**As a** backend system
**I want** all incident mutations published to Iggy
**So that** consumers can react independently

**Acceptance Criteria**:
- WHEN an incident is created via POST /api/incidents
- THEN an `incident.created` event SHALL be published to Iggy
- AND the event SHALL contain the full incident object
- AND the event SHALL include metadata (userId, timestamp, eventId)
- AND the API response SHALL NOT wait for consumers to process the event

**Event Schema**:
```json
{
  "eventId": "uuid",
  "eventType": "incident.created",
  "timestamp": "2024-01-15T14:30:00Z",
  "userId": "uuid",
  "data": {
    "id": "uuid",
    "title": "Dark Activity in Forbidden Forest",
    "severity": "CRITICAL",
    "location": "FORBIDDEN_FOREST",
    "status": "OPEN"
  }
}
```

#### US-STREAM-002: Consume Events for WebSocket Broadcasting
**As a** WebSocket broadcaster consumer
**I want to** read events from Iggy and push them to connected clients
**So that** real-time updates are decoupled from the API

**Acceptance Criteria**:
- Consumer SHALL poll Iggy for new events continuously
- WHEN `incident.created` event is received
- THEN SHALL broadcast via Socket.io to all connected clients
- WHEN `incident.updated` event is received
- THEN SHALL broadcast to the specific incident room only
- Consumer SHALL track its own offset (resume after restart)

#### US-STREAM-003: Replay Missed Events
**As a** client that was disconnected
**I want to** receive events I missed during disconnection
**So that** my view is consistent

**Acceptance Criteria**:
- Client SHALL send its last known offset on reconnection
- Server SHALL replay events from that offset forward
- Events SHALL arrive in the correct order
- Duplicate detection SHALL prevent processing the same event twice

#### US-STREAM-004: Multiple Independent Consumers
**As a** system architect
**I want** multiple consumers reading the same events
**So that** I can add capabilities without changing the API

**Acceptance Criteria**:
- WebSocket consumer reads events → pushes to clients
- (Future) Analytics consumer reads events → updates materialized views
- (Future) Notification consumer reads events → creates notifications in DB
- Each consumer tracks its own offset independently
- Adding a new consumer requires ZERO changes to the producer

### Epic: Event Types

#### US-STREAM-005: All Domain Event Types
**As a** system
**I want** well-defined event types for all mutations
**So that** consumers know how to react

**Event Type Catalog**:
```
Stream: marauders-map
└── Topic: incident-events
    ├── incident.created     → Full incident payload
    ├── incident.updated     → Changed fields + incident ID
    ├── incident.resolved    → Incident ID + resolved_by + resolution
    ├── incident.deleted     → Incident ID + deleted_by
    ├── comment.added        → Comment payload + incident ID
    └── severity.escalated   → Old severity → new severity + incident ID

└── Topic: presence-events
    ├── user.connected       → User ID + socket ID + role
    ├── user.disconnected    → User ID + socket ID + reason
    ├── user.joined_room     → User ID + room name
    └── user.left_room       → User ID + room name

└── Topic: auth-events (audit log)
    ├── user.logged_in       → User ID + IP
    ├── user.logged_out      → User ID
    ├── user.registered      → User ID + email
    └── token.refreshed      → User ID
```

---

## Technical Specifications

### Infrastructure

```
  ┌──────────────────────────────────────────────────┐
  │             docker-compose.yml (updated)          │
  │                                                   │
  │  services:                                        │
  │    postgres:                                      │
  │      image: postgres:16-alpine   (existing)       │
  │                                                   │
  │    iggy:                          (NEW)           │
  │      image: iggyrs/iggy:latest                    │
  │      ports:                                       │
  │        - "8090:8090"  (TCP transport)             │
  │      volumes:                                     │
  │        - iggy_data:/data                          │
  │                                                   │
  │  volumes:                                         │
  │    iggy_data:                     (persistent)    │
  └──────────────────────────────────────────────────┘
```

### New Dependencies (Gryffindor)

```json
{
  "@iggy-rs/client": "^0.x.x"
}
```

Or use Iggy's HTTP API directly with `fetch` (Iggy exposes REST endpoints too).

### Event Envelope Schema

Every event published to Iggy follows this envelope:

```javascript
// src/events/eventEnvelopeSchema.js

/**
 * Create a standardized event envelope for Iggy publishing
 * @param {string} eventType - e.g., "incident.created"
 * @param {Object} data - The event payload
 * @param {string} userId - The user who triggered the event
 * @returns {Object} Event envelope
 */
export function createEventEnvelopeForPublishing(eventType, data, userId) {
  return {
    eventId: crypto.randomUUID(),
    eventType: eventType,
    timestamp: new Date().toISOString(),
    source: 'gryffindor-api',
    userId: userId,
    data: data,
  };
}
```

### Producer: Iggy Client Wrapper

```javascript
// src/streaming/iggyProducerClient.js

/**
 * Publish event to Iggy stream
 * @param {string} topicName - e.g., "incident-events"
 * @param {Object} eventEnvelope - Standardized event envelope
 */
export async function publishEventToIggyStream(topicName, eventEnvelope) {
  // Serialize event to JSON bytes
  // Send to Iggy via TCP or HTTP transport
  // Fire-and-forget (don't block the API response)
}
```

### Consumer: WebSocket Broadcaster

```javascript
// src/streaming/iggyWebSocketConsumer.js

/**
 * Continuously poll Iggy for events and broadcast via Socket.io
 * This replaces the direct broadcast calls in route handlers
 */
export async function startWebSocketBroadcastConsumer() {
  // 1. Connect to Iggy
  // 2. Subscribe to "incident-events" topic
  // 3. Poll loop:
  //    - Fetch next batch of messages (from stored offset)
  //    - For each message:
  //      - Deserialize JSON
  //      - Switch on eventType:
  //        - "incident.created" → io.emit('incident:created', data)
  //        - "incident.updated" → io.to(room).emit('incident:updated', data)
  //        - "incident.resolved" → io.emit('incident:resolved', data)
  //    - Update stored offset
  //    - Wait briefly, then poll again
}
```

---

## How Existing Code Changes

### Route Handlers: BEFORE vs AFTER

```javascript
// ============================================
// BEFORE (Year 3) - incidentsRouteHandler.js
// ============================================

router.post('/', authMiddleware, async (req, res) => {
  // 1. Validate input
  // 2. Save to PostgreSQL
  const incident = await createIncidentInDatabase(req.body);

  // 3. DIRECTLY broadcast (tightly coupled)
  broadcastIncidentCreatedToAllClients(incident, req.user);
  //   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //   This call is INSIDE the route handler.
  //   The API knows about WebSockets. Bad coupling.

  return res.status(201).json(incident);
});


// ============================================
// AFTER (Year 3.5) - incidentsRouteHandler.js
// ============================================

router.post('/', authMiddleware, async (req, res) => {
  // 1. Validate input
  // 2. Save to PostgreSQL
  const incident = await createIncidentInDatabase(req.body);

  // 3. Publish event to Iggy (fire-and-forget)
  const event = createEventEnvelopeForPublishing(
    'incident.created',
    incident,
    req.user.userId
  );
  publishEventToIggyStream('incident-events', event);
  //   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //   Route handler ONLY publishes an event.
  //   It doesn't know or care who consumes it.
  //   WebSocket consumer picks it up from Iggy.

  return res.status(201).json(incident);
});
```

### Broadcasting: BEFORE vs AFTER

```
  BEFORE:
  ┌──────────────────┐
  │ Route Handler     │
  │  └─> broadcast()  │──directly──> Socket.io ──> Clients
  └──────────────────┘

  AFTER:
  ┌──────────────────┐    ┌───────┐    ┌──────────────────┐
  │ Route Handler     │    │ IGGY  │    │ WS Consumer      │
  │  └─> publish()    │──> │ ■■■■  │──> │  └─> broadcast() │──> Socket.io ──> Clients
  └──────────────────┘    └───────┘    └──────────────────┘
        PRODUCER          BROKER           CONSUMER
```

---

## TDD Test Plan (RED Phase)

### Test File Structure

```
gryffindor/server/tests/
├── event-publishing.test.js       # Producer tests
├── event-consuming.test.js        # Consumer tests
├── event-envelope.test.js         # Event schema tests
├── event-replay.test.js           # Replay/offset tests
└── iggy-integration.test.js       # End-to-end with real Iggy
```

### Test Cases: Event Envelope

```javascript
describe('Event Envelope Schema', () => {
  test('should_create_envelope_with_required_fields', () => {
    // WHEN: createEventEnvelopeForPublishing('incident.created', data, userId)
    // THEN: envelope has eventId, eventType, timestamp, source, userId, data
  });

  test('should_generate_unique_event_id_each_call', () => {
    // WHEN: Create two envelopes
    // THEN: envelope1.eventId !== envelope2.eventId
  });

  test('should_set_timestamp_to_current_utc_time', () => {
    // THEN: envelope.timestamp is within 1 second of now
  });

  test('should_set_source_to_gryffindor_api_always', () => {
    // THEN: envelope.source === 'gryffindor-api'
  });

  test('should_preserve_original_data_payload_exactly', () => {
    // GIVEN: data = { title: "Test", severity: "CRITICAL" }
    // THEN: envelope.data === data (deep equal)
  });
});
```

### Test Cases: Event Publishing

```javascript
describe('Event Publishing to Iggy', () => {
  test('should_publish_incident_created_event_on_create', async () => {
    // WHEN: POST /api/incidents with valid data
    // THEN: "incident.created" event published to "incident-events" topic
    // AND: event.data contains the created incident
  });

  test('should_publish_incident_updated_event_on_update', async () => {
    // WHEN: PUT /api/incidents/:id
    // THEN: "incident.updated" event published
    // AND: event.data contains updated fields
  });

  test('should_publish_incident_resolved_event_on_resolve', async () => {
    // WHEN: PATCH /api/incidents/:id/resolve
    // THEN: "incident.resolved" event published
  });

  test('should_not_block_api_response_on_publish_failure', async () => {
    // GIVEN: Iggy is unreachable
    // WHEN: POST /api/incidents
    // THEN: API returns 201 (incident saved to DB)
    // AND: Publish failure is logged but does not affect response
  });

  test('should_include_user_context_in_every_event', async () => {
    // THEN: event.userId matches the authenticated user
  });
});
```

### Test Cases: Event Consuming

```javascript
describe('WebSocket Broadcast Consumer', () => {
  test('should_broadcast_incident_created_to_all_clients', async () => {
    // GIVEN: Consumer is running
    // WHEN: "incident.created" event appears in Iggy
    // THEN: io.emit('incident:created', data) is called
  });

  test('should_broadcast_incident_updated_to_room_only', async () => {
    // WHEN: "incident.updated" event for incident #42
    // THEN: io.to('incident:42').emit('incident:updated', data)
  });

  test('should_track_consumer_offset_after_processing', async () => {
    // GIVEN: Consumer processes messages at offsets 0, 1, 2
    // WHEN: Consumer restarts
    // THEN: Consumer resumes from offset 3 (not from 0)
  });

  test('should_handle_deserialization_errors_gracefully', async () => {
    // GIVEN: Malformed message in Iggy
    // THEN: Consumer logs error and skips to next message
    // AND: Consumer does NOT crash
  });
});
```

### Test Cases: Event Replay

```javascript
describe('Event Replay for Reconnection', () => {
  test('should_replay_events_from_given_offset', async () => {
    // GIVEN: 10 events in Iggy (offsets 0-9)
    // WHEN: Client reconnects with lastOffset=5
    // THEN: Events 6, 7, 8, 9 are sent to that client
  });

  test('should_replay_events_in_correct_order', async () => {
    // THEN: Events arrive in offset order (6 before 7 before 8)
  });

  test('should_return_empty_if_client_is_caught_up', async () => {
    // GIVEN: 10 events, client's lastOffset = 9
    // THEN: No events replayed (already caught up)
  });
});
```

---

## Implementation Steps (GREEN Phase)

### Phase 1: Infrastructure Setup

**Step 1**: Add Iggy to docker-compose.yml

```yaml
# Add to existing docker-compose.yml
  iggy:
    image: iggyrs/iggy:latest
    container_name: iggy
    ports:
      - "8090:8090"    # TCP transport
      - "3000:3000"    # HTTP API (optional)
    volumes:
      - iggy_data:/data
    restart: unless-stopped
```

**Step 2**: Create Iggy client wrapper

```
gryffindor/server/src/streaming/
├── iggyClientConnection.js        # Connection management
├── iggyProducerClient.js          # Publish events
├── iggyConsumerWebSocket.js       # Consume → Socket.io
└── eventEnvelopeSchema.js         # Event envelope factory
```

### Phase 2: Producer (Publish Events)

**Step 3**: Create event envelope factory
**Step 4**: Create Iggy producer client
**Step 5**: Refactor route handlers to publish events instead of direct broadcasts

### Phase 3: Consumer (WebSocket Broadcaster)

**Step 6**: Create WebSocket broadcast consumer
**Step 7**: Implement offset tracking (in PostgreSQL or local file)
**Step 8**: Start consumer alongside Express server

### Phase 4: Replay & Reconnection

**Step 9**: Add reconnection handler with offset
**Step 10**: Implement replay endpoint: `GET /api/events/replay?fromOffset=N`

---

## 5-Minute Taste Test

Before touching ANY Marauder's Map code, try Iggy standalone:

### Terminal 1: Start Iggy

```bash
docker run -d --name iggy -p 8090:8090 iggyrs/iggy:latest
```

One container. No config files. No ZooKeeper. Running.

### Terminal 2: Produce Messages (Python)

```bash
pip install iggy-py-sdk loguru
python examples/python/getting-started/producer.py
```

```
  ┌──────────────┐         ┌─────────────┐
  │  producer.py  │────────>│ Iggy :8090  │
  │               │  TCP    │             │
  │  1. connect   │         │ Stream:     │
  │  2. login     │         │ sample-stream│
  │  3. create    │         │ Topic:      │
  │     stream    │         │ sample-topic│
  │  4. create    │         │             │
  │     topic     │         │ [50 msgs    │
  │  5. send 5    │         │  stored]    │
  │     batches   │         │             │
  │     x 10 msgs │         │             │
  └──────────────┘         └─────────────┘
```

### Terminal 3: Consume Messages (Python)

```bash
python examples/python/getting-started/consumer.py
```

```
  ┌─────────────┐         ┌──────────────┐
  │ Iggy :8090  │────────>│ consumer.py   │
  │             │  TCP    │               │
  │ [50 msgs]   │  poll   │ 1. connect    │
  │             │         │ 2. login      │
  │ offset 0────┼────────>│ 3. poll msgs  │
  │ offset 1────┼────────>│ 4. print      │
  │ ...         │         │ 5. repeat     │
  │ offset 49───┼────────>│               │
  └─────────────┘         └──────────────┘
```

### Key Insight

Run `consumer.py` AGAIN. The messages are still there. Iggy stores them.
Unlike a queue (RabbitMQ) where messages vanish after consumption,
Iggy keeps them like a log. Run consumer 10 times, get the same 50 messages 10 times.

---

## 4-Step Learning Path

```
  ┌─────────┐  ┌─────────────┐  ┌──────────┐  ┌───────────────┐
  │ Step 1  │─>│ Step 2      │─>│ Step 3   │─>│ Step 4        │
  │ vanilla │  │ real payload │  │ glue     │  │ "aha, THIS is │
  │ hello   │  │ JSON events  │  │ code:    │  │  what event   │
  │ world   │  │ incident     │  │ consume  │  │  streaming    │
  │ (above) │  │ objects      │  │ from Iggy│  │  does!"       │
  │         │  │              │  │ push to  │  │               │
  │         │  │              │  │ Socket.io│  │ Replace direct│
  │         │  │              │  │          │  │ broadcasts    │
  └─────────┘  └─────────────┘  └──────────┘  └───────────────┘
```

**Step 1**: Run the 5-minute taste test (docker + produce + consume)

**Step 2**: Modify producer to send Marauder's Map incident events:
```json
{
  "eventType": "incident.created",
  "data": {
    "id": "uuid",
    "title": "Suspicious activity near Room of Requirement",
    "severity": "CRITICAL"
  }
}
```

**Step 3**: Write a Node.js script that:
- Consumes from Iggy
- Pushes each event to Socket.io
- (This is the "glue code" the consumer replaces)

**Step 4**: Now you understand EXACTLY what the
`iggyConsumerWebSocket.js` consumer automates. Integrate it.

---

## Event Flow Diagrams

### Happy Path: Incident Creation

```
  Time ──────────────────────────────────────────────────>

  Harry (Client)     Express API        Iggy           WS Consumer     Hermione (Client)
  │                  │                  │              │               │
  │─POST /incidents─>│                  │              │               │
  │                  │─INSERT INTO DB──>│              │               │
  │                  │                  │              │               │
  │                  │─publish event───>│              │               │
  │<─201 Created─────│                  │              │               │
  │                  │                  │              │               │
  │    (Harry sees   │                  │─poll────────>│               │
  │     response     │                  │<─event batch─│               │
  │     immediately) │                  │              │               │
  │                  │                  │              │─io.emit──────>│
  │                  │                  │              │               │
  │                  │                  │              │  (Hermione    │
  │                  │                  │              │   sees new    │
  │                  │                  │              │   incident    │
  │                  │                  │              │   in real-time)
```

### Reconnection with Replay

```
  Draco (Client)              Iggy              WS Consumer
  │                           │                 │
  │─── connected ────────────>│                 │
  │    (offset = 5)           │                 │
  │                           │                 │
  │─── disconnected ──x       │                 │
  │    (WiFi died)            │                 │
  │                           │                 │
  │                     msg 6 arrives           │
  │                     msg 7 arrives           │
  │                     msg 8 arrives           │
  │                           │                 │
  │─── reconnects ───────────>│                 │
  │    (lastOffset: 5)        │                 │
  │                           │─replay 6,7,8──>│
  │                           │                 │─push to Draco─>│
  │                           │                 │                │
  │    (Draco catches up.     │                 │                │
  │     No events lost.)      │                 │                │
```

---

## How This Connects to Future Years

```
  Year 3    Year 3.5         Year 5           Year 6           Year 7
  ──────    ────────         ──────           ──────           ──────
  Direct    Iggy event       Analytics        CQRS/Event       Production
  Socket.io streaming        consumer         Sourcing         (Prometheus
  broadcasts backbone        reads from       reads from       metrics on
              │              Iggy →           Iggy event       Iggy consumer
              │              materialized     store            lag)
              │              views
              │                │                │                │
              └────────────────┴────────────────┴────────────────┘
                    All built on the same Iggy streaming layer
```

| Year | What Iggy Enables |
|------|-------------------|
| 3.5 | Decouple API from WebSocket broadcasting |
| 5 | Analytics consumer: aggregate events into materialized views in real-time |
| 6 (Ravenclaw) | Event Sourcing: Iggy IS the event store. Replay to reconstruct state. |
| 6 (Slytherin) | CQRS: Commands publish to Iggy, read-side consumers update query models. |
| 7 | Monitor consumer lag. Alert if consumers fall behind. Prometheus metrics. |

---

## Success Criteria

### Functional Requirements

- [ ] Iggy runs as a Docker container alongside PostgreSQL
- [ ] All incident mutations publish events to Iggy
- [ ] WebSocket consumer reads from Iggy and broadcasts via Socket.io
- [ ] Events persist across server restarts
- [ ] Consumer resumes from last offset after restart
- [ ] Replay endpoint works for reconnecting clients
- [ ] Adding a new consumer requires ZERO changes to the API

### Performance Requirements

- [ ] Event publish adds < 5ms to API response time
- [ ] Consumer processes events within 50ms of publication
- [ ] Replay of 100 events completes in < 200ms

### Code Quality

- [ ] All tests passing (envelope, publish, consume, replay)
- [ ] 100% of functions follow 4-word naming convention
- [ ] Event schema documented with TypeScript/JSDoc types
- [ ] Iggy connection handles reconnection gracefully

### Interview-Ready Concepts

After completing Year 3.5, you can explain:

- [ ] Difference between a message queue and an event log
- [ ] Why event streaming enables independent consumers
- [ ] How offset tracking provides crash recovery
- [ ] Why decoupling producers from consumers improves scalability
- [ ] How replay enables catch-up for disconnected clients
- [ ] Trade-offs: eventual consistency vs. immediate broadcasting

---

## ASCII Summary: The Whole Picture After Year 3.5

```
  ┌─────────────────────────────────────────────────────────────┐
  │               THE MARAUDER'S MAP v3.5                       │
  │                                                             │
  │   Browser/Client                                            │
  │   ┌──────────────────────────────────────────────────┐     │
  │   │  HTTP (REST)              WebSocket (WS)          │     │
  │   │  - Login                  - Live incidents         │     │
  │   │  - CRUD incidents         - Who's online           │     │
  │   │  - Get notifications      - Typing indicators      │     │
  │   │                           - Replay missed events   │ NEW│
  │   └────────┬─────────────────────────┬────────────────┘     │
  │            │                         │                       │
  │            v                         v                       │
  │   ┌──────────────────┐    ┌──────────────────┐             │
  │   │  EXPRESS SERVER   │    │  SOCKET.IO        │             │
  │   │  (PRODUCER)       │    │  (powered by      │             │
  │   │                   │    │   consumer, not    │             │
  │   │  1. Validate      │    │   direct calls)    │             │
  │   │  2. Save to DB    │    └────────┬───────────┘             │
  │   │  3. Publish to    │             │                         │
  │   │     Iggy stream   │             │ reads from              │
  │   └────────┬──────────┘             │                         │
  │            │ publish                │                         │
  │            v                        v                         │
  │   ┌────────────────────────────────────────┐                 │
  │   │               IGGY SERVER               │        NEW     │
  │   │                                        │                 │
  │   │  Stream: marauders-map                 │                 │
  │   │  ├── Topic: incident-events            │                 │
  │   │  ├── Topic: presence-events            │                 │
  │   │  └── Topic: auth-events                │                 │
  │   │                                        │                 │
  │   │  Consumers:                            │                 │
  │   │  ├── WebSocket Broadcaster (active)    │                 │
  │   │  ├── Analytics Pipeline    (Year 5)    │                 │
  │   │  └── Notification Service  (Year 5)    │                 │
  │   └────────────────────────────────────────┘                 │
  │                                                             │
  │   ┌──────────────────────────────────────────────────┐     │
  │   │          POSTGRESQL (Gringotts)                   │     │
  │   │  8 tables | enums | triggers | indexes            │     │
  │   └──────────────────────────────────────────────────┘     │
  │                                                             │
  │   Built with: TDD | 4-word naming | Event-driven arch       │
  │   Streaming:  Iggy (Rust) | Streams/Topics/Offsets          │
  └─────────────────────────────────────────────────────────────┘
```

---

**"Messages that never get lost - the Owl Post of Hogwarts engineering!"**

*Built with Iggy (Rust-based streaming), decoupled with producer/consumer patterns, resilient with offset tracking*
