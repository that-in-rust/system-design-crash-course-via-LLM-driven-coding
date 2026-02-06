// ============================================================================
// Authentication Route Handler - Year 2: Authentication & Authorization
// ============================================================================
// Following patterns from: Idiom-React-Frontend-Patterns.md
// Naming convention: 4-word pattern for all functions
// RESTful endpoints for authentication and user management
// ============================================================================

import express from 'express';
import {
  registerUserWithEmailPassword,
  loginUserWithEmailPassword,
  refreshAccessTokenWithRefreshToken,
  revokeRefreshTokenInDatabase,
  changeUserPasswordWithVerification
} from '../services/authenticationService.js';
import { authenticateRequestWithJwtToken } from '../middleware/authenticationMiddlewareHandler.js';
import { pool } from '../db/connectionPoolManager.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ============================================================================
// POST /api/auth/register - User Registration
// ============================================================================

/**
 * Register a new user
 *
 * Request body:
 * {
 *   "email": "harry.potter@hogwarts.edu",
 *   "password": "Password123!",
 *   "firstName": "Harry",
 *   "lastName": "Potter"
 * }
 *
 * Response (201):
 * {
 *   "user": { id, email, firstName, lastName, role, house, createdAt, updatedAt }
 * }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation: Required fields
    if (!email) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email is required'
      });
    }
    if (!password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Password is required'
      });
    }
    if (!firstName) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'First name is required'
      });
    }
    if (!lastName) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Last name is required'
      });
    }

    // Register user
    const user = await registerUserWithEmailPassword(
      email,
      password,
      firstName,
      lastName
    );

    // Return created user (201 Created)
    return res.status(201).json({
      user: user
    });

  } catch (error) {
    // Handle specific errors
    if (error.message === 'Email already registered') {
      return res.status(409).json({
        error: 'Registration failed',
        message: error.message
      });
    }

    if (error.message.includes('@hogwarts.edu')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }

    if (error.message.includes('at least 8 characters')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }

    // Generic error
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// ============================================================================
// POST /api/auth/login - User Login
// ============================================================================

/**
 * Login with email and password
 *
 * Request body:
 * {
 *   "email": "harry.potter@hogwarts.edu",
 *   "password": "Password123!"
 * }
 *
 * Response (200):
 * {
 *   "user": { id, email, firstName, lastName, role, house, createdAt, updatedAt },
 *   "accessToken": "eyJhbGc...",
 *   "refreshToken": "eyJhbGc..."
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation: Required fields
    if (!email) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email is required'
      });
    }
    if (!password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Password is required'
      });
    }

    // Attempt login
    const result = await loginUserWithEmailPassword(email, password);

    // Return user profile and tokens
    return res.status(200).json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });

  } catch (error) {
    // Handle authentication errors
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Generic error
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// ============================================================================
// POST /api/auth/refresh - Refresh Access Token
// ============================================================================

/**
 * Refresh access token using refresh token
 *
 * Request body:
 * {
 *   "refreshToken": "eyJhbGc..."
 * }
 *
 * Response (200):
 * {
 *   "accessToken": "eyJhbGc...",
 *   "refreshToken": "eyJhbGc..." (rotated)
 * }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Validation: Required field
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Refresh token is required'
      });
    }

    // Refresh tokens
    const result = await refreshAccessTokenWithRefreshToken(refreshToken);

    // Return new tokens
    return res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });

  } catch (error) {
    // Handle token errors
    if (error.message === 'jwt expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Refresh token has expired. Please log in again.'
      });
    }

    if (error.message === 'invalid signature' || error.message.includes('malformed')) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Refresh token is invalid'
      });
    }

    if (error.message === 'Refresh token has been revoked') {
      return res.status(401).json({
        error: 'Token revoked',
        message: 'Refresh token has been revoked. Please log in again.'
      });
    }

    // Generic error
    console.error('Token refresh error:', error);
    return res.status(500).json({
      error: 'Refresh failed',
      message: 'An error occurred during token refresh'
    });
  }
});

// ============================================================================
// POST /api/auth/logout - Logout (Revoke Refresh Token)
// ============================================================================

/**
 * Logout by revoking refresh token
 *
 * Request body:
 * {
 *   "refreshToken": "eyJhbGc..."
 * }
 *
 * Response (200):
 * {
 *   "message": "Logged out successfully"
 * }
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Validation: Required field
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Refresh token is required'
      });
    }

    // Decode token to get jti (don't verify, we're revoking anyway)
    let jti;
    try {
      const decoded = jwt.decode(refreshToken);
      jti = decoded?.jti;
    } catch (error) {
      // If token is invalid, that's okay - logout should succeed anyway
      return res.status(200).json({
        message: 'Logged out successfully'
      });
    }

    // Revoke token if jti exists
    if (jti) {
      await revokeRefreshTokenInDatabase(jti);
    }

    // Return success (logout always succeeds)
    return res.status(200).json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    // Logout should never fail from user perspective
    console.error('Logout error:', error);
    return res.status(200).json({
      message: 'Logged out successfully'
    });
  }
});

// ============================================================================
// Protected Routes - Require Authentication
// ============================================================================

// Apply JWT authentication middleware to routes below
router.use(authenticateRequestWithJwtToken);

// ============================================================================
// GET /api/auth/me - Get Current User Profile
// ============================================================================

/**
 * Get current authenticated user profile
 *
 * Headers:
 * Authorization: Bearer <accessToken>
 *
 * Response (200):
 * {
 *   "user": { id, email, firstName, lastName, role, house, createdAt, updatedAt }
 * }
 */
router.get('/me', async (req, res) => {
  try {
    // req.user is set by authentication middleware
    const userId = req.user.userId;

    // Query user profile from database
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, house, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    const user = result.rows[0];

    // Return user profile
    return res.status(200).json({
      user: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      error: 'Failed to fetch profile',
      message: 'An error occurred while fetching user profile'
    });
  }
});

// ============================================================================
// PUT /api/auth/change-password - Change Password
// ============================================================================

/**
 * Change user password
 *
 * Headers:
 * Authorization: Bearer <accessToken>
 *
 * Request body:
 * {
 *   "oldPassword": "OldPassword123!",
 *   "newPassword": "NewPassword456!"
 * }
 *
 * Response (200):
 * {
 *   "message": "Password changed successfully"
 * }
 */
router.put('/change-password', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    // Validation: Required fields
    if (!oldPassword) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Current password is required'
      });
    }
    if (!newPassword) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'New password is required'
      });
    }

    // Change password
    await changeUserPasswordWithVerification(userId, oldPassword, newPassword);

    // Return success
    return res.status(200).json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    // Handle specific errors
    if (error.message === 'Current password is incorrect') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
    }

    if (error.message.includes('at least 8 characters')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }

    if (error.message === 'New password must be different from current password') {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }

    // Generic error
    console.error('Change password error:', error);
    return res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while changing password'
    });
  }
});

// ============================================================================
// Export Router
// ============================================================================

export default router;
