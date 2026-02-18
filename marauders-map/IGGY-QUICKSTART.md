# Iggy Integration Quick Start Guide
## *"See It Working in 5 Minutes"*

**Goal**: Get Iggy running and observe event streaming in action.

---

## 0. Prerequisites Check

```bash
# Verify you're in the right directory
cd /Users/amuldotexe/Desktop/A01_20260131/system-design-crash-course-via-LLM-driven-coding/marauders-map/

# Verify Docker is running
docker ps

# Verify PostgreSQL (Gringotts) is running
docker ps | grep gringotts
```

---

## 1. Start Iggy (30 seconds)

```bash
# Update docker-compose.yml first (add Iggy service - see IGGY-INTEGRATION-SPECS.md)

# Start Iggy
docker-compose up -d iggy

# Verify it's running
docker ps | grep iggy

# Expected output:
# marauders-iggy   iggyrs/iggy:latest   Up X seconds   0.0.0.0:8090->8090/tcp, 0.0.0.0:3000->3000/tcp
```

**Verify Iggy is alive:**

```bash
# Health check
curl http://localhost:3000/health

# Expected:
# {"status":"ok","version":"0.x.x"}
```

---

## 2. Explore Iggy Before Integration (2 minutes)

### 2.1 HTTP API Exploration

```bash
# List all streams (should be empty initially)
curl http://localhost:3000/streams

# Expected:
# []

# Check Iggy server stats
curl http://localhost:3000/stats

# Expected: JSON with server statistics
```

### 2.2 Create a Test Stream Manually

```bash
# Create a test stream
curl -X POST http://localhost:3000/streams \
  -H "Content-Type: application/json" \
  -d '{
    "stream_id": 1,
    "name": "test-stream"
  }'

# List streams again
curl http://localhost:3000/streams

# Expected: You should see "test-stream" in the list

# Create a topic in the stream
curl -X POST http://localhost:3000/streams/test-stream/topics \
  -H "Content-Type: application/json" \
  -d '{
    "topic_id": 1,
    "name": "test-topic",
    "partition_count": 1,
    "message_expiry": 0
  }'

# List topics
curl http://localhost:3000/streams/test-stream/topics

# Expected: You should see "test-topic"
```

---

## 3. Install Iggy Node.js Client (1 minute)

```bash
cd gryffindor/server/

# Install Iggy client
npm install @iggy-rs/client

# Verify installation
npm list @iggy-rs/client
```

---

## 4. Test Iggy with Simple Script (2 minutes)

Create a simple test script to publish and consume events:

**File**: `gryffindor/server/test-iggy.js`

```javascript
import { IggyClient } from '@iggy-rs/client';

async function testIggy() {
  console.log('🧪 Testing Iggy connection...');

  // Connect to Iggy
  const client = new IggyClient({
    host: 'localhost',
    port: 8090,
    transport: 'tcp'
  });

  try {
    await client.connect();
    console.log('✅ Connected to Iggy');

    // Login
    await client.login('iggy', 'iggy');
    console.log('✅ Logged in');

    // Create stream
    await client.createStream({
      streamId: 'marauders-map',
      name: 'marauders-map'
    });
    console.log('✅ Created stream: marauders-map');

    // Create topic
    await client.createTopic({
      streamId: 'marauders-map',
      topicId: 'incident-events',
      name: 'incident-events',
      partitionCount: 1,
      messageExpiry: 0
    });
    console.log('✅ Created topic: incident-events');

    // Send a test message
    const message = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      eventType: 'test.event',
      timestamp: new Date().toISOString(),
      source: 'test-script',
      userId: 'test-user',
      data: {
        message: 'Hello from Iggy!'
      }
    };

    await client.sendMessages({
      streamId: 'marauders-map',
      topicId: 'incident-events',
      partitionId: 1,
      messages: [
        {
          id: message.eventId,
          payload: Buffer.from(JSON.stringify(message), 'utf-8')
        }
      ]
    });
    console.log('✅ Sent test message');

    // Poll messages
    const response = await client.pollMessages({
      streamId: 'marauders-map',
      topicId: 'incident-events',
      partitionId: 1,
      consumer: {
        kind: 'consumer',
        id: 'test-consumer'
      },
      offset: 0,
      count: 10,
      autoCommit: false
    });

    console.log('✅ Received messages:', response.messages.length);

    if (response.messages.length > 0) {
      const receivedMessage = JSON.parse(response.messages[0].payload.toString('utf-8'));
      console.log('📩 Message content:', receivedMessage);
    }

    await client.disconnect();
    console.log('✅ Disconnected from Iggy');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testIggy();
```

**Run the test script:**

