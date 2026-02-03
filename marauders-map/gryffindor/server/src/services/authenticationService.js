/**
 * Authentication Service - Year 2: Authentication & Authorization
 *
 * Following 4-word naming convention (4WNC):
 * - verb_constraint_target_qualifier()
 *
 * Security principles:
 * - Never log passwords
 * - Use bcrypt with cost factor 10
 * - Validate all inputs
 * - Handle errors gracefully
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connectionPoolManager.js';

// ============================================================================
// Constants
// ============================================================================

const BCRYPT_SALT_ROUNDS = 10; // Cost factor: balances security vs performance
const JWT_ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const JWT_REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// ============================================================================
// Phase 1: Password Security Foundation
// ============================================================================

/**
 * Hash a plaintext password using bcrypt with salt
 *
 * @param {string} plainPassword - The password to hash
 * @returns {Promise<string>} - The bcrypt hashed password
 * @throws {Error} - If hashing fails
 *
 * Security notes:
 * - Uses bcrypt cost factor 10 (~100ms on modern hardware)
 * - Automatically generates random salt
 * - Resulting hash is 60 characters
 * - Format: $2b$10$[22 char salt][31 char hash]
 *
 * Example:
 * const hash = await hashPasswordWithBcryptSalt('MyPassword123!');
 * // hash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
 */
export async function hashPasswordWithBcryptSalt(plainPassword) {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error.message);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a plaintext password with a stored bcrypt hash
 *
 * @param {string} plainPassword - The password to verify
 * @param {string} storedHash - The bcrypt hash from database
 * @returns {Promise<boolean>} - True if password matches, false otherwise
 * @throws {Error} - If hash format is invalid or comparison fails
 *
 * Security notes:
 * - Constant-time comparison (timing attack resistant)
 * - Validates hash format before comparison
 * - Never throws on wrong password (returns false)
 * - Only throws on invalid hash format or system errors
 *
 * Example:
 * const isValid = await comparePasswordWithStoredHash('MyPassword123!', hash);
 * // isValid = true or false
 */
export async function comparePasswordWithStoredHash(plainPassword, storedHash) {
  try {
    const isMatch = await bcrypt.compare(plainPassword, storedHash);
    return isMatch;
  } catch (error) {
    // bcrypt.compare throws on invalid hash format
    console.error('Error comparing password:', error.message);
    throw new Error('Invalid password hash format');
  }
}

// ============================================================================
// Phase 2: User Registration (TODO)
// ============================================================================

/**
 * Register a new user with email and password
 *
 * @param {string} email - User email (must end with @hogwarts.edu)
 * @param {string} password - Plain password (min 8 chars)
 * @param {string} firstName - User first name
 * @param {string} lastName - User last name
 * @returns {Promise<Object>} - Created user object (without password)
 * @throws {Error} - If validation fails or email exists
 */
