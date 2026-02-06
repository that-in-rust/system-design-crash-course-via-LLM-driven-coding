// ============================================================================
// Presence Route Handler - Year 3: Real-Time Features
// ============================================================================
// Following patterns from: Idiom-React-Frontend-Patterns.md
// Naming convention: 4-word pattern for all functions
// User presence and online status management
// ============================================================================

import express from 'express';
import { pool } from '../db/connectionPoolManager.js';
import { authenticateRequestWithJwtToken } from '../middleware/authenticationMiddlewareHandler.js';

const router = express.Router();

// ============================================================================
// Middleware: Apply authentication to all routes
// ============================================================================

router.use(authenticateRequestWithJwtToken);

// ============================================================================
// GET /api/presence/online - Get online users
// ============================================================================

/**
 * Get list of all online users
 *
 * Response:
 * {
 *   online: [
 *     {userId, firstName, lastName, role, connectedAt}
 *   ],
 *   total: 12
 * }
 */
router.get('/online', async (req, res) => {
  try {
    // Get distinct online users (within last minute)
    const result = await pool.query(
      `SELECT DISTINCT ON (u.id)
         u.id as user_id,
         u.first_name,
         u.last_name,
         u.role,
         ps.connected_at
       FROM presence_sessions ps
       JOIN users u ON ps.user_id = u.id
       WHERE ps.last_seen > NOW() - INTERVAL '1 minute'
       ORDER BY u.id, ps.connected_at DESC`
    );

    res.status(200).json({
      online: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// GET /api/presence/online/by-role - Get online users by role
// ============================================================================

/**
 * Get count of online users grouped by role
 *
 * Response:
 * {
 *   byRole: {
 *     STUDENT: 45,
 *     PREFECT: 8,
 *     AUROR: 3
 *   },
 *   total: 56
 * }
 */
router.get('/online/by-role', async (req, res) => {
  try {
    // Use PostgreSQL function
    const result = await pool.query('SELECT * FROM get_online_users_by_role()');

    // Convert array to object
    const byRole = {};
    let total = 0;

    result.rows.forEach(row => {
      byRole[row.role] = parseInt(row.count, 10);
      total += parseInt(row.count, 10);
    });

    res.status(200).json({
      byRole: byRole,
      total: total
    });

  } catch (error) {
    console.error('Error fetching online users by role:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// GET /api/presence/incident/:id - Get users viewing an incident
// ============================================================================

/**
 * Get list of users currently viewing a specific incident page
 *
 * Response:
 * {
 *   viewers: [
 *     {userId, firstName, lastName, role, connectedAt}
 *   ],
 *   count: 3
 * }
 */
router.get('/incident/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate incident ID
    if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        error: 'Invalid incident ID: must be a number'
      });
    }

    // Use PostgreSQL function
    const result = await pool.query(
      'SELECT * FROM get_users_viewing_incident($1)',
      [id]
    );

    res.status(200).json({
      viewers: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching incident viewers:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// GET /api/presence/current-user - Get current user's presence sessions
// ============================================================================

/**
 * Get all active presence sessions for the authenticated user
 * (useful for debugging multiple tabs/devices)
 *
 * Response:
 * {
 *   sessions: [
 *     {socketId, connectedAt, lastSeen, currentRoom}
 *   ],
 *   count: 2
 * }
 */
router.get('/current-user', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT socket_id, connected_at, last_seen, current_room
       FROM presence_sessions
       WHERE user_id = $1
       ORDER BY connected_at DESC`,
      [userId]
    );

    res.status(200).json({
      sessions: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching user presence sessions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// Export Router
// ============================================================================

export default router;