```bash
node test-iggy.js

# Expected output:
# 🧪 Testing Iggy connection...
# ✅ Connected to Iggy
# ✅ Logged in
# ✅ Created stream: marauders-map
# ✅ Created topic: incident-events
# ✅ Sent test message
# ✅ Received messages: 1
# 📩 Message content: { eventId: '...', eventType: 'test.event', ... }
# ✅ Disconnected from Iggy
```

---

## 5. Observe Events in Iggy HTTP API

```bash
# List streams (should now include marauders-map)
curl http://localhost:3000/streams

# Get stream details
curl http://localhost:3000/streams/marauders-map

# List topics in stream
curl http://localhost:3000/streams/marauders-map/topics

# Get topic details (includes message count)
curl http://localhost:3000/streams/marauders-map/topics/incident-events

# Expected output includes:
# {
#   "id": 1,
#   "name": "incident-events",
#   "size": 256,  <-- Size in bytes
#   "messages_count": 1,  <-- Number of messages
#   ...
# }
```

---

## 6. Use Iggy CLI (Optional but Powerful)

### Install Iggy CLI (Requires Rust)

```bash
# Option 1: If you have Cargo installed
cargo install iggy-cli

# Option 2: Use Docker
alias iggy-cli='docker run --rm -it --network host iggyrs/iggy-cli:latest'
```

### Explore with CLI

```bash
# Connect and list streams
iggy-cli stream list

# List topics
iggy-cli topic list -s marauders-map

# View messages (offset 0, count 10)
iggy-cli message poll -s marauders-map -t incident-events -p 1 --offset 0 --count 10

# List consumers
iggy-cli consumer list -s marauders-map -t incident-events

# Get consumer offset
iggy-cli consumer get -s marauders-map -t incident-events -c test-consumer
```

---

## 7. Observe End-to-End Flow (After Full Implementation)

### 7.1 Terminal Setup

Open 3 terminal windows:

**Terminal 1: Server Logs**
```bash
cd gryffindor/server/
npm run dev

# Watch for:
# 🦉 Connecting to Iggy event broker...
# ✅ Connected to Iggy event broker
# 🦉 Starting WebSocket broadcast consumer...
# ✅ WebSocket broadcast consumer started
```

**Terminal 2: Iggy HTTP API Monitoring**
```bash
# Watch messages count in real-time
watch -n 1 'curl -s http://localhost:3000/streams/marauders-map/topics/incident-events | jq ".messages_count"'

# This will refresh every 1 second and show message count
```

**Terminal 3: API Requests**
```bash
# Login to get JWT token
TOKEN=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.accessToken')

# Create incidents and watch events flow
for i in {1..5}; do
  curl -X POST http://localhost:4001/api/incidents \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"title\": \"Test Incident $i\",
      \"description\": \"Testing Iggy event flow\",
      \"severity\": \"MISCHIEF\",
      \"location\": \"HOGWARTS\"
    }"
  sleep 1
done
```

### 7.2 What to Observe

**In Terminal 1 (Server Logs):**
```
📤 Published event: incident.created (ID: abc123...)
📥 Received 1 incident events from Iggy
📢 Broadcasting: incident.created
```

**In Terminal 2 (Iggy Message Count):**
```
1
2
3
4
5
```
(Increments with each event)

**In Terminal 3 (API Response):**
```json
{
  "id": 42,
  "title": "Test Incident 1",
  "status": "OPEN",
  ...
}
```

---

## 8. Browser-Based Observation (WebSocket Client)