export async function registerUserWithEmailPassword(email, password, firstName, lastName) {
  try {
    // Validation: Required fields
    if (!email) {
      throw new Error('Email is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }
    if (!firstName) {
      throw new Error('First name is required');
    }
    if (!lastName) {
      throw new Error('Last name is required');
    }

    // Normalize email (trim whitespace, lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    // Validation: @hogwarts.edu domain
    if (!normalizedEmail.endsWith('@hogwarts.edu')) {
      throw new Error('Email must end with @hogwarts.edu');
    }

    // Validation: Password strength (min 8 characters)
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password with bcrypt
    const passwordHash = await hashPasswordWithBcryptSalt(password);

    // Insert new user with default role STUDENT
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, 'STUDENT')
       RETURNING id, email, first_name, last_name, role, house, created_at, updated_at`,
      [normalizedEmail, passwordHash, firstName, lastName]
    );

    // Return user without password_hash
    const user = result.rows[0];
    return user;

  } catch (error) {
    console.error('Error registering user:', error.message);
    throw error; // Re-throw to let caller handle
  }
}

// ============================================================================
// Phase 3: JWT Token Generation
// ============================================================================

/**
 * Generate JWT access token for authenticated user
 *
 * @param {string} userId - User UUID
 * @param {string} userRole - User role (STUDENT, PREFECT, AUROR)
 * @returns {string} - Signed JWT access token (15 min expiry)
 */
export async function generateAccessTokenForUserId(userId, userRole) {
  try {
    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }

    // Create payload
    const payload = {
      userId: userId,
      role: userRole,
      type: 'access'
    };

    // Sign token with 15 minute expiry
    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: JWT_ACCESS_TOKEN_EXPIRY // '15m'
    });

    return accessToken;

  } catch (error) {
    console.error('Error generating access token:', error.message);
    throw error;
  }
}

/**
 * Generate JWT refresh token for authenticated user
 *
 * @param {string} userId - User UUID
 * @returns {Promise<string>} - Signed JWT refresh token (7 day expiry)
 */
export async function generateRefreshTokenForUserId(userId) {
  try {
    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }

    // Generate unique JWT ID (jti) for tracking/revocation
    const jti = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create payload
    const payload = {
      userId: userId,
      type: 'refresh',
      jti: jti
    };

    // Sign token with 7 day expiry
    const refreshToken = jwt.sign(payload, jwtSecret, {
      expiresIn: JWT_REFRESH_TOKEN_EXPIRY // '7d'
    });

    return refreshToken;

  } catch (error) {
    console.error('Error generating refresh token:', error.message);
    throw error;
  }
}

/**
 * Store refresh token in database with expiry
 *
 * @param {string} userId - User UUID
 * @param {string} tokenJti - JWT ID (jti claim)
 * @param {Date} expiresAt - Token expiration timestamp
 * @returns {Promise<void>}
 */
export async function storeRefreshTokenInDatabase(userId, tokenJti, expiresAt) {
  try {
    // Insert refresh token into database
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, is_revoked, expires_at)
       VALUES ($1, $2, FALSE, $3)`,
      [userId, tokenJti, expiresAt]
    );

  } catch (error) {
    console.error('Error storing refresh token:', error.message);
    throw error;
  }
}

// ============================================================================
// Phase 4: User Login
// ============================================================================

/**
 * Authenticate user with email and password
 *
 * @param {string} email - User email
 * @param {string} password - Plain password
 * @returns {Promise<Object>} - { user, accessToken, refreshToken }
 * @throws {Error} - If credentials invalid
 */
