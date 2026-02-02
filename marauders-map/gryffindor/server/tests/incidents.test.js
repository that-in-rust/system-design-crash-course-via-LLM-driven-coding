// ============================================================================
// Gryffindor Backend Tests - Year 1: Core CRUD
// ============================================================================
// TDD Phase: RED - Writing failing tests first
// Following patterns from: Idiom-React-Frontend-Patterns.md
// Naming convention: 4-word pattern for test names
// ============================================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app, server } from '../src/server.js';
import { pool } from '../src/db/connectionPoolManager.js';

// ============================================================================
// Test Setup
// ============================================================================

let testUserId;
let testAuthToken;

beforeAll(async () => {
  // Get a test user from seeded data
  const result = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    ['harry.potter@hogwarts.edu']
  );

  testUserId = result.rows[0]?.id;

  // For now, we'll mock the auth token (Year 2 will implement real auth)
  testAuthToken = 'mock-jwt-token';
});

afterAll(async () => {
  await pool.end();
  server.close();
});

beforeEach(async () => {
  // Clean up test incidents before each test
  await pool.query(
    `DELETE FROM incidents WHERE title LIKE 'TEST:%'`
  );
});

// ============================================================================
// POST /api/incidents - Create incident
// ============================================================================

describe('POST /api/incidents', () => {
  it('should_create_incident_with_valid_data', async () => {
    // Arrange
    const newIncident = {
      title: 'TEST: Dark Mark over Hogwarts',
      description: 'Multiple witnesses report seeing the Dark Mark hovering over the castle',
      severity: 'DANGEROUS',
      location: 'HOGWARTS'
    };

    // Act
    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(newIncident)
      .expect('Content-Type', /json/)
      .expect(201);

    // Assert
    expect(response.body).toMatchObject({
      title: newIncident.title,
      description: newIncident.description,
      severity: newIncident.severity,
      location: newIncident.location,
      status: 'OPEN'
    });

    expect(response.body.id).toBeDefined();
    expect(response.body.reported_by).toBe(testUserId);
    expect(response.body.reported_at).toBeDefined();
  });

  it('should_reject_incident_without_title', async () => {
    // Arrange
    const invalidIncident = {
      description: 'Missing title',
      severity: 'MISCHIEF',
      location: 'HOGWARTS'
    };

    // Act & Assert
    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidIncident)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.error).toContain('title');
  });

  it('should_reject_incident_with_invalid_severity', async () => {
    // Arrange
    const invalidIncident = {
      title: 'TEST: Invalid severity',
      description: 'This should fail',
      severity: 'VERY_BAD',  // Invalid enum value
      location: 'HOGWARTS'
    };

    // Act & Assert
    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(invalidIncident)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it('should_reject_incident_without_authorization', async () => {
    // Arrange
    const newIncident = {
      title: 'TEST: Unauthorized attempt',
      description: 'Should be rejected',
      severity: 'MISCHIEF',
      location: 'HOGWARTS'
    };

    // Act & Assert
    await request(app)
      .post('/api/incidents')
      .send(newIncident)
      .expect(401);
  });

  it('should_default_severity_to_mischief', async () => {
    // Arrange
    const newIncident = {
      title: 'TEST: Default severity',
      description: 'No severity specified',
      location: 'HOGSMEADE'
      // severity omitted - should default to MISCHIEF
    };

    // Act
    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(newIncident)
      .expect(201);

    // Assert
    expect(response.body.severity).toBe('MISCHIEF');
  });
});

// ============================================================================
// GET /api/incidents - List all incidents
// ============================================================================