Open browser console (http://localhost:3001 or wherever your frontend is):

```javascript
// Connect to Socket.io
const socket = io('http://localhost:4001', {
  auth: { token: '<YOUR_JWT_TOKEN_HERE>' }
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
});

socket.on('incident:created', (data) => {
  console.log('📢 Incident created:', data);
});

socket.on('incident:updated', (data) => {
  console.log('📢 Incident updated:', data);
});

socket.on('incident:resolved', (data) => {
  console.log('📢 Incident resolved:', data);
});

// Now create incidents via API (Terminal 3)
// You should see events appear in browser console
```

---

## 9. Monitoring Endpoints

### 9.1 Custom Monitoring Endpoint

After implementing the monitoring endpoint (see IGGY-INTEGRATION-SPECS.md), you can check:

```bash
# Get consumer status
curl http://localhost:4001/api/monitoring/iggy-status

# Expected:
# {
#   "status": "connected",
#   "consumer": {
#     "id": "websocket-broadcaster",
#     "currentOffset": 42,
#     "stream": "marauders-map",
#     "topic": "incident-events"
#   }
# }
```

### 9.2 Iggy Native Endpoints

```bash
# Server stats
curl http://localhost:3000/stats

# Stream info
curl http://localhost:3000/streams/marauders-map

# Topic info (includes message count)
curl http://localhost:3000/streams/marauders-map/topics/incident-events

# Consumer groups
curl http://localhost:3000/streams/marauders-map/topics/incident-events/consumers
```

---

## 10. Verify Persistence (Restart Test)

```bash
# Create 5 incidents
for i in {1..5}; do
  curl -X POST http://localhost:4001/api/incidents \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"title\":\"Incident $i\",\"severity\":\"MISCHIEF\",\"location\":\"HOGWARTS\"}"
done

# Check message count
curl http://localhost:3000/streams/marauders-map/topics/incident-events | jq ".messages_count"
# Should be: 5 (or more if you created incidents earlier)

# Restart Iggy
docker-compose restart iggy

# Wait 5 seconds
sleep 5

# Check message count again
curl http://localhost:3000/streams/marauders-map/topics/incident-events | jq ".messages_count"
# Should still be: 5 (events persisted!)
```

---

## 11. Replay Test (Consumer Offset Reset)

```bash
# Check current consumer offset
curl http://localhost:3000/streams/marauders-map/topics/incident-events/consumers

# Restart server (consumer will resume from last offset)
cd gryffindor/server/
# Ctrl+C to stop server
npm run dev

# Watch logs - consumer should resume from last offset, not re-broadcast old events
# Look for: "📥 Received 0 incident events from Iggy" (if no new events)
```

---

## 12. Performance Observation

### Measure Producer Latency

Add timing logs in route handler:

```javascript
// In incidentsRouteHandler.js POST endpoint
const publishStart = Date.now();
await publishIncidentCreatedEvent(eventEnvelope);
const publishEnd = Date.now();
console.log(`⏱️  Event publish took ${publishEnd - publishStart}ms`);
```

**Expected**: < 5ms

### Measure Consumer Latency

Add timing logs in consumer:

```javascript
// In iggyWebSocketBroadcastConsumer.js
const eventTimestamp = new Date(eventEnvelope.timestamp);
const now = new Date();
const latency = now - eventTimestamp;
console.log(`⏱️  Event latency: ${latency}ms (from publish to broadcast)`);
```

**Expected**: < 100ms

---

## 13. Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVE THE FLOW                          │
│                                                              │
│  Terminal 3                                                  │
│  ┌─────────────┐                                            │
│  │ curl POST   │                                            │
│  │ /incidents  │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│         v                                                    │
│  ┌─────────────────┐  publish   ┌──────────────┐           │
│  │ Express Server  │───────────>│     IGGY     │           │
│  │ (Port 4001)     │            │  (Port 3000) │           │
│  └─────────────────┘            │              │           │
│         ^                       │ [msg 0]      │           │
│         │                       │ [msg 1]      │           │
│  Terminal 1                     │ [msg 2]      │           │
│  Logs:                          └──────┬───────┘           │
│  📤 Published                           │                   │
│  📥 Received                            │ poll              │
│  📢 Broadcasting                        │                   │
│         ^                               v                   │
│         │                       ┌──────────────┐           │
│         │                       │  Consumer    │           │
│         │                       │  (in server) │           │
│         │                       └──────┬───────┘           │
│         │                              │                   │
│         │                              v                   │
│         │                       ┌──────────────┐           │
│         └───────────────────────│  Socket.io   │           │
│                                 └──────┬───────┘           │
│                                        │                   │
│                                        v                   │
│                                 ┌──────────────┐           │
│                                 │   Browser    │           │
│                                 │   Console    │           │
│                                 └──────────────┘           │
│                                                              │
│  Terminal 2: Watch message count increment in Iggy          │
└─────────────────────────────────────────────────────────────┘
```

---

## 14. Common Observation Commands

### Quick Health Check

```bash
#!/bin/bash
# File: check-iggy-health.sh

echo "🔍 Checking Iggy Health..."

# 1. Container status
if docker ps | grep -q marauders-iggy; then
  echo "✅ Iggy container is running"
else
  echo "❌ Iggy container is NOT running"
  exit 1
fi

# 2. HTTP API
if curl -s http://localhost:3000/health | grep -q "ok"; then
  echo "✅ Iggy HTTP API is healthy"
else
  echo "❌ Iggy HTTP API is NOT responding"
  exit 1
fi

# 3. Stream exists
if curl -s http://localhost:3000/streams | grep -q "marauders-map"; then
  echo "✅ marauders-map stream exists"
else
  echo "⚠️  marauders-map stream does NOT exist (will be created on first publish)"
fi

# 4. Message count
MESSAGE_COUNT=$(curl -s http://localhost:3000/streams/marauders-map/topics/incident-events 2>/dev/null | jq -r ".messages_count // 0")
echo "📊 Message count in incident-events topic: $MESSAGE_COUNT"

echo "✅ Iggy health check complete"
```

**Run it:**

```bash
chmod +x check-iggy-health.sh
./check-iggy-health.sh
```

---

## 15. Troubleshooting Quick Checks

### Problem: Can't see events in Iggy

```bash
# Check if stream was created
curl http://localhost:3000/streams

# Check if topic was created
curl http://localhost:3000/streams/marauders-map/topics

# Check message count
curl http://localhost:3000/streams/marauders-map/topics/incident-events | jq ".messages_count"

# If 0, check server logs for publish errors
docker logs marauders-gryffindor-server | grep "Published event"
```

### Problem: Events in Iggy but not broadcast to clients

```bash
# Check consumer logs
docker logs marauders-gryffindor-server | grep "Received.*events from Iggy"

# Check if consumer started
docker logs marauders-gryffindor-server | grep "Starting WebSocket broadcast consumer"

# Check consumer offset
curl http://localhost:3000/streams/marauders-map/topics/incident-events/consumers
```

---

## 16. Demo Script (Show and Tell)

Complete demo script to show Iggy working:

```bash
#!/bin/bash
# File: demo-iggy.sh

echo "🎬 Iggy Event Streaming Demo"
echo "========================================"
echo ""

# 1. Show Iggy is running
echo "1️⃣  Iggy container status:"
docker ps | grep iggy
echo ""

# 2. Show Iggy health
echo "2️⃣  Iggy health check:"
curl -s http://localhost:3000/health | jq
echo ""

# 3. Get JWT token
echo "3️⃣  Logging in to get JWT token..."
TOKEN=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.accessToken')
echo "✅ Token obtained"
echo ""

# 4. Show message count BEFORE
echo "4️⃣  Message count BEFORE:"
BEFORE=$(curl -s http://localhost:3000/streams/marauders-map/topics/incident-events | jq -r ".messages_count // 0")
echo "   Messages: $BEFORE"
echo ""

# 5. Create an incident
echo "5️⃣  Creating incident via API..."
RESPONSE=$(curl -s -X POST http://localhost:4001/api/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Demo Incident",
    "description": "Testing Iggy event streaming",
    "severity": "MISCHIEF",
    "location": "HOGWARTS"
  }')
echo "   Incident created: $(echo $RESPONSE | jq -r '.id')"
echo ""

# 6. Wait for event to propagate
echo "6️⃣  Waiting 2 seconds for event to propagate..."
sleep 2
echo ""

# 7. Show message count AFTER
echo "7️⃣  Message count AFTER:"
AFTER=$(curl -s http://localhost:3000/streams/marauders-map/topics/incident-events | jq -r ".messages_count")
echo "   Messages: $AFTER"
echo ""

# 8. Show the difference
DIFF=$((AFTER - BEFORE))
echo "8️⃣  Result: $DIFF new message(s) in Iggy!"
echo ""

# 9. Show consumer status
echo "9️⃣  Consumer status:"
curl -s http://localhost:4001/api/monitoring/iggy-status | jq
echo ""

echo "✅ Demo complete!"
```

**Run it:**

```bash
chmod +x demo-iggy.sh
./demo-iggy.sh
```

---

## Summary: Key Observation Points

### Where to Look to See Iggy Working

1. **Iggy HTTP API** (http://localhost:3000)
   - Health: `/health`
   - Streams: `/streams`
   - Message count: `/streams/marauders-map/topics/incident-events`
   - Consumers: `/streams/marauders-map/topics/incident-events/consumers`

2. **Server Logs** (`npm run dev` output)
   - Producer: `📤 Published event: ...`
   - Consumer: `📥 Received X incident events from Iggy`
   - Broadcast: `📢 Broadcasting: incident.created`

3. **Browser Console** (Socket.io client)
   - Connection: `✅ Connected to WebSocket`
   - Events: `📢 Incident created: {...}`

4. **Monitoring Endpoint** (http://localhost:4001/api/monitoring/iggy-status)
   - Consumer offset
   - Connection status

### Key Commands

```bash
# Quick health check
curl http://localhost:3000/health

# Message count
curl -s http://localhost:3000/streams/marauders-map/topics/incident-events | jq ".messages_count"

# Consumer status
curl http://localhost:4001/api/monitoring/iggy-status

# Server logs
docker logs -f marauders-gryffindor-server

# Iggy logs
docker logs -f marauders-iggy
```

---

**Next Steps:**
1. Complete full implementation (see IGGY-INTEGRATION-SPECS.md)
2. Run demo script to verify
3. Open browser console to see real-time events
4. Monitor Iggy HTTP API during testing

---

*"The owls are flying. Can you see them?"*

**Version**: 1.0.0 (2026-02-16)
