// ============================================================================
// Socket.io Server - Year 3: Real-Time Features
// ============================================================================
// Following patterns from: Idiom-React-Frontend-Patterns.md
// Naming convention: 4-word pattern for all functions
// Real-time communication with JWT authentication
// ============================================================================

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connectionPoolManager.js';

// ============================================================================
// Socket.io Server Instance
// ============================================================================

let io = null;

/**
 * Initialize Socket.io server with HTTP server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.io server instance
 */
export function initializeSocketServerWithHttpServer(httpServer) {
  // Create Socket.io server
  io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:3001',
      credentials: true
    },
    pingTimeout: parseInt(process.env.SOCKET_IO_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_IO_PING_INTERVAL) || 25000
  });

  console.log('🔌 Socket.io server initialized');

  // Authentication middleware
  io.use(authenticateSocketConnectionWithJwtToken);

  // Connection handler
  io.on('connection', handleSocketConnectionWithPresenceTracking);

  return io;
}

/**
 * Get Socket.io server instance
 * @returns {Object|null} Socket.io server instance
 */
export function getSocketServerInstance() {
  return io;
}

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Authenticate socket connection with JWT token
 * @param {Object} socket - Socket.io socket instance
 * @param {Function} next - Next middleware function
 */
async function authenticateSocketConnectionWithJwtToken(socket, next) {
  try {
    // Extract token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new Error('JWT_SECRET not configured'));
    }

    const payload = jwt.verify(token, jwtSecret);

    // Validate token type (should be 'access' token)
    if (payload.type !== 'access') {
      return next(new Error('Invalid token type'));
    }

    // Attach user data to socket
    socket.userId = payload.userId;
    socket.userRole = payload.role;

    next();

  } catch (error) {
    console.error('Socket authentication error:', error.message);

    if (error.message === 'jwt expired') {
      return next(new Error('Token expired'));
    }

    return next(new Error('Authentication failed'));
  }
}

// ============================================================================
// Connection Handler
// ============================================================================

/**
 * Handle new socket connection with presence tracking
 * @param {Object} socket - Socket.io socket instance
 */