export async function loginUserWithEmailPassword(email, password) {
  try {
    // Validation: Required fields
    if (!email) {
      throw new Error('Email is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Query user by email
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, role, house,
              created_at, updated_at
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    // Check if user exists
    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password using bcrypt
    const isPasswordValid = await comparePasswordWithStoredHash(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = await generateAccessTokenForUserId(user.id, user.role);
    const refreshToken = await generateRefreshTokenForUserId(user.id);

    // Decode refresh token to get jti and expiry
    const refreshDecoded = jwt.decode(refreshToken);
    const expiresAt = new Date(refreshDecoded.exp * 1000);

    // Store refresh token in database
    await storeRefreshTokenInDatabase(user.id, refreshDecoded.jti, expiresAt);

    // Remove password_hash from user object before returning
    delete user.password_hash;

    // Return user profile and tokens
    return {
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken
    };

  } catch (error) {
    console.error('Error during login:', error.message);
    throw error;
  }
}

// ============================================================================
// Phase 5: Token Verification
// ============================================================================

/**
 * Verify JWT access token and return payload
 *
 * @param {string} token - JWT access token
 * @param {string} password - Plain password
 * @returns {Promise<Object>} - Decoded token payload { userId, role, type, iat, exp }
 * @throws {Error} - If token invalid, expired, or tampered
 *
 * Security notes:
 * - Verifies signature using JWT_SECRET
 * - Checks expiration automatically
 * - Throws on invalid/tampered tokens
 * - Returns full payload including metadata
 */
export async function verifyAccessTokenAndReturnPayload(token) {
  try {
    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }

    // Verify token signature and expiration
    const payload = jwt.verify(token, jwtSecret);

    // Return decoded payload
    return payload;

  } catch (error) {
    // jwt.verify throws specific errors:
    // - TokenExpiredError: 'jwt expired'
    // - JsonWebTokenError: 'invalid signature', 'jwt malformed', etc.
    // - NotBeforeError: 'jwt not active'
    console.error('Error verifying access token:', error.message);
    throw error; // Re-throw with original error message
  }
}

// ============================================================================
// Phase 6: Token Refresh & Logout
// ============================================================================

/**
 * Refresh access token using valid refresh token
 *
 * @param {string} refreshToken - JWT refresh token
 * @returns {Promise<Object>} - { accessToken, refreshToken } (rotated)
 * @throws {Error} - If refresh token invalid or revoked
 *
 * Security notes:
 * - Implements refresh token rotation (best practice)
 * - Verifies token signature and expiration
 * - Checks revocation status in database
 * - Invalidates old refresh token after use
 * - Issues new refresh token with new jti
 *
 * Example:
 * const { accessToken, refreshToken } = await refreshAccessTokenWithRefreshToken(oldRefreshToken);
 */
export async function refreshAccessTokenWithRefreshToken(refreshToken) {
  try {
    // Step 1: Verify the refresh token signature and expiration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }

    // jwt.verify throws if expired or invalid signature
    const payload = jwt.verify(refreshToken, jwtSecret);

    // Step 2: Validate token type
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type - expected refresh token');
    }

    // Step 3: Check if token exists and is not revoked in database
    const tokenCheck = await pool.query(
      `SELECT user_id, is_revoked, expires_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [payload.jti]
    );

    if (tokenCheck.rows.length === 0) {
      throw new Error('Refresh token not found in database');
    }

    const tokenRecord = tokenCheck.rows[0];

    if (tokenRecord.is_revoked) {
      throw new Error('Refresh token has been revoked');
    }

    // Step 4: Get user role for access token generation
    const userQuery = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userQuery.rows.length === 0) {
      throw new Error('User not found');
    }

    const userRole = userQuery.rows[0].role;

    // Step 5: Generate new access token
    const newAccessToken = await generateAccessTokenForUserId(payload.userId, userRole);

    // Step 6: Generate new refresh token (rotation)
    const newRefreshToken = await generateRefreshTokenForUserId(payload.userId);

    // Decode new refresh token to get jti and expiry
    const newRefreshDecoded = jwt.decode(newRefreshToken);
    const newExpiresAt = new Date(newRefreshDecoded.exp * 1000);

    // Step 7: Store new refresh token in database
    await storeRefreshTokenInDatabase(payload.userId, newRefreshDecoded.jti, newExpiresAt);

    // Step 8: Revoke old refresh token (mark as used)
    await revokeRefreshTokenInDatabase(payload.jti);

    // Step 9: Return new tokens
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };

  } catch (error) {
    // jwt.verify throws specific errors - preserve them
    console.error('Error refreshing access token:', error.message);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Revoke refresh token in database (logout)
 *
 * @param {string} tokenJti - JWT ID (jti claim) to revoke
 * @returns {Promise<void>}
 *
 * Security notes:
 * - Marks token as revoked without deleting (audit trail)
 * - Gracefully handles non-existent tokens (no-op)
 * - Used during logout and token rotation
 * - Revoked tokens cannot be used to refresh access tokens
 *
 * Example:
 * await revokeRefreshTokenInDatabase('user123_1234567890_abc123');
 */
export async function revokeRefreshTokenInDatabase(tokenJti) {
  try {
    // Update token to mark as revoked
    // Note: We don't delete - we keep for audit trail
    const result = await pool.query(
      `UPDATE refresh_tokens
       SET is_revoked = TRUE
       WHERE token_hash = $1`,
      [tokenJti]
    );

    // Graceful handling: No error if token doesn't exist
    // This is intentional - logout should succeed even with invalid token
    // (User might be logging out with already-expired/invalid token)

    return; // Success (void return)

  } catch (error) {
    console.error('Error revoking refresh token:', error.message);
    throw error;
  }
}

// ============================================================================
// Phase 7: Password Management (TODO)
// ============================================================================

/**
 * Change user password with old password verification
 *
 * @param {string} userId - User UUID
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password (min 8 chars)
 * @returns {Promise<void>}
 * @throws {Error} - If old password incorrect or validation fails
 */
export async function changeUserPasswordWithVerification(userId, oldPassword, newPassword) {
  // TODO: Phase 7 implementation
  throw new Error('Not implemented yet - Phase 7');
}
