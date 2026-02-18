# Iggy Event Streaming Integration - Technical Specifications
## *"The Owl Post Office - Messages That Never Get Lost"*

**Version**: 1.0.0
**Status**: Ready for Implementation
**Target**: Marauder's Map Year 3.5
**Date**: 2026-02-16

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [System Architecture Overview](#system-architecture-overview)
- [What Needs to Be Built](#what-needs-to-be-built)
- [Docker Infrastructure Setup](#docker-infrastructure-setup)
- [Event Schema Specifications](#event-schema-specifications)
- [Implementation Components](#implementation-components)
- [Observability and Monitoring](#observability-and-monitoring)
- [Step-by-Step Implementation Order](#step-by-step-implementation-order)
- [How to Verify It Works](#how-to-verify-it-works)
- [Testing Strategy](#testing-strategy)
- [Troubleshooting Guide](#troubleshooting-guide)

---

## Executive Summary

### What Problem Are We Solving?

Currently, the Marauder's Map API directly broadcasts real-time events to Socket.io clients:

```
Route Handler → broadcastIncidentCreatedToAllClients() → Socket.io → Clients
```

**Problems with this approach:**
1. **Tight coupling** - API server IS the broadcaster
2. **No persistence** - Events exist only in memory
3. **No replay** - Disconnected clients miss events forever
4. **Single consumer** - Only Socket.io gets events
5. **No auditability** - No event log for debugging

### The Solution: Iggy Event Streaming

Insert Iggy as an event streaming backbone between the API and consumers:

```
Route Handler → Publish to Iggy → [Persistent Event Log] → Consumer → Socket.io → Clients
                                   ↓
                                   Analytics Consumer (future)
                                   ↓
                                   Alerts Consumer (future)
```

**Benefits:**
- ✅ **Decoupled** - API doesn't know about consumers
- ✅ **Persistent** - Events survive server restarts
- ✅ **Replayable** - Clients can catch up on missed events
- ✅ **Multiple consumers** - Add analytics/alerts without touching API
- ✅ **Auditable** - Complete event log for debugging

---

## System Architecture Overview

### Current Architecture (Year 3)

```
┌─────────────────────────────────────────────────────────────┐
│                    YEAR 3: DIRECT BROADCASTING              │
│                                                             │
│  Client (Browser)                                           │
│  │                                                          │
│  ├─HTTP─────> Express Server ─────> PostgreSQL             │
│  │            (22 endpoints)         (8 tables)             │
│  │                 │                                        │
│  │                 └─broadcastIncidentCreatedToAllClients() │
│  │                              │                           │
│  └─WebSocket──< Socket.io  <───┘                           │
│                                                             │
│  Problems:                                                  │
│  - Tight coupling between API and WebSocket                 │
│  - Events lost on server restart                            │
│  - No replay for disconnected clients                       │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (Year 3.5)

```
┌─────────────────────────────────────────────────────────────┐
│                  YEAR 3.5: EVENT STREAMING                  │
│                                                             │
│  Client (Browser)                                           │
│  │                                                          │
│  ├─HTTP─────> Express Server ─────> PostgreSQL             │
│  │            (PRODUCER)             (8 tables)             │
│  │                 │                                        │
│  │                 └─publishEventToIggyStream()             │
│  │                              │                           │
│  │                              v                           │
│  │                      ┌──────────────┐                    │
│  │                      │     IGGY     │                    │
│  │                      │ Event Broker │                    │
│  │                      │              │                    │
│  │                      │ Stream:      │                    │
│  │                      │ marauders-map│                    │
│  │                      │              │                    │
│  │                      │ Topics:      │                    │
│  │                      │ ├─incident-events                 │
│  │                      │ ├─presence-events                 │
│  │                      │ └─auth-events                     │
│  │                      │              │                    │
│  │                      │ [msg 0]      │                    │
│  │                      │ [msg 1]      │                    │
│  │                      │ [msg 2]      │                    │
│  │                      │ ...          │                    │
│  │                      └──────┬───────┘                    │
│  │                             │                            │
│  │                             v                            │
│  │                      WebSocket Consumer                  │
│  │                      (CONSUMER 1)                        │
│  │                             │                            │
│  │                             v                            │
│  └─WebSocket──< Socket.io  <──┘                            │
│                                                             │
│  Future Consumers:                                          │
│  - Analytics Pipeline (Year 5)                              │
│  - Alerts/Notifications (Year 5)                            │
│  - Audit Log Exporter (Year 7)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## What Needs to Be Built

### Component Checklist

- [ ] **Infrastructure**
  - [ ] Add Iggy to docker-compose.yml
  - [ ] Configure Iggy ports and volumes
  - [ ] Test Iggy connectivity

- [ ] **Producer (API Side)**
  - [ ] Iggy client connection manager
  - [ ] Event envelope factory
  - [ ] Event publishing wrapper
  - [ ] Refactor route handlers to publish events

- [ ] **Consumer (WebSocket Side)**
  - [ ] WebSocket broadcaster consumer
  - [ ] Offset tracking mechanism
  - [ ] Consumer polling loop
  - [ ] Error handling and retries

- [ ] **Event Schema**
  - [ ] Event envelope standard format
  - [ ] Incident event types
  - [ ] Presence event types
  - [ ] Auth event types (optional)

- [ ] **Monitoring & Observability**
  - [ ] Logging for publish/consume operations
  - [ ] Health check endpoints
  - [ ] Consumer lag monitoring

---

## Docker Infrastructure Setup

### Step 1: Update docker-compose.yml

Add Iggy service to the existing docker-compose.yml:

```yaml
# ============================================================================
# Add this section to docker-compose.yml
# ============================================================================

services:
  # ... existing gringotts service ...

  # ==========================================================================
  # Iggy - Event Streaming Broker (Year 3.5)
  # ==========================================================================
  iggy:
    image: iggyrs/iggy:latest
    container_name: marauders-iggy
    restart: unless-stopped
    ports:
      - "8090:8090"    # TCP transport for producers/consumers
      - "3000:3000"    # HTTP API for monitoring and admin
    volumes:
      - iggy-data:/data
    environment:
      # Iggy uses sensible defaults, minimal config needed
      - IGGY_DATA_DIR=/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - marauders-network

# ============================================================================
# Add volume for Iggy data persistence
# ============================================================================

volumes:
  gringotts-data:
    name: marauders-gringotts-data
  iggy-data:    # NEW
    name: marauders-iggy-data
```

### Step 2: Start Iggy

```bash
# From marauders-map/ directory
docker-compose up -d iggy

# Verify Iggy is running
docker ps | grep iggy

# Check Iggy logs
docker logs marauders-iggy

# Test Iggy HTTP API
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "version": "0.x.x"
}
```

### Iggy Ports Explained

| Port | Protocol | Purpose | Used By |
|------|----------|---------|---------|
| **8090** | TCP | Binary transport | Producers & Consumers (Node.js client) |
| **3000** | HTTP | REST API | Admin, monitoring, CLI tools |

---

## Event Schema Specifications

### Event Envelope Format

ALL events published to Iggy follow this standardized envelope:

```javascript
{
  "eventId": "uuid-v4",           // Unique event identifier
  "eventType": "incident.created", // Dot-notation event type
  "timestamp": "2024-01-15T14:30:00.000Z", // ISO 8601 UTC
  "source": "gryffindor-api",     // Always "gryffindor-api"
  "userId": "uuid-v4",            // User who triggered the event
  "metadata": {                   // Optional metadata
    "traceId": "uuid",            // For distributed tracing (future)
    "version": "1.0"              // Schema version
  },
  "data": {                       // Event-specific payload
    // ... event-specific fields ...
  }
}
```

### Incident Event Types

#### 1. incident.created

**When**: POST /api/incidents succeeds

```javascript
{
  "eventId": "123e4567-e89b-12d3-a456-426614174000",
  "eventType": "incident.created",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "source": "gryffindor-api",
  "userId": "user-uuid",
  "data": {
    "id": 42,
    "title": "Dark Activity in Forbidden Forest",
    "description": "Unusual sounds reported near the Acromantula colony",
    "severity": "CRITICAL",
    "location": "FORBIDDEN_FOREST",
    "status": "OPEN",
    "reported_by": "user-uuid",
    "reported_at": "2024-01-15T14:30:00.000Z"
  }
}
```

#### 2. incident.updated

**When**: PUT /api/incidents/:id succeeds

```javascript
{
  "eventId": "...",
  "eventType": "incident.updated",
  "timestamp": "...",
  "source": "gryffindor-api",
  "userId": "user-uuid",
  "data": {
    "id": 42,
    "updatedFields": {
      "severity": "UNFORGIVABLE",  // Changed fields only
      "description": "Confirmed dark magic presence"
    },
    "previousValues": {
      "severity": "CRITICAL"
    },
    "incident": {
      // Full incident object after update
      "id": 42,
      "title": "Dark Activity in Forbidden Forest",
      "severity": "UNFORGIVABLE",
      // ... all fields ...
    }
  }
}
```

#### 3. incident.resolved

**When**: DELETE /api/incidents/:id succeeds (soft delete/resolve)

```javascript
{
  "eventId": "...",
  "eventType": "incident.resolved",
  "timestamp": "...",
  "source": "gryffindor-api",
  "userId": "user-uuid",
  "data": {
    "incidentId": 42,
    "resolvedBy": "user-uuid",
    "resolvedAt": "2024-01-15T15:00:00.000Z",
    "resolution": "Incident resolved by Hermione Granger"
  }
}
```

### Presence Event Types

#### 4. presence.connected

**When**: Socket.io client connects

```javascript
{
  "eventId": "...",
  "eventType": "presence.connected",
  "timestamp": "...",
  "source": "gryffindor-api",
  "userId": "user-uuid",
  "data": {
    "socketId": "socket-id-abc123",
    "user": {
      "userId": "user-uuid",
      "firstName": "Harry",
      "lastName": "Potter",
      "role": "ADMIN"
    }
  }
}
```

#### 5. presence.disconnected

**When**: Socket.io client disconnects

```javascript
{
  "eventId": "...",
  "eventType": "presence.disconnected",
  "timestamp": "...",
  "source": "gryffindor-api",
  "userId": "user-uuid",
  "data": {
    "socketId": "socket-id-abc123",
    "reason": "transport close"
  }
}
```

### Comment Event Types

#### 6. comment.created

**When**: POST /api/incidents/:id/comments succeeds (if implemented)

```javascript
{
  "eventId": "...",
  "eventType": "comment.created",
  "timestamp": "...",
  "source": "gryffindor-api",
  "userId": "user-uuid",
  "data": {
    "commentId": 123,
    "incidentId": 42,
    "content": "I've investigated the area - confirmed dark magic presence",
    "author": {
      "userId": "user-uuid",
      "firstName": "Hermione",
      "lastName": "Granger"
    }
  }
}
```

---

## Implementation Components

### Component 1: Iggy Client Connection Manager

**File**: `gryffindor/server/src/streaming/iggyClientConnectionManager.js`

**Purpose**: Manage connection to Iggy, handle reconnection, expose connection instance.

```javascript
// ============================================================================
// Iggy Client Connection Manager - Year 3.5
// ============================================================================
// Manages connection lifecycle to Iggy streaming server
// Uses Iggy Node.js client library
// ============================================================================

import { IggyClient } from '@iggy-rs/client';

let iggyClient = null;

/**
 * Initialize Iggy client connection
 * @returns {Promise<IggyClient>} Connected Iggy client instance
 */
export async function initializeIggyClientConnection() {
  try {
    const iggyHost = process.env.IGGY_HOST || 'localhost';
    const iggyPort = parseInt(process.env.IGGY_PORT || '8090', 10);

    console.log(`🦉 Connecting to Iggy at ${iggyHost}:${iggyPort}...`);

    iggyClient = new IggyClient({
      host: iggyHost,
      port: iggyPort,
      // Use binary TCP transport by default (faster than HTTP)
      transport: 'tcp'
    });

    await iggyClient.connect();

    // Login with default credentials (or from env vars)
    const username = process.env.IGGY_USERNAME || 'iggy';
    const password = process.env.IGGY_PASSWORD || 'iggy';

    await iggyClient.login(username, password);

    console.log('✅ Connected to Iggy event broker');

    return iggyClient;

  } catch (error) {
    console.error('❌ Failed to connect to Iggy:', error);
    throw error;
  }
}

/**
 * Get existing Iggy client instance
 * @returns {IggyClient|null} Iggy client or null if not initialized
 */
export function getIggyClientInstance() {
  return iggyClient;
}

/**
 * Close Iggy client connection gracefully
 * @returns {Promise<void>}
 */
export async function closeIggyClientConnection() {
  if (iggyClient) {
    try {
      await iggyClient.disconnect();
      console.log('✅ Iggy connection closed');
    } catch (error) {
      console.error('Error closing Iggy connection:', error);
    }
  }
}

export default {
  initializeIggyClientConnection,
  getIggyClientInstance,
  closeIggyClientConnection
};
```

---

### Component 2: Event Envelope Factory

**File**: `gryffindor/server/src/streaming/eventEnvelopeFactory.js`

**Purpose**: Create standardized event envelopes for all events.

```javascript
// ============================================================================
// Event Envelope Factory - Year 3.5
// ============================================================================
// Creates standardized event envelopes following 4-word naming convention
// All events follow the same structure for consistency
// ============================================================================

import { randomUUID } from 'crypto';

/**
 * Create event envelope for publishing
 * @param {string} eventType - Event type (e.g., "incident.created")
 * @param {Object} data - Event-specific payload
 * @param {string} userId - User ID who triggered the event
 * @returns {Object} Event envelope
 */
export function createEventEnvelopeForPublishing(eventType, data, userId) {
  return {
    eventId: randomUUID(),
    eventType: eventType,
    timestamp: new Date().toISOString(),
    source: 'gryffindor-api',
    userId: userId,
    metadata: {
      version: '1.0'
    },
    data: data
  };
}

/**
 * Create incident created event envelope
 * @param {Object} incident - Incident object from database
 * @param {string} userId - User ID who created the incident
 * @returns {Object} Event envelope
 */
export function createIncidentCreatedEventEnvelope(incident, userId) {
  return createEventEnvelopeForPublishing(
    'incident.created',
    {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      location: incident.location,
      status: incident.status,
      reported_by: incident.reported_by,
      reported_at: incident.reported_at
    },
    userId
  );
}

/**
 * Create incident updated event envelope
 * @param {Object} incident - Updated incident object
 * @param {Object} updatedFields - Fields that changed
 * @param {string} userId - User ID who updated the incident
 * @returns {Object} Event envelope
 */
export function createIncidentUpdatedEventEnvelope(incident, updatedFields, userId) {
  return createEventEnvelopeForPublishing(
    'incident.updated',
    {
      id: incident.id,
      updatedFields: updatedFields,
      incident: incident
    },
    userId
  );
}

/**
 * Create incident resolved event envelope
 * @param {number} incidentId - Incident ID
 * @param {string} userId - User ID who resolved the incident
 * @param {string} resolution - Resolution text
 * @returns {Object} Event envelope
 */
export function createIncidentResolvedEventEnvelope(incidentId, userId, resolution) {
  return createEventEnvelopeForPublishing(
    'incident.resolved',
    {
      incidentId: incidentId,
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
      resolution: resolution
    },
    userId
  );
}

/**
 * Create presence connected event envelope
 * @param {string} socketId - Socket.io connection ID
 * @param {string} userId - User ID
 * @param {Object} user - User details
 * @returns {Object} Event envelope
 */
export function createPresenceConnectedEventEnvelope(socketId, userId, user) {
  return createEventEnvelopeForPublishing(
    'presence.connected',
    {
      socketId: socketId,
      user: user
    },
    userId
  );
}

/**
 * Create presence disconnected event envelope
 * @param {string} socketId - Socket.io connection ID
 * @param {string} userId - User ID
 * @param {string} reason - Disconnection reason
 * @returns {Object} Event envelope
 */
export function createPresenceDisconnectedEventEnvelope(socketId, userId, reason) {
  return createEventEnvelopeForPublishing(
    'presence.disconnected',
    {
      socketId: socketId,
      reason: reason
    },
    userId
  );
}

export default {
  createEventEnvelopeForPublishing,
  createIncidentCreatedEventEnvelope,
  createIncidentUpdatedEventEnvelope,
  createIncidentResolvedEventEnvelope,
  createPresenceConnectedEventEnvelope,
  createPresenceDisconnectedEventEnvelope
};
```

---

### Component 3: Iggy Producer Client

**File**: `gryffindor/server/src/streaming/iggyProducerClient.js`

**Purpose**: Publish events to Iggy streams.

```javascript
// ============================================================================
// Iggy Producer Client - Year 3.5
// ============================================================================
// Publishes events to Iggy streams (fire-and-forget pattern)
// Does NOT block API responses
// ============================================================================

import { getIggyClientInstance } from './iggyClientConnectionManager.js';

/**
 * Publish event to Iggy stream
 * @param {string} streamName - Stream name (e.g., "marauders-map")
 * @param {string} topicName - Topic name (e.g., "incident-events")
 * @param {Object} eventEnvelope - Event envelope to publish
 * @returns {Promise<void>}
 */
export async function publishEventToIggyStream(streamName, topicName, eventEnvelope) {
  try {
    const iggyClient = getIggyClientInstance();

    if (!iggyClient) {
      console.warn('⚠️  Iggy client not initialized, event not published');
      return;
    }

    // Serialize event to JSON
    const messagePayload = JSON.stringify(eventEnvelope);

    // Send message to Iggy
    // Iggy automatically creates streams and topics if they don't exist
    await iggyClient.sendMessages({
      streamId: streamName,
      topicId: topicName,
      partitionId: 1, // Use partition 1 by default (can scale to multiple partitions later)
      messages: [
        {
          id: eventEnvelope.eventId,
          payload: Buffer.from(messagePayload, 'utf-8')
        }
      ]
    });

    console.log(`📤 Published event: ${eventEnvelope.eventType} (ID: ${eventEnvelope.eventId})`);

  } catch (error) {
    // Log error but DON'T throw - we don't want to break API responses
    console.error('❌ Failed to publish event to Iggy:', error);
    console.error('Event envelope:', eventEnvelope);

    // Future: Add dead letter queue or retry mechanism
  }
}

/**
 * Publish incident created event
 * @param {Object} eventEnvelope - Event envelope
 * @returns {Promise<void>}
 */
export async function publishIncidentCreatedEvent(eventEnvelope) {
  await publishEventToIggyStream('marauders-map', 'incident-events', eventEnvelope);
}

/**
 * Publish incident updated event
 * @param {Object} eventEnvelope - Event envelope
 * @returns {Promise<void>}
 */
export async function publishIncidentUpdatedEvent(eventEnvelope) {
  await publishEventToIggyStream('marauders-map', 'incident-events', eventEnvelope);
}

/**
 * Publish incident resolved event
 * @param {Object} eventEnvelope - Event envelope
 * @returns {Promise<void>}
 */
export async function publishIncidentResolvedEvent(eventEnvelope) {
  await publishEventToIggyStream('marauders-map', 'incident-events', eventEnvelope);
}

/**
 * Publish presence event
 * @param {Object} eventEnvelope - Event envelope
 * @returns {Promise<void>}
 */
export async function publishPresenceEvent(eventEnvelope) {
  await publishEventToIggyStream('marauders-map', 'presence-events', eventEnvelope);
}

export default {
  publishEventToIggyStream,
  publishIncidentCreatedEvent,
  publishIncidentUpdatedEvent,
  publishIncidentResolvedEvent,
  publishPresenceEvent
};
```

---

### Component 4: WebSocket Broadcast Consumer

**File**: `gryffindor/server/src/streaming/iggyWebSocketBroadcastConsumer.js`

**Purpose**: Consume events from Iggy and broadcast via Socket.io.

```javascript
// ============================================================================
// Iggy WebSocket Broadcast Consumer - Year 3.5
// ============================================================================
// Continuously polls Iggy for events and broadcasts via Socket.io
// Replaces direct broadcast calls in route handlers
// ============================================================================

import { getIggyClientInstance } from './iggyClientConnectionManager.js';
import { getSocketServerInstance } from '../websocket/socketServer.js';

let isConsuming = false;
let currentOffset = 0; // Track offset for resumption

/**
 * Start WebSocket broadcast consumer
 * @returns {Promise<void>}
 */
export async function startWebSocketBroadcastConsumer() {
  if (isConsuming) {
    console.warn('⚠️  Consumer already running');
    return;
  }

  isConsuming = true;
  console.log('🦉 Starting WebSocket broadcast consumer...');

  // Start consuming from both topics
  consumeIncidentEvents();
  consumePresenceEvents();

  console.log('✅ WebSocket broadcast consumer started');
}

/**
 * Consume incident events from Iggy
 * @returns {Promise<void>}
 */
async function consumeIncidentEvents() {
  while (isConsuming) {
    try {
      const iggyClient = getIggyClientInstance();
      const io = getSocketServerInstance();

      if (!iggyClient || !io) {
        await sleep(1000);
        continue;
      }

      // Poll Iggy for new messages
      const response = await iggyClient.pollMessages({
        streamId: 'marauders-map',
        topicId: 'incident-events',
        partitionId: 1,
        consumer: {
          kind: 'consumer',
          id: 'websocket-broadcaster'
        },
        offset: currentOffset,
        count: 10, // Batch size
        autoCommit: false
      });

      if (response.messages && response.messages.length > 0) {
        console.log(`📥 Received ${response.messages.length} incident events from Iggy`);

        for (const message of response.messages) {
          try {
            // Deserialize event envelope
            const eventEnvelope = JSON.parse(message.payload.toString('utf-8'));

            // Route event to appropriate Socket.io broadcast
            await handleIncidentEvent(io, eventEnvelope);

            // Update offset
            currentOffset = message.offset + 1;

          } catch (error) {
            console.error('Error processing message:', error);
            // Skip to next message
            currentOffset = message.offset + 1;
          }
        }

        // Commit offset to Iggy
        await iggyClient.storeConsumerOffset({
          streamId: 'marauders-map',
          topicId: 'incident-events',
          partitionId: 1,
          consumer: {
            kind: 'consumer',
            id: 'websocket-broadcaster'
          },
          offset: currentOffset
        });
      }

      // Wait before next poll
      await sleep(100); // Poll every 100ms

    } catch (error) {
      console.error('Error in incident event consumer loop:', error);
      await sleep(1000); // Back off on error
    }
  }
}

/**
 * Handle incident event and broadcast via Socket.io
 * @param {Object} io - Socket.io server instance
 * @param {Object} eventEnvelope - Event envelope
 * @returns {Promise<void>}
 */
async function handleIncidentEvent(io, eventEnvelope) {
  const { eventType, data } = eventEnvelope;

  console.log(`📢 Broadcasting: ${eventType}`);

  switch (eventType) {
    case 'incident.created':
      io.emit('incident:created', {
        incident: data,
        createdBy: {
          userId: eventEnvelope.userId
        }
      });
      break;

    case 'incident.updated':
      const room = `incident:${data.id}`;
      io.to(room).emit('incident:updated', {
        incident: data.incident,
        updatedBy: {
          userId: eventEnvelope.userId
        }
      });
      break;

    case 'incident.resolved':
      io.emit('incident:resolved', {
        incidentId: data.incidentId,
        resolvedBy: {
          userId: data.resolvedBy
        },
        resolution: data.resolution
      });
      break;

    default:
      console.warn(`Unknown event type: ${eventType}`);
  }
}

/**
 * Consume presence events from Iggy
 * @returns {Promise<void>}
 */
async function consumePresenceEvents() {
  // Similar to consumeIncidentEvents but for presence-events topic
  // Implementation follows same pattern
  console.log('📥 Presence events consumer not yet implemented (optional)');
}

/**
 * Stop WebSocket broadcast consumer
 * @returns {Promise<void>}
 */
export async function stopWebSocketBroadcastConsumer() {
  isConsuming = false;
  console.log('🛑 Stopping WebSocket broadcast consumer...');
}

/**
 * Sleep helper function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  startWebSocketBroadcastConsumer,
  stopWebSocketBroadcastConsumer
};
```

---

### Component 5: Refactored Route Handler

**File**: `gryffindor/server/src/routes/incidentsRouteHandler.js` (UPDATED)

**Changes**: Replace direct broadcast calls with event publishing.

```javascript
// ============================================================================
// BEFORE (Year 3):
// ============================================================================

broadcastIncidentCreatedToAllClients(incident, createdBy);

// ============================================================================
// AFTER (Year 3.5):
// ============================================================================

import {
  createIncidentCreatedEventEnvelope,
  createIncidentUpdatedEventEnvelope,
  createIncidentResolvedEventEnvelope
} from '../streaming/eventEnvelopeFactory.js';

import {
  publishIncidentCreatedEvent,
  publishIncidentUpdatedEvent,
  publishIncidentResolvedEvent
} from '../streaming/iggyProducerClient.js';

// In POST /api/incidents route:
const eventEnvelope = createIncidentCreatedEventEnvelope(incident, userId);
publishIncidentCreatedEvent(eventEnvelope);
// Note: Fire-and-forget, does NOT await

// In PUT /api/incidents/:id route:
const eventEnvelope = createIncidentUpdatedEventEnvelope(updatedIncident, updatedFields, userId);
publishIncidentUpdatedEvent(eventEnvelope);

// In DELETE /api/incidents/:id route:
const eventEnvelope = createIncidentResolvedEventEnvelope(id, userId, resolution);
publishIncidentResolvedEvent(eventEnvelope);
```

---

### Component 6: Server Initialization Updates

**File**: `gryffindor/server/src/server.js` (UPDATED)

**Changes**: Initialize Iggy connection and start consumer on server startup.

```javascript
// ============================================================================
// Add to imports:
// ============================================================================

import {
  initializeIggyClientConnection,
  closeIggyClientConnection
} from './streaming/iggyClientConnectionManager.js';

import {
  startWebSocketBroadcastConsumer,
  stopWebSocketBroadcastConsumer
} from './streaming/iggyWebSocketBroadcastConsumer.js';

// ============================================================================
// In startServerWithDatabaseConnection() function:
// ============================================================================

async function startServerWithDatabaseConnection() {
  try {
    // ... existing database connection test ...

    // Initialize Iggy connection
    console.log('🦉 Connecting to Iggy event broker...');
    await initializeIggyClientConnection();

    // Start server
    server = app.listen(PORT, () => {
      // ... existing server startup logs ...

      // Initialize Socket.io server
      initializeSocketServerWithHttpServer(server);

      // Start WebSocket broadcast consumer
      startWebSocketBroadcastConsumer();

      // Start presence session cleanup scheduler
      startPresenceSessionCleanupScheduler();

      console.log('✅ All systems operational');
    });

    // ... existing error handlers ...

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================================================
// In shutdownServerGracefullyCleanup() function:
// ============================================================================

function shutdownServerGracefullyCleanup() {
  console.log('\n🛑 Shutting down gracefully...');

  // Stop consumer
  stopWebSocketBroadcastConsumer();

  // Close Iggy connection
  closeIggyClientConnection();

  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // ... existing timeout ...
  }
}
```

---

## Observability and Monitoring

### How to Observe Iggy and Events

#### 1. Iggy HTTP API Endpoints

Iggy exposes a REST API on port 3000 for administration and monitoring:

```bash
# Health check
curl http://localhost:3000/health

# List all streams
curl http://localhost:3000/streams

# Get stream details
curl http://localhost:3000/streams/marauders-map

# List topics in a stream
curl http://localhost:3000/streams/marauders-map/topics

# Get topic details
curl http://localhost:3000/streams/marauders-map/topics/incident-events

# Get consumer groups and offsets
curl http://localhost:3000/streams/marauders-map/topics/incident-events/consumers
```

#### 2. Iggy CLI Tool

Install the Iggy CLI for interactive management:

```bash
# Install Iggy CLI (requires Rust/Cargo)
cargo install iggy-cli

# Or use Docker
docker run --rm -it --network marauders-network iggyrs/iggy-cli:latest

# Connect to Iggy
iggy-cli -h localhost -p 8090

# List streams
iggy-cli stream list

# List topics
iggy-cli topic list -s marauders-map

# View messages
iggy-cli message poll -s marauders-map -t incident-events -p 1 --offset 0 --count 10

# View consumer offsets
iggy-cli consumer list -s marauders-map -t incident-events
```

#### 3. Application Logs

The producer and consumer log every operation:

```bash
# Producer logs (when events are published)
📤 Published event: incident.created (ID: 123e4567-e89b-12d3-a456-426614174000)

# Consumer logs (when events are received)
📥 Received 5 incident events from Iggy
📢 Broadcasting: incident.created
📢 Broadcasting: incident.updated
```

#### 4. Custom Monitoring Endpoint

Add a monitoring endpoint to the Express API:

```javascript
// In server.js or new monitoring route

app.get('/api/monitoring/iggy-status', async (req, res) => {
  try {
    const iggyClient = getIggyClientInstance();

    if (!iggyClient) {
      return res.status(503).json({
        status: 'disconnected',
        message: 'Iggy client not initialized'
      });
    }

    // Get consumer offset
    const offset = await iggyClient.getConsumerOffset({
      streamId: 'marauders-map',
      topicId: 'incident-events',
      partitionId: 1,
      consumer: {
        kind: 'consumer',
        id: 'websocket-broadcaster'
      }
    });

    res.status(200).json({
      status: 'connected',
      consumer: {
        id: 'websocket-broadcaster',
        currentOffset: offset,
        stream: 'marauders-map',
        topic: 'incident-events'
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});
```

---

## Step-by-Step Implementation Order

### Phase 1: Infrastructure (Day 1)

**Goal**: Get Iggy running and accessible.

```bash
# Step 1.1: Update docker-compose.yml
# Add Iggy service and volume (see Docker Infrastructure Setup section)

# Step 1.2: Start Iggy
cd marauders-map/
docker-compose up -d iggy

# Step 1.3: Verify Iggy is running
docker ps | grep iggy
docker logs marauders-iggy

# Step 1.4: Test Iggy HTTP API
curl http://localhost:3000/health
```

**Success Criteria**:
- ✅ Iggy container is running
- ✅ Health check returns 200 OK
- ✅ No errors in Iggy logs

---

### Phase 2: Producer Setup (Day 1-2)

**Goal**: API can publish events to Iggy.

```bash
# Step 2.1: Install Iggy Node.js client
cd gryffindor/server/
npm install @iggy-rs/client

# Step 2.2: Create Iggy client connection manager
# Create: src/streaming/iggyClientConnectionManager.js
# (see Component 1 above)

# Step 2.3: Create event envelope factory
# Create: src/streaming/eventEnvelopeFactory.js
# (see Component 2 above)

# Step 2.4: Create Iggy producer client
# Create: src/streaming/iggyProducerClient.js
# (see Component 3 above)

# Step 2.5: Update server.js to initialize Iggy
# (see Component 6 above)

# Step 2.6: Test connection
npm run dev
# Look for: "✅ Connected to Iggy event broker"
```

**Success Criteria**:
- ✅ Server connects to Iggy on startup
- ✅ No connection errors in logs
- ✅ Graceful shutdown closes Iggy connection

---

### Phase 3: Refactor Route Handlers (Day 2-3)

**Goal**: API publishes events instead of direct broadcasts.

```bash
# Step 3.1: Update incidentsRouteHandler.js
# Replace broadcastIncidentCreatedToAllClients() calls
# with publishIncidentCreatedEvent() calls
# (see Component 5 above)

# Step 3.2: Restart server
npm run dev

# Step 3.3: Test event publishing
curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
# Save the token

curl -X POST http://localhost:4001/api/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Test Incident",
    "description": "Testing Iggy integration",
    "severity": "MISCHIEF",
    "location": "HOGWARTS"
  }'

# Check logs for:
# 📤 Published event: incident.created (ID: ...)

# Step 3.4: Verify event is in Iggy
curl http://localhost:3000/streams/marauders-map/topics/incident-events
# Should show message count > 0
```

**Success Criteria**:
- ✅ Events are published to Iggy
- ✅ API response is fast (not blocked by Iggy)
- ✅ Events appear in Iggy (verifiable via HTTP API)

---

### Phase 4: Consumer Implementation (Day 3-4)

**Goal**: Consumer reads events and broadcasts via Socket.io.

```bash
# Step 4.1: Create WebSocket broadcast consumer
# Create: src/streaming/iggyWebSocketBroadcastConsumer.js
# (see Component 4 above)

# Step 4.2: Update server.js to start consumer
# (see Component 6 above)

# Step 4.3: Restart server
npm run dev

# Look for:
# 🦉 Starting WebSocket broadcast consumer...
# ✅ WebSocket broadcast consumer started

# Step 4.4: Test end-to-end flow
# Terminal 1: Server logs
npm run dev

# Terminal 2: Create incident via API
curl -X POST http://localhost:4001/api/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Test Incident 2",
    "description": "Testing consumer",
    "severity": "SUSPICIOUS",
    "location": "FORBIDDEN_FOREST"
  }'

# Check server logs for:
# 📤 Published event: incident.created (ID: ...)
# 📥 Received 1 incident events from Iggy
# 📢 Broadcasting: incident.created

# Terminal 3: WebSocket client (optional)
# Connect a Socket.io client and verify it receives the event
```

**Success Criteria**:
- ✅ Consumer starts successfully
- ✅ Consumer receives events from Iggy
- ✅ Events are broadcast via Socket.io
- ✅ WebSocket clients receive events in real-time

---

### Phase 5: Testing and Verification (Day 4-5)

**Goal**: Comprehensive testing of the integration.

```bash
# Step 5.1: Test server restart (events should persist)
# Create 5 incidents
for i in {1..5}; do
  curl -X POST http://localhost:4001/api/incidents \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d "{
      \"title\": \"Incident $i\",
      \"severity\": \"MISCHIEF\",
      \"location\": \"HOGWARTS\"
    }"
done

# Restart server
docker-compose restart gryffindor-server
# (or Ctrl+C and npm run dev again)

# Verify consumer resumes from correct offset
# Check logs for offset restoration

# Step 5.2: Test Iggy restart (consumer should reconnect)
docker-compose restart iggy

# Verify server reconnects to Iggy

# Step 5.3: Test consumer lag monitoring
curl http://localhost:4001/api/monitoring/iggy-status

# Should show current offset
```

**Success Criteria**:
- ✅ Events persist across server restarts
- ✅ Consumer resumes from correct offset
- ✅ Reconnection works after Iggy restart
- ✅ Monitoring endpoint works

---

## How to Verify It Works

### Verification Checklist

#### ✅ Infrastructure Verification

```bash
# 1. Iggy is running
docker ps | grep iggy
# Expected: marauders-iggy container RUNNING

# 2. Iggy health check
curl http://localhost:3000/health
# Expected: {"status":"ok","version":"0.x.x"}

# 3. Server connects to Iggy
npm run dev
# Expected log: "✅ Connected to Iggy event broker"
```

#### ✅ Producer Verification

```bash
# 1. Create incident via API
TOKEN=$(curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.accessToken')

curl -X POST http://localhost:4001/api/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Verification Test",
    "severity": "MISCHIEF",
    "location": "HOGWARTS"
  }'

# 2. Check server logs
# Expected: 📤 Published event: incident.created (ID: ...)

# 3. Verify event in Iggy
curl http://localhost:3000/streams/marauders-map
# Expected: Stream exists with topics

curl http://localhost:3000/streams/marauders-map/topics/incident-events
# Expected: Message count > 0
```

#### ✅ Consumer Verification

```bash
# 1. Check consumer logs
# Expected: 📥 Received X incident events from Iggy
# Expected: 📢 Broadcasting: incident.created

# 2. Connect Socket.io client (JavaScript in browser console)
const socket = io('http://localhost:4001', {
  auth: { token: '<YOUR_JWT_TOKEN>' }
});

socket.on('connect', () => console.log('Connected'));
socket.on('incident:created', (data) => console.log('Incident created:', data));

# 3. Create incident via API
# Expected: Console logs "Incident created: {...}"
```

#### ✅ End-to-End Verification

**Test Scenario**: Create incident → Published to Iggy → Consumer reads → Broadcasts to Socket.io → Client receives

```bash
# Terminal 1: Server logs
npm run dev

# Terminal 2: Create incident
curl -X POST http://localhost:4001/api/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"E2E Test","severity":"MISCHIEF","location":"HOGWARTS"}'

# Terminal 1: Expected logs in sequence:
# 📤 Published event: incident.created (ID: abc123)
# 📥 Received 1 incident events from Iggy
# 📢 Broadcasting: incident.created

# Terminal 3: Socket.io client
# Expected: Event received in browser console
```

#### ✅ Resilience Verification

```bash
# Test 1: Server restart
docker-compose restart gryffindor-server
# Expected: Consumer resumes from last offset (no duplicate broadcasts)

# Test 2: Iggy restart
docker-compose restart iggy
# Expected: Server reconnects, consumer continues

# Test 3: Event persistence
docker-compose down
docker-compose up -d
# Expected: Events still in Iggy, consumer replays from offset 0 on first run
```

---

## Testing Strategy

### Unit Tests

**File**: `gryffindor/server/tests/streaming/eventEnvelopeFactory.test.js`

```javascript
import { describe, test, expect } from '@jest/globals';
import {
  createEventEnvelopeForPublishing,
  createIncidentCreatedEventEnvelope
} from '../../src/streaming/eventEnvelopeFactory.js';

describe('Event Envelope Factory', () => {
  test('should_create_envelope_with_required_fields', () => {
    const envelope = createEventEnvelopeForPublishing(
      'test.event',
      { foo: 'bar' },
      'user-123'
    );

    expect(envelope).toHaveProperty('eventId');
    expect(envelope).toHaveProperty('eventType', 'test.event');
    expect(envelope).toHaveProperty('timestamp');
    expect(envelope).toHaveProperty('source', 'gryffindor-api');
    expect(envelope).toHaveProperty('userId', 'user-123');
    expect(envelope).toHaveProperty('data', { foo: 'bar' });
  });

  test('should_generate_unique_event_ids', () => {
    const envelope1 = createEventEnvelopeForPublishing('test', {}, 'user-123');
    const envelope2 = createEventEnvelopeForPublishing('test', {}, 'user-123');

    expect(envelope1.eventId).not.toBe(envelope2.eventId);
  });

  test('should_create_incident_created_envelope', () => {
    const incident = {
      id: 42,
      title: 'Test',
      severity: 'MISCHIEF',
      location: 'HOGWARTS',
      status: 'OPEN'
    };

    const envelope = createIncidentCreatedEventEnvelope(incident, 'user-123');

    expect(envelope.eventType).toBe('incident.created');
    expect(envelope.data.id).toBe(42);
    expect(envelope.data.title).toBe('Test');
  });
});
```

### Integration Tests

**File**: `gryffindor/server/tests/streaming/iggyIntegration.test.js`

```javascript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeIggyClientConnection,
  closeIggyClientConnection
} from '../../src/streaming/iggyClientConnectionManager.js';
import {
  publishEventToIggyStream
} from '../../src/streaming/iggyProducerClient.js';
import { createEventEnvelopeForPublishing } from '../../src/streaming/eventEnvelopeFactory.js';

describe('Iggy Integration Tests', () => {
  beforeAll(async () => {
    await initializeIggyClientConnection();
  });

  afterAll(async () => {
    await closeIggyClientConnection();
  });

  test('should_publish_event_to_iggy_stream', async () => {
    const envelope = createEventEnvelopeForPublishing(
      'test.event',
      { message: 'Integration test' },
      'test-user'
    );

    await expect(
      publishEventToIggyStream('test-stream', 'test-topic', envelope)
    ).resolves.not.toThrow();
  });
});
```

### End-to-End Tests

**File**: `gryffindor/server/tests/e2e/iggyE2E.test.js`

```javascript
import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';

describe('Iggy E2E Tests', () => {
  let token;

  beforeAll(async () => {
    // Login to get JWT token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'admin123' });

    token = response.body.accessToken;
  });

  test('should_publish_event_when_creating_incident', async () => {
    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'E2E Test Incident',
        severity: 'MISCHIEF',
        location: 'HOGWARTS'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');

    // Wait for event to be published and consumed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify event was consumed (check via monitoring endpoint)
    const statusResponse = await request(app)
      .get('/api/monitoring/iggy-status');

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.status).toBe('connected');
  });
});
```

---

## Troubleshooting Guide

### Problem: Iggy container won't start

**Symptoms**:
```bash
docker ps | grep iggy
# No output
```

**Solutions**:
```bash
# Check logs
docker logs marauders-iggy

# Common issue: Port already in use
lsof -i :8090
# Kill process using port 8090

# Restart Iggy
docker-compose restart iggy
```

---

### Problem: Server can't connect to Iggy

**Symptoms**:
```
❌ Failed to connect to Iggy: Connection refused
```

**Solutions**:
```bash
# 1. Verify Iggy is running
docker ps | grep iggy

# 2. Check Iggy health
curl http://localhost:3000/health

# 3. Verify network
docker network inspect marauders-network

# 4. Check environment variables in server
echo $IGGY_HOST
echo $IGGY_PORT

# 5. Try connecting manually
telnet localhost 8090
```

---

### Problem: Events published but not consumed

**Symptoms**:
```
📤 Published event: incident.created (ID: ...)
# But NO 📥 Received events log
```

**Solutions**:
```bash
# 1. Verify consumer started
# Look for: "🦉 Starting WebSocket broadcast consumer..."

# 2. Check if events are in Iggy
curl http://localhost:3000/streams/marauders-map/topics/incident-events

# 3. Check consumer offset
curl http://localhost:3000/streams/marauders-map/topics/incident-events/consumers

# 4. Manually poll messages
iggy-cli message poll -s marauders-map -t incident-events -p 1 --offset 0 --count 10

# 5. Check for consumer errors in logs
grep "Error in incident event consumer loop" server.log
```

---

### Problem: Socket.io clients not receiving events

**Symptoms**:
- Consumer logs show: "📢 Broadcasting: incident.created"
- But browser console shows no events

**Solutions**:
```bash
# 1. Verify Socket.io connection
# In browser console:
socket.connected
# Should be: true

# 2. Check Socket.io authentication
socket.auth.token
# Should be: <valid JWT>

# 3. Verify event listener registered
socket._callbacks
# Should include: $incident:created

# 4. Check Socket.io server instance
# In consumer code, verify:
const io = getSocketServerInstance();
if (!io) {
  console.error('Socket.io not initialized!');
}

# 5. Test direct broadcast (bypass Iggy)
# Temporarily add in route handler:
io.emit('test:event', { message: 'Direct test' });
# If this works, issue is in consumer
```

---

### Problem: Consumer lag / events delayed

**Symptoms**:
- Events appear in Iggy immediately
- But broadcast to clients is delayed by seconds

**Solutions**:
```bash
# 1. Check poll interval
# In consumer code, adjust:
await sleep(100); // Try reducing from 1000ms to 100ms

# 2. Increase batch size
count: 10, // Try increasing to 50 or 100

# 3. Monitor consumer lag
curl http://localhost:4001/api/monitoring/iggy-status

# 4. Check for slow broadcasts
# Add timing logs in handleIncidentEvent():
const start = Date.now();
io.emit('incident:created', data);
console.log(`Broadcast took ${Date.now() - start}ms`);
```

---

### Problem: Duplicate events

**Symptoms**:
- Same event broadcast multiple times
- WebSocket clients see duplicate incidents

**Solutions**:
```bash
# 1. Check offset tracking
# Verify offset is incremented after each message:
currentOffset = message.offset + 1;

# 2. Check for multiple consumers
docker ps
# Should only have ONE server instance running

# 3. Add idempotency in client
# In client code, track processed event IDs:
const processedEvents = new Set();

socket.on('incident:created', (data) => {
  if (processedEvents.has(data.incident.id)) {
    return; // Skip duplicate
  }
  processedEvents.add(data.incident.id);
  // ... handle event
});

# 4. Reset consumer offset if corrupted
# Delete consumer offset in Iggy, restart server
iggy-cli consumer delete -s marauders-map -t incident-events -c websocket-broadcaster
```

---

## Appendix: Quick Reference

### Environment Variables

Add to `gryffindor/server/.env`:

```bash
# Iggy Configuration
IGGY_HOST=localhost
IGGY_PORT=8090
IGGY_USERNAME=iggy
IGGY_PASSWORD=iggy

# Stream Configuration
IGGY_STREAM_NAME=marauders-map
IGGY_INCIDENT_TOPIC=incident-events
IGGY_PRESENCE_TOPIC=presence-events

# Consumer Configuration
IGGY_CONSUMER_ID=websocket-broadcaster
IGGY_POLL_INTERVAL_MS=100
IGGY_BATCH_SIZE=10
```

### NPM Package to Install

```bash
cd gryffindor/server/
npm install @iggy-rs/client
```

### Docker Commands Cheat Sheet

```bash
# Start all services
docker-compose up -d

# Start only Iggy
docker-compose up -d iggy

# Stop Iggy
docker-compose stop iggy

# Restart Iggy
docker-compose restart iggy

# View Iggy logs
docker logs -f marauders-iggy

# Remove Iggy (keeps data)
docker-compose rm -f iggy

# Remove Iggy and data
docker-compose down -v
```

### Iggy HTTP API Cheat Sheet

```bash
# Base URL
BASE=http://localhost:3000

# Health check
curl $BASE/health

# List streams
curl $BASE/streams

# Create stream (auto-created by client, but manual is possible)
curl -X POST $BASE/streams \
  -H "Content-Type: application/json" \
  -d '{"name":"marauders-map"}'

# List topics
curl $BASE/streams/marauders-map/topics

# Get topic info
curl $BASE/streams/marauders-map/topics/incident-events

# List consumers
curl $BASE/streams/marauders-map/topics/incident-events/consumers

# Get consumer offset
curl $BASE/streams/marauders-map/topics/incident-events/consumers/websocket-broadcaster
```

### File Structure After Implementation

```
gryffindor/server/src/
├── streaming/                              # NEW DIRECTORY
│   ├── iggyClientConnectionManager.js      # Connection lifecycle
│   ├── eventEnvelopeFactory.js             # Event envelope creation
│   ├── iggyProducerClient.js               # Publish events to Iggy
│   └── iggyWebSocketBroadcastConsumer.js   # Consume events, broadcast via Socket.io
├── routes/
│   └── incidentsRouteHandler.js            # UPDATED: Publish events instead of direct broadcast
├── websocket/
│   └── socketServer.js                     # UNCHANGED (still used by consumer)
└── server.js                               # UPDATED: Initialize Iggy, start consumer
```

---

## Summary: Implementation Checklist

### Pre-Implementation

- [ ] Read YEAR-3.5-PLAN.md
- [ ] Understand existing architecture (Years 1-3)
- [ ] Review current broadcast code in socketServer.js

### Phase 1: Infrastructure (Day 1)

- [ ] Update docker-compose.yml with Iggy service
- [ ] Start Iggy container
- [ ] Verify Iggy health endpoint
- [ ] Test Iggy HTTP API

### Phase 2: Producer (Day 1-2)

- [ ] Install @iggy-rs/client NPM package
- [ ] Create iggyClientConnectionManager.js
- [ ] Create eventEnvelopeFactory.js
- [ ] Create iggyProducerClient.js
- [ ] Update server.js to initialize Iggy
- [ ] Test connection on server startup

### Phase 3: Refactor Routes (Day 2-3)

- [ ] Update incidentsRouteHandler.js (POST endpoint)
- [ ] Update incidentsRouteHandler.js (PUT endpoint)
- [ ] Update incidentsRouteHandler.js (DELETE endpoint)
- [ ] Remove direct broadcast calls
- [ ] Add event publishing calls
- [ ] Test event publishing via API

### Phase 4: Consumer (Day 3-4)

- [ ] Create iggyWebSocketBroadcastConsumer.js
- [ ] Implement incident event consumer loop
- [ ] Implement event routing to Socket.io
- [ ] Implement offset tracking
- [ ] Update server.js to start consumer
- [ ] Test end-to-end event flow

### Phase 5: Testing (Day 4-5)

- [ ] Write unit tests for event envelope factory
- [ ] Write integration tests for Iggy client
- [ ] Write E2E tests for event flow
- [ ] Test server restart (events persist)
- [ ] Test Iggy restart (consumer reconnects)
- [ ] Test consumer lag monitoring

### Phase 6: Observability (Day 5)

- [ ] Add monitoring endpoint (/api/monitoring/iggy-status)
- [ ] Add consumer lag metrics
- [ ] Test Iggy CLI commands
- [ ] Document troubleshooting steps

### Phase 7: Documentation (Day 5)

- [ ] Update README.md with Iggy section
- [ ] Document environment variables
- [ ] Document API changes
- [ ] Update SHOWCASE.md

---

## Success Metrics

After completing the implementation, you should achieve:

### Functional Metrics

- ✅ **Decoupling**: API doesn't call Socket.io directly
- ✅ **Persistence**: Events survive server restarts
- ✅ **Replay**: Consumer resumes from last offset
- ✅ **Multiple Topics**: incident-events, presence-events
- ✅ **Monitoring**: /api/monitoring/iggy-status works

### Performance Metrics

- ✅ **API Latency**: < 5ms added to response time
- ✅ **Consumer Latency**: Events broadcast within 100ms
- ✅ **Throughput**: Handle 100+ events/second

### Code Quality Metrics

- ✅ **4WNC**: All functions follow 4-word naming
- ✅ **Tests**: 80%+ code coverage
- ✅ **Logs**: Comprehensive logging for debugging
- ✅ **Error Handling**: Graceful degradation on failures

---

**Status**: Ready for Implementation
**Estimated Time**: 5 days (1 developer)
**Risk Level**: Low (Iggy is production-ready, patterns are proven)

**Next Steps**:
1. Review this spec document
2. Set up development environment
3. Start with Phase 1 (Infrastructure)
4. Follow implementation order strictly
5. Test after each phase

---

*"The owls are standing by. Time to build the Owl Post Office."*

**Version History**:
- v1.0.0 (2026-02-16): Initial comprehensive specification