async function handleSocketConnectionWithPresenceTracking(socket) {
  try {
    console.log(`✅ Socket connected: ${socket.id} (User: ${socket.userId})`);

    // Create presence session
    await createPresenceSessionInDatabase(socket.id, socket.userId);

    // Get user info for welcome message
    const userResult = await pool.query(
      'SELECT first_name, last_name, role FROM users WHERE id = $1',
      [socket.userId]
    );

    const user = userResult.rows[0];

    // Send connection acknowledgment
    socket.emit('connection:acknowledged', {
      socketId: socket.id,
      user: {
        userId: socket.userId,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });

    // Broadcast presence join to all clients
    io.emit('presence:join', {
      userId: socket.userId,
      user: {
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });

    // Register event handlers
    registerSocketEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} (Reason: ${reason})`);

      // Remove presence session
      await removePresenceSessionFromDatabase(socket.id);

      // Broadcast presence leave
      io.emit('presence:leave', {
        userId: socket.userId
      });
    });

  } catch (error) {
    console.error('Error handling socket connection:', error);
    socket.disconnect(true);
  }
}

// ============================================================================
// Event Handlers Registration
// ============================================================================

/**
 * Register all socket event handlers
 * @param {Object} socket - Socket.io socket instance
 */
function registerSocketEventHandlers(socket) {
  // Room management
  socket.on('room:join', (data) => handleRoomJoinRequest(socket, data));
  socket.on('room:leave', (data) => handleRoomLeaveRequest(socket, data));

  // Typing indicators
  socket.on('typing:start', (data) => handleTypingStartEvent(socket, data));
  socket.on('typing:stop', (data) => handleTypingStopEvent(socket, data));

  // Heartbeat for presence tracking
  socket.on('heartbeat', () => updatePresenceSessionHeartbeat(socket.id));
}

// ============================================================================
// Room Management
// ============================================================================

/**
 * Handle room join request
 * @param {Object} socket - Socket.io socket instance
 * @param {Object} data - { room: string }
 */
async function handleRoomJoinRequest(socket, data) {
  try {
    const { room } = data;

    if (!room) {
      socket.emit('error', { code: 'INVALID_ROOM', message: 'Room name required' });
      return;
    }

    // Join Socket.io room
    socket.join(room);

    // Update presence session with current room
    await pool.query(
      'UPDATE presence_sessions SET current_room = $1, last_seen = NOW() WHERE socket_id = $2',
      [room, socket.id]
    );

    console.log(`🚪 Socket ${socket.id} joined room: ${room}`);

    // Get user info
    const userResult = await pool.query(
      'SELECT first_name, last_name, role FROM users WHERE id = $1',
      [socket.userId]
    );

    const user = userResult.rows[0];

    // Broadcast to room that user joined
    socket.to(room).emit('presence:join', {
      userId: socket.userId,
      user: {
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      room: room
    });

    // Acknowledge join
    socket.emit('room:joined', { room });

  } catch (error) {
    console.error('Error handling room join:', error);
    socket.emit('error', { code: 'ROOM_JOIN_FAILED', message: 'Failed to join room' });
  }
}

/**
 * Handle room leave request
 * @param {Object} socket - Socket.io socket instance
 * @param {Object} data - { room: string }
 */
async function handleRoomLeaveRequest(socket, data) {
  try {
    const { room } = data;

    if (!room) {
      socket.emit('error', { code: 'INVALID_ROOM', message: 'Room name required' });
      return;
    }

    // Leave Socket.io room
    socket.leave(room);

    // Clear current room in presence session
    await pool.query(
      'UPDATE presence_sessions SET current_room = NULL, last_seen = NOW() WHERE socket_id = $1',
      [socket.id]
    );

    console.log(`🚪 Socket ${socket.id} left room: ${room}`);

    // Broadcast to room that user left
    socket.to(room).emit('presence:leave', {
      userId: socket.userId,
      room: room
    });

    // Acknowledge leave
    socket.emit('room:left', { room });

  } catch (error) {
    console.error('Error handling room leave:', error);
    socket.emit('error', { code: 'ROOM_LEAVE_FAILED', message: 'Failed to leave room' });
  }
}

// ============================================================================
// Typing Indicators
// ============================================================================

/**
 * Handle typing start event
 * @param {Object} socket - Socket.io socket instance
 * @param {Object} data - { incidentId: string }
 */
async function handleTypingStartEvent(socket, data) {
  try {
    const { incidentId } = data;

    if (!incidentId) {
      return;
    }

    // Get user info
    const userResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [socket.userId]
    );

    const user = userResult.rows[0];

    // Broadcast to incident room
    const room = `incident:${incidentId}`;
    socket.to(room).emit('presence:typing', {
      userId: socket.userId,
      userName: `${user.first_name} ${user.last_name}`,
      incidentId: incidentId,
      isTyping: true
    });

  } catch (error) {
    console.error('Error handling typing start:', error);
  }
}

/**
 * Handle typing stop event
 * @param {Object} socket - Socket.io socket instance
 * @param {Object} data - { incidentId: string }
 */
async function handleTypingStopEvent(socket, data) {
  try {
    const { incidentId } = data;

    if (!incidentId) {
      return;
    }

    // Broadcast to incident room
    const room = `incident:${incidentId}`;
    socket.to(room).emit('presence:typing', {
      userId: socket.userId,
      incidentId: incidentId,
      isTyping: false
    });

  } catch (error) {
    console.error('Error handling typing stop:', error);
  }
}

// ============================================================================
// Presence Database Operations
// ============================================================================

/**
 * Create presence session in database
 * @param {string} socketId - Socket.io connection ID
 * @param {string} userId - User UUID
 */
async function createPresenceSessionInDatabase(socketId, userId) {
  try {
    await pool.query(
      `INSERT INTO presence_sessions (socket_id, user_id, connected_at, last_seen)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (socket_id) DO UPDATE
       SET user_id = $2, connected_at = NOW(), last_seen = NOW()`,
      [socketId, userId]
    );
  } catch (error) {
    console.error('Error creating presence session:', error);
    throw error;
  }
}

/**
 * Remove presence session from database
 * @param {string} socketId - Socket.io connection ID
 */
async function removePresenceSessionFromDatabase(socketId) {
  try {
    await pool.query(
      'DELETE FROM presence_sessions WHERE socket_id = $1',
      [socketId]
    );
  } catch (error) {
    console.error('Error removing presence session:', error);
  }
}

/**
 * Update presence session heartbeat
 * @param {string} socketId - Socket.io connection ID
 */
async function updatePresenceSessionHeartbeat(socketId) {
  try {
    await pool.query(
      'UPDATE presence_sessions SET last_seen = NOW() WHERE socket_id = $1',
      [socketId]
    );
  } catch (error) {
    console.error('Error updating heartbeat:', error);
  }
}

// ============================================================================
// Broadcasting Utilities
// ============================================================================

/**
 * Broadcast incident created event to all clients
 * @param {Object} incident - Incident object
 * @param {Object} createdBy - User who created the incident
 */
export function broadcastIncidentCreatedToAllClients(incident, createdBy) {
  if (!io) {
    console.warn('Socket.io not initialized, cannot broadcast');
    return;
  }

  io.emit('incident:created', {
    incident: incident,
    createdBy: createdBy
  });
}

/**
 * Broadcast incident updated event to incident room
 * @param {string} incidentId - Incident ID
 * @param {Object} incident - Updated incident object
 * @param {Object} updatedBy - User who updated the incident
 */
export function broadcastIncidentUpdatedToRoom(incidentId, incident, updatedBy) {
  if (!io) {
    console.warn('Socket.io not initialized, cannot broadcast');
    return;
  }

  const room = `incident:${incidentId}`;
  io.to(room).emit('incident:updated', {
    incident: incident,
    updatedBy: updatedBy
  });
}

/**
 * Broadcast incident resolved event
 * @param {string} incidentId - Incident ID
 * @param {Object} resolvedBy - User who resolved the incident
 * @param {string} resolution - Resolution text
 */
export function broadcastIncidentResolvedToAll(incidentId, resolvedBy, resolution) {
  if (!io) {
    console.warn('Socket.io not initialized, cannot broadcast');
    return;
  }

  io.emit('incident:resolved', {
    incidentId: incidentId,
    resolvedBy: resolvedBy,
    resolution: resolution
  });
}

/**
 * Broadcast comment created event to incident room
 * @param {string} incidentId - Incident ID
 * @param {Object} comment - Comment object
 * @param {Object} author - User who created the comment
 */
export function broadcastCommentCreatedToRoom(incidentId, comment, author) {
  if (!io) {
    console.warn('Socket.io not initialized, cannot broadcast');
    return;
  }

  const room = `incident:${incidentId}`;
  io.to(room).emit('comment:created', {
    comment: comment,
    incidentId: incidentId,
    author: author
  });
}

// ============================================================================
// Periodic Cleanup
// ============================================================================

/**
 * Start periodic cleanup of stale presence sessions
 */
export function startPresenceSessionCleanupScheduler() {
  // Cleanup every 2 minutes
  setInterval(async () => {
    try {
      const result = await pool.query('SELECT cleanup_stale_presence_sessions()');
      const deletedCount = result.rows[0].cleanup_stale_presence_sessions;

      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} stale presence sessions`);
      }
    } catch (error) {
      console.error('Error during presence cleanup:', error);
    }
  }, 2 * 60 * 1000); // 2 minutes
}

// ============================================================================
// Export
// ============================================================================

export default {
  initializeSocketServerWithHttpServer,
  getSocketServerInstance,
  broadcastIncidentCreatedToAllClients,
  broadcastIncidentUpdatedToRoom,
  broadcastIncidentResolvedToAll,
  broadcastCommentCreatedToRoom,
  startPresenceSessionCleanupScheduler
};