describe('GET /api/incidents', () => {
  beforeEach(async () => {
    // Create test incidents
    await pool.query(
      `INSERT INTO incidents (title, description, severity, location, reported_by)
       VALUES
         ('TEST: Incident 1', 'Description 1', 'MISCHIEF', 'HOGWARTS', $1),
         ('TEST: Incident 2', 'Description 2', 'DANGEROUS', 'HOGSMEADE', $1),
         ('TEST: Incident 3', 'Description 3', 'SUSPICIOUS', 'KNOCKTURN_ALLEY', $1)`,
      [testUserId]
    );
  });

  it('should_return_all_incidents_as_array', async () => {
    // Act
    const response = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(3);

    // Check structure of first incident
    const incident = response.body[0];
    expect(incident).toHaveProperty('id');
    expect(incident).toHaveProperty('title');
    expect(incident).toHaveProperty('severity');
    expect(incident).toHaveProperty('location');
    expect(incident).toHaveProperty('status');
    expect(incident).toHaveProperty('reported_at');
  });

  it('should_filter_incidents_by_severity', async () => {
    // Act
    const response = await request(app)
      .get('/api/incidents')
      .query({ severity: 'DANGEROUS' })
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    // Assert
    expect(response.body.every(incident => incident.severity === 'DANGEROUS')).toBe(true);
  });

  it('should_filter_incidents_by_location', async () => {
    // Act
    const response = await request(app)
      .get('/api/incidents')
      .query({ location: 'HOGSMEADE' })
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    // Assert
    expect(response.body.every(incident => incident.location === 'HOGSMEADE')).toBe(true);
  });

  it('should_sort_incidents_by_reported_date_descending', async () => {
    // Act
    const response = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    // Assert - verify descending order (newest first)
    for (let i = 0; i < response.body.length - 1; i++) {
      const current = new Date(response.body[i].reported_at);
      const next = new Date(response.body[i + 1].reported_at);
      expect(current >= next).toBe(true);
    }
  });

  it('should_reject_request_without_authorization', async () => {
    // Act & Assert
    await request(app)
      .get('/api/incidents')
      .expect(401);
  });
});

// ============================================================================
// GET /api/incidents/:id - Get single incident
// ============================================================================

