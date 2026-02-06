// ============================================================================
// Notifications Route Handler - Year 3: Real-Time Features
// ============================================================================
// Following patterns from: Idiom-React-Frontend-Patterns.md
// Naming convention: 4-word pattern for all functions
// In-app notifications management
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
// GET /api/notifications - Get user notifications
// ============================================================================

/**
 * Get all notifications for the authenticated user
 *
 * Query params:
 * - unread: boolean (optional) - filter unread notifications only
 * - limit: number (optional) - limit results (default: 50)
 *
 * Response:
 * {
 *   notifications: [...]
 * }
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { unread, limit = 50 } = req.query;

    // Build query
    let query = `
      SELECT id, user_id, type, message, link, is_read, created_at, read_at
      FROM notifications
      WHERE user_id = $1
    `;

    const params = [userId];

    // Filter unread if requested
    if (unread === 'true') {
      query += ' AND is_read = FALSE';
    }

    // Order by most recent first
    query += ' ORDER BY created_at DESC';

    // Limit results
    query += ` LIMIT $${params.length + 1}`;
    params.push(parseInt(limit, 10));

    const result = await pool.query(query, params);

    res.status(200).json({
      notifications: result.rows
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// GET /api/notifications/unread/count - Get unread count
// ============================================================================

/**
 * Get count of unread notifications for the authenticated user
 *
 * Response:
 * {
 *   count: 5
 * }
 */
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.status(200).json({
      count: parseInt(result.rows[0].count, 10)
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// PATCH /api/notifications/:id/read - Mark notification as read
// ============================================================================

/**
 * Mark a specific notification as read
 *
 * Response:
 * {
 *   message: "Notification marked as read",
 *   notification: {...}
 * }
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Update notification
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, type, message, link, is_read, created_at, read_at`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notification not found or does not belong to user'
      });
    }

    res.status(200).json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// PATCH /api/notifications/read-all - Mark all as read
// ============================================================================

/**
 * Mark all notifications as read for the authenticated user
 *
 * Response:
 * {
 *   message: "All notifications marked as read",
 *   count: 12
 * }
 */
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING id`,
      [userId]
    );

    res.status(200).json({
      message: 'All notifications marked as read',
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// DELETE /api/notifications/:id - Delete notification
// ============================================================================

/**
 * Delete a specific notification
 *
 * Response:
 * {
 *   message: "Notification deleted"
 * }
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notification not found or does not belong to user'
      });
    }

    res.status(200).json({
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
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
