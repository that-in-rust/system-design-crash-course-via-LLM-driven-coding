// ============================================================================
// Incidents Route Handler - Year 1: Core CRUD
// ============================================================================
// Following patterns from: Idiom-React-Frontend-Patterns.md
// Naming convention: 4-word pattern for all functions
// TDD Phase: GREEN - Implementing minimal code to pass tests
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
// Helper Functions
// ============================================================================

/**
 * Validate severity enum value
 * @param {string} severity - Severity level to validate
 * @returns {boolean} Is valid severity
 */
function validateSeverityEnumValue(severity) {
  const validSeverities = ['MISCHIEF', 'SUSPICIOUS', 'DANGEROUS', 'UNFORGIVABLE'];
  return validSeverities.includes(severity);
}

/**
 * Validate location enum value
 * @param {string} location - Location to validate
 * @returns {boolean} Is valid location
 */
function validateLocationEnumValue(location) {
  const validLocations = [
    'HOGWARTS',
    'HOGSMEADE',
    'KNOCKTURN_ALLEY',
    'FORBIDDEN_FOREST',
    'MINISTRY',
    'AZKABAN',
    'DIAGON_ALLEY',
    'PLATFORM_9_3_4'
  ];
  return validLocations.includes(location);
}

// ============================================================================
// POST /api/incidents - Create new incident
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const { title, description, severity = 'MISCHIEF', location } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed: title is required'
      });
    }

    if (!location) {
      return res.status(400).json({
        error: 'Validation failed: location is required'
      });
    }

    if (!validateSeverityEnumValue(severity)) {
      return res.status(400).json({
        error: `Invalid severity: ${severity}. Must be one of: MISCHIEF, SUSPICIOUS, DANGEROUS, UNFORGIVABLE`
      });
    }

    if (!validateLocationEnumValue(location)) {
      return res.status(400).json({
        error: `Invalid location: ${location}`
      });
    }

    // Get user ID from authenticated request (Year 2: from JWT)
    const userId = req.user.userId;

    // Insert incident
    const result = await pool.query(
      `INSERT INTO incidents (title, description, severity, location, reported_by, status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN')
       RETURNING id, title, description, severity, location, status,
                 reported_by, reported_at, updated_at`,
      [title, description || null, severity, location, userId]
    );

    const incident = result.rows[0];

    // Return created incident
    res.status(201).json({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      location: incident.location,
      status: incident.status,
      reported_by: incident.reported_by,
      reported_at: incident.reported_at,
      updated_at: incident.updated_at
    });

  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// GET /api/incidents - List all incidents with optional filtering
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { severity, location, status = 'OPEN' } = req.query;

    // Build query with filters
    let query = `
      SELECT id, title, description, severity, location, status,
             reported_by, reported_at, updated_at, resolved_at, resolved_by
      FROM incidents
      WHERE deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    // Add filters if provided
    if (severity) {
      query += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (location) {
      query += ` AND location = $${paramIndex}`;
      params.push(location);
      paramIndex++;
    }

    if (status && status !== 'ALL') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Sort by most recent first
    query += ` ORDER BY reported_at DESC`;

    const result = await pool.query(query, params);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// GET /api/incidents/:id - Get single incident by ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        error: 'Invalid incident ID: must be a number'
      });
    }

    const result = await pool.query(
      `SELECT id, title, description, severity, location, status,
              reported_by, reported_at, updated_at, resolved_at, resolved_by,
              witness_count, tags, evidence_urls
       FROM incidents
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: `Incident with ID ${id} not found`
      });
    }

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// PUT /api/incidents/:id - Update incident
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, severity, location } = req.body;

    // Validate ID
    if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        error: 'Invalid incident ID: must be a number'
      });
    }

    // Validate enum values if provided
    if (severity && !validateSeverityEnumValue(severity)) {
      return res.status(400).json({
        error: `Invalid severity: ${severity}`
      });
    }

    if (location && !validateLocationEnumValue(location)) {
      return res.status(400).json({
        error: `Invalid location: ${location}`
      });
    }

    // Check if incident exists
    const checkResult = await pool.query(
      'SELECT id FROM incidents WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: `Incident with ID ${id} not found`
      });
    }

    // Build UPDATE query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (severity !== undefined) {
      updates.push(`severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    if (location !== undefined) {
      updates.push(`location = $${paramIndex}`);
      params.push(location);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    // Add incident ID as last parameter
    params.push(id);

    const query = `
      UPDATE incidents
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, title, description, severity, location, status,
                reported_by, reported_at, updated_at
    `;

    const result = await pool.query(query, params);

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================================================
// DELETE /api/incidents/:id - Resolve incident (soft delete)
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({
        error: 'Invalid incident ID: must be a number'
      });
    }

    // Get user ID from authenticated request (Year 2: from JWT)
    const userId = req.user.userId;

    // Check if incident exists and is not already resolved
    const checkResult = await pool.query(
      'SELECT id, status FROM incidents WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: `Incident with ID ${id} not found`
      });
    }

    if (checkResult.rows[0].status === 'RESOLVED') {
      return res.status(400).json({
        error: 'Incident is already resolved'
      });
    }

    // Update incident to RESOLVED status
    const result = await pool.query(
      `UPDATE incidents
       SET status = 'RESOLVED',
           resolved_at = NOW(),
           resolved_by = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, description, severity, location, status,
                 reported_by, reported_at, resolved_at, resolved_by, updated_at`,
      [id, userId]
    );

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error resolving incident:', error);
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