describe('GET /api/incidents/:id', () => {
  let testIncidentId;

  beforeEach(async () => {
    const result = await pool.query(
      `INSERT INTO incidents (title, description, severity, location, reported_by)
       VALUES ('TEST: Single incident', 'Description', 'SUSPICIOUS', 'HOGWARTS', $1)
       RETURNING id`,
      [testUserId]
    );
    testIncidentId = result.rows[0].id;
  });

  it('should_return_incident_by_valid_id', async () => {
    // Act
    const response = await request(app)
      .get(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(response.body.id).toBe(testIncidentId);
    expect(response.body.title).toBe('TEST: Single incident');
    expect(response.body.severity).toBe('SUSPICIOUS');
  });

  it('should_return_404_for_nonexistent_incident', async () => {
    // Act & Assert
    const response = await request(app)
      .get('/api/incidents/999999')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(404);

    expect(response.body.error).toBeDefined();
  });

  it('should_return_400_for_invalid_id_format', async () => {
    // Act & Assert
    await request(app)
      .get('/api/incidents/not-a-number')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(400);
  });
});

// ============================================================================
// PUT /api/incidents/:id - Update incident
// ============================================================================

describe('PUT /api/incidents/:id', () => {
  let testIncidentId;

  beforeEach(async () => {
    const result = await pool.query(
      `INSERT INTO incidents (title, description, severity, location, reported_by)
       VALUES ('TEST: Update me', 'Original description', 'MISCHIEF', 'HOGWARTS', $1)
       RETURNING id`,
      [testUserId]
    );
    testIncidentId = result.rows[0].id;
  });

  it('should_update_incident_severity_successfully', async () => {
    // Arrange
    const updates = {
      severity: 'DANGEROUS'
    };

    // Act
    const response = await request(app)
      .put(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(updates)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(response.body.id).toBe(testIncidentId);
    expect(response.body.severity).toBe('DANGEROUS');
    expect(response.body.title).toBe('TEST: Update me'); // Unchanged
  });

  it('should_update_incident_title_and_description', async () => {
    // Arrange
    const updates = {
      title: 'TEST: Updated title',
      description: 'Updated description'
    };

    // Act
    const response = await request(app)
      .put(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(updates)
      .expect(200);

    // Assert
    expect(response.body.title).toBe('TEST: Updated title');
    expect(response.body.description).toBe('Updated description');
  });

  it('should_return_404_for_nonexistent_incident', async () => {
    // Arrange
    const updates = { severity: 'DANGEROUS' };

    // Act & Assert
    await request(app)
      .put('/api/incidents/999999')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(updates)
      .expect(404);
  });

  it('should_reject_invalid_severity_value', async () => {
    // Arrange
    const updates = { severity: 'INVALID_SEVERITY' };

    // Act & Assert
    const response = await request(app)
      .put(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send(updates)
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it('should_update_timestamp_on_modification', async () => {
    // Arrange
    const originalResponse = await request(app)
      .get(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`);

    const originalUpdatedAt = originalResponse.body.updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    // Act
    const response = await request(app)
      .put(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ description: 'Modified description' })
      .expect(200);

    // Assert
    expect(new Date(response.body.updated_at) > new Date(originalUpdatedAt)).toBe(true);
  });
});

// ============================================================================
// DELETE /api/incidents/:id - Resolve/Archive incident
// ============================================================================

describe('DELETE /api/incidents/:id', () => {
  let testIncidentId;

  beforeEach(async () => {
    const result = await pool.query(
      `INSERT INTO incidents (title, description, severity, location, reported_by)
       VALUES ('TEST: Delete me', 'To be deleted', 'MISCHIEF', 'HOGWARTS', $1)
       RETURNING id`,
      [testUserId]
    );
    testIncidentId = result.rows[0].id;
  });

  it('should_resolve_incident_successfully', async () => {
    // Act
    const response = await request(app)
      .delete(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    // Assert
    expect(response.body.id).toBe(testIncidentId);
    expect(response.body.status).toBe('RESOLVED');
    expect(response.body.resolved_at).toBeDefined();
    expect(response.body.resolved_by).toBe(testUserId);
  });

  it('should_not_permanently_delete_incident_from_database', async () => {
    // Act
    await request(app)
      .delete(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    // Assert - incident still exists in database
    const result = await pool.query(
      'SELECT * FROM incidents WHERE id = $1',
      [testIncidentId]
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].status).toBe('RESOLVED');
  });

  it('should_return_404_for_nonexistent_incident', async () => {
    // Act & Assert
    await request(app)
      .delete('/api/incidents/999999')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(404);
  });

  it('should_prevent_resolving_already_resolved_incident', async () => {
    // Arrange - resolve incident first time
    await request(app)
      .delete(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    // Act & Assert - try to resolve again
    const response = await request(app)
      .delete(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(400);

    expect(response.body.error).toContain('already resolved');
  });
});

// ============================================================================
// Integration Tests - Full Workflow
// ============================================================================

describe('Full CRUD workflow integration', () => {
  it('should_complete_full_incident_lifecycle', async () => {
    // 1. CREATE
    const createResponse = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({
        title: 'TEST: Full lifecycle test',
        description: 'Testing complete workflow',
        severity: 'SUSPICIOUS',
        location: 'HOGSMEADE'
      })
      .expect(201);

    const incidentId = createResponse.body.id;
    expect(incidentId).toBeDefined();

    // 2. READ
    const getResponse = await request(app)
      .get(`/api/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    expect(getResponse.body.title).toBe('TEST: Full lifecycle test');
    expect(getResponse.body.status).toBe('OPEN');

    // 3. UPDATE
    const updateResponse = await request(app)
      .put(`/api/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .send({ severity: 'DANGEROUS' })
      .expect(200);

    expect(updateResponse.body.severity).toBe('DANGEROUS');

    // 4. DELETE (resolve)
    const deleteResponse = await request(app)
      .delete(`/api/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    expect(deleteResponse.body.status).toBe('RESOLVED');

    // 5. VERIFY - incident no longer in active list
    const listResponse = await request(app)
      .get('/api/incidents')
      .query({ status: 'OPEN' })
      .set('Authorization', `Bearer ${testAuthToken}`)
      .expect(200);

    const foundInActiveList = listResponse.body.some(i => i.id === incidentId);
    expect(foundInActiveList).toBe(false);
  });
});

// ============================================================================
// END OF TESTS
// ============================================================================
