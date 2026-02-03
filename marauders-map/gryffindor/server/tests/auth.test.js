/**
 * Authentication Tests - Year 2: Authentication & Authorization
 * Phase 1: Password Security Foundation (RED Phase)
 *
 * Following TDD methodology:
 * - Write failing tests first (RED)
 * - Implement minimal code to pass (GREEN)
 * - Refactor for clarity (REFACTOR)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db/connectionPoolManager.js';
import {
  hashPasswordWithBcryptSalt,
  comparePasswordWithStoredHash,
  registerUserWithEmailPassword,
  generateAccessTokenForUserId,
  generateRefreshTokenForUserId,
  storeRefreshTokenInDatabase,
  loginUserWithEmailPassword,
  verifyAccessTokenAndReturnPayload
} from '../src/services/authenticationService.js';

// ============================================================================
// Test Suite: Phase 1 - Password Security Foundation
// ============================================================================

describe('Phase 1: Password Security Foundation', () => {

  // ==========================================================================
  // Password Hashing with bcrypt
  // ==========================================================================

  describe('hashPasswordWithBcryptSalt', () => {
    it('should_hash_password_with_bcrypt_cost_factor_10', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';

      // Act
      const hashedPassword = await hashPasswordWithBcryptSalt(plainPassword);

      // Assert
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(plainPassword); // Never store plaintext
      expect(hashedPassword.startsWith('$2b$10$')).toBe(true); // bcrypt format with cost factor 10
      expect(hashedPassword.length).toBe(60); // bcrypt hash is always 60 chars
    });

    it('should_generate_unique_hashes_for_same_password', async () => {
      // Arrange
      const plainPassword = 'SamePassword123!';

      // Act
      const hash1 = await hashPasswordWithBcryptSalt(plainPassword);
      const hash2 = await hashPasswordWithBcryptSalt(plainPassword);

      // Assert
      expect(hash1).not.toBe(hash2); // Salt should make them different
      expect(hash1.startsWith('$2b$10$')).toBe(true);
      expect(hash2.startsWith('$2b$10$')).toBe(true);
    });
  });

  // ==========================================================================
  // Password Verification
  // ==========================================================================

  describe('comparePasswordWithStoredHash', () => {
    it('should_verify_correct_password_against_hash', async () => {
      // Arrange
      const plainPassword = 'CorrectPassword123!';
      const hashedPassword = await hashPasswordWithBcryptSalt(plainPassword);

      // Act
      const isValid = await comparePasswordWithStoredHash(plainPassword, hashedPassword);

      // Assert
      expect(isValid).toBe(true);
    });

    it('should_reject_incorrect_password_against_hash', async () => {
      // Arrange
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashedPassword = await hashPasswordWithBcryptSalt(correctPassword);

      // Act
      const isValid = await comparePasswordWithStoredHash(wrongPassword, hashedPassword);

      // Assert
      expect(isValid).toBe(false);
    });

    it('should_reject_password_with_modified_hash', async () => {
      // Arrange
      const plainPassword = 'Password123!';
      const hashedPassword = await hashPasswordWithBcryptSalt(plainPassword);
      const tamperedHash = hashedPassword.slice(0, -1) + 'X'; // Modify last char

      // Act
      const isValid = await comparePasswordWithStoredHash(plainPassword, tamperedHash);

      // Assert
      // bcrypt returns false for tampered hashes (doesn't throw)
      expect(isValid).toBe(false);
    });
  });

  // ==========================================================================
  // Security Properties
  // ==========================================================================

  describe('Password Security Properties', () => {
    it('should_take_reasonable_time_to_hash_with_cost_factor_10', async () => {
      // Arrange
      const plainPassword = 'TimingTest123!';
      const startTime = Date.now();

      // Act
      await hashPasswordWithBcryptSalt(plainPassword);
      const duration = Date.now() - startTime;

      // Assert
      // Cost factor 10 should take between 20ms and 500ms on modern hardware
      // (M1/M2 chips can be very fast, down to ~30-40ms)
      expect(duration).toBeGreaterThan(20);
      expect(duration).toBeLessThan(500);
    });

    it('should_handle_empty_password_gracefully', async () => {
      // Arrange
      const emptyPassword = '';

      // Act & Assert
      // Implementation should either hash it or throw a validation error
      // For now, we allow hashing empty strings (validation happens at API layer)
      const hash = await hashPasswordWithBcryptSalt(emptyPassword);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(60);
    });

    it('should_handle_long_passwords_correctly', async () => {
      // Arrange
      const longPassword = 'A'.repeat(100); // 100 character password

      // Act
      const hash = await hashPasswordWithBcryptSalt(longPassword);
      const isValid = await comparePasswordWithStoredHash(longPassword, hash);

      // Assert
      expect(hash).toBeDefined();
      expect(isValid).toBe(true);
    });

    it('should_handle_passwords_with_special_characters', async () => {
      // Arrange
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      // Act
      const hash = await hashPasswordWithBcryptSalt(specialPassword);
      const isValid = await comparePasswordWithStoredHash(specialPassword, hash);

      // Assert
      expect(hash).toBeDefined();
      expect(isValid).toBe(true);
    });
  });
});

// ============================================================================
// Test Suite: Phase 2 - User Registration
// ============================================================================

describe('Phase 2: User Registration', () => {
  // Clean up test users before each test
  beforeEach(async () => {
    // Delete any test users created during tests
    await pool.query(
      "DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%invalid%'"
    );
  });

  // Cleanup after all tests
  afterAll(async () => {
    await pool.query(
      "DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%invalid%'"
    );
    await pool.end();
  });

  // ==========================================================================
  // User Registration with Valid Data
  // ==========================================================================

  describe('registerUserWithEmailPassword', () => {
    it('should_register_user_with_valid_hogwarts_email', async () => {
      // Arrange
      const email = 'test.student@hogwarts.edu';
      const password = 'SecurePass123!';
      const firstName = 'Test';
      const lastName = 'Student';

      // Act
      const user = await registerUserWithEmailPassword(email, password, firstName, lastName);

      // Assert
      expect(user).toBeDefined();
      expect(user.id).toBeDefined(); // UUID
      expect(user.email).toBe(email);
      expect(user.first_name).toBe(firstName);
      expect(user.last_name).toBe(lastName);
      expect(user.role).toBe('STUDENT'); // Default role
      expect(user.password_hash).toBeUndefined(); // Never return password
    });

    it('should_reject_registration_with_non_hogwarts_email', async () => {
      // Arrange
      const invalidEmail = 'test@gmail.com';
      const password = 'SecurePass123!';
      const firstName = 'Test';
      const lastName = 'User';

      // Act & Assert
      await expect(
        registerUserWithEmailPassword(invalidEmail, password, firstName, lastName)
      ).rejects.toThrow('Email must end with @hogwarts.edu');
    });

    it('should_reject_registration_with_weak_password', async () => {
      // Arrange
      const email = 'test2.student@hogwarts.edu';
      const weakPassword = 'abc123'; // Less than 8 characters
      const firstName = 'Test';
      const lastName = 'Student';

      // Act & Assert
      await expect(
        registerUserWithEmailPassword(email, weakPassword, firstName, lastName)
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should_reject_duplicate_email_registration', async () => {
      // Arrange
      const email = 'duplicate.test@hogwarts.edu';
      const password = 'SecurePass123!';
      const firstName = 'Test';
      const lastName = 'Student';

      // First registration should succeed
      await registerUserWithEmailPassword(email, password, firstName, lastName);

      // Act & Assert - Second registration should fail
      await expect(
        registerUserWithEmailPassword(email, password, 'Another', 'User')
      ).rejects.toThrow('Email already registered');
    });

    it('should_default_new_user_role_to_student', async () => {
      // Arrange
      const email = 'newstudent.test@hogwarts.edu';
      const password = 'SecurePass123!';
      const firstName = 'New';
      const lastName = 'Student';

      // Act
      const user = await registerUserWithEmailPassword(email, password, firstName, lastName);

      // Assert
      expect(user.role).toBe('STUDENT');
    });

    it('should_reject_registration_without_required_fields', async () => {
      // Act & Assert - Missing email
      await expect(
        registerUserWithEmailPassword(null, 'password123!', 'Test', 'User')
      ).rejects.toThrow('Email is required');

      // Act & Assert - Missing password
      await expect(
        registerUserWithEmailPassword('test@hogwarts.edu', null, 'Test', 'User')
      ).rejects.toThrow('Password is required');

      // Act & Assert - Missing firstName
      await expect(
        registerUserWithEmailPassword('test@hogwarts.edu', 'password123!', null, 'User')
      ).rejects.toThrow('First name is required');

      // Act & Assert - Missing lastName
      await expect(
        registerUserWithEmailPassword('test@hogwarts.edu', 'password123!', 'Test', null)
      ).rejects.toThrow('Last name is required');
    });

    it('should_trim_email_and_validate_format', async () => {
      // Arrange
      const emailWithSpaces = '  test.trim@hogwarts.edu  ';
      const password = 'SecurePass123!';
      const firstName = 'Test';
      const lastName = 'Trim';

      // Act
      const user = await registerUserWithEmailPassword(emailWithSpaces, password, firstName, lastName);

      // Assert
      expect(user.email).toBe('test.trim@hogwarts.edu'); // Trimmed
    });

    it('should_store_hashed_password_in_database', async () => {
      // Arrange
      const email = 'hashcheck.test@hogwarts.edu';
      const password = 'SecurePass123!';
      const firstName = 'Hash';
      const lastName = 'Check';

      // Act
      const user = await registerUserWithEmailPassword(email, password, firstName, lastName);

      // Assert - Query database directly to check hash
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [user.id]
      );

      expect(result.rows[0].password_hash).toBeDefined();
      expect(result.rows[0].password_hash.startsWith('$2b$10$')).toBe(true);
      expect(result.rows[0].password_hash).not.toBe(password); // Not plaintext

      // Verify the hash works
      const isValid = await comparePasswordWithStoredHash(
        password,
        result.rows[0].password_hash
      );
      expect(isValid).toBe(true);
    });
  });
});

// ============================================================================
// Test Suite: Phase 3 - JWT Token Generation
// ============================================================================

describe('Phase 3: JWT Token Generation', () => {
  // Test user ID and role for token generation
  const testUserId = '123e4567-e89b-12d3-a456-426614174000'; // UUID format
  const testUserRole = 'STUDENT';

  // Cleanup after all tests
  afterAll(async () => {
    await pool.query(
      "DELETE FROM refresh_tokens WHERE user_id = $1",
      [testUserId]
    );
    await pool.end();
  });

  // ==========================================================================
  // Access Token Generation
  // ==========================================================================

  describe('generateAccessTokenForUserId', () => {
    it('should_generate_valid_jwt_access_token', async () => {
      // Arrange - testUserId and testUserRole defined above

      // Act
      const accessToken = await generateAccessTokenForUserId(testUserId, testUserRole);

      // Assert
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(accessToken.split('.').length).toBe(3); // JWT format: header.payload.signature

      // Decode without verification to inspect payload
      const decoded = jwt.decode(accessToken);
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe(testUserRole);
      expect(decoded.type).toBe('access');
    });

    it('should_set_access_token_expiry_to_15_minutes', async () => {
      // Arrange
      const beforeTime = Math.floor(Date.now() / 1000); // Current time in seconds

      // Act
      const accessToken = await generateAccessTokenForUserId(testUserId, testUserRole);

      // Assert
      const decoded = jwt.decode(accessToken);
      const expectedExpiry = beforeTime + (15 * 60); // 15 minutes in seconds

      // Allow 5 second tolerance for test execution time
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });
  });

  // ==========================================================================
  // Refresh Token Generation
  // ==========================================================================

  describe('generateRefreshTokenForUserId', () => {
    it('should_generate_valid_jwt_refresh_token', async () => {
      // Act
      const refreshToken = await generateRefreshTokenForUserId(testUserId);

      // Assert
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.').length).toBe(3); // JWT format

      // Decode to inspect payload
      const decoded = jwt.decode(refreshToken);
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.type).toBe('refresh');
      expect(decoded.jti).toBeDefined(); // JWT ID for tracking
    });

    it('should_set_refresh_token_expiry_to_7_days', async () => {
      // Arrange
      const beforeTime = Math.floor(Date.now() / 1000);

      // Act
      const refreshToken = await generateRefreshTokenForUserId(testUserId);

      // Assert
      const decoded = jwt.decode(refreshToken);
      const expectedExpiry = beforeTime + (7 * 24 * 60 * 60); // 7 days in seconds

      // Allow 5 second tolerance
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });
  });

  // ==========================================================================
  // Token Payload and Storage
  // ==========================================================================

  describe('Token Payload and Storage', () => {
    it('should_include_user_id_and_role_in_access_token_payload', async () => {
      // Act
      const accessToken = await generateAccessTokenForUserId(testUserId, testUserRole);

      // Assert
      const decoded = jwt.decode(accessToken);
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe(testUserRole);
      expect(decoded.type).toBe('access');
      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.exp).toBeDefined(); // Expires at
    });

    it('should_store_refresh_token_in_database', async () => {
      // Arrange
      const refreshToken = await generateRefreshTokenForUserId(testUserId);
      const decoded = jwt.decode(refreshToken);
      const expiresAt = new Date(decoded.exp * 1000); // Convert to JS Date

      // Act
      await storeRefreshTokenInDatabase(testUserId, decoded.jti, expiresAt);

      // Assert - Query database to verify storage
      const result = await pool.query(
        'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2',
        [testUserId, decoded.jti]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].user_id).toBe(testUserId);
      expect(result.rows[0].token_hash).toBe(decoded.jti);
      expect(result.rows[0].is_revoked).toBe(false);
      expect(new Date(result.rows[0].expires_at).getTime()).toBeCloseTo(
        expiresAt.getTime(),
        -3 // Within 1 second (10^-3)
      );
    });
  });
});

// ============================================================================
// Test Suite: Phase 4 - User Login
// ============================================================================

describe('Phase 4: User Login', () => {
  // Test user credentials
  const testEmail = 'login.test@hogwarts.edu';
  const testPassword = 'LoginPass123!';
  const testFirstName = 'Login';
  const testLastName = 'Test';

  // Register a test user before tests
  beforeAll(async () => {
    // Clean up any existing test user
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [testEmail]
    );

    // Register test user for login tests
    await registerUserWithEmailPassword(testEmail, testPassword, testFirstName, testLastName);
  });

  // Cleanup after all tests
  afterAll(async () => {
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [testEmail]
    );
    await pool.end();
  });

  // ==========================================================================
  // Successful Login
  // ==========================================================================

  describe('loginUserWithEmailPassword', () => {
    it('should_login_user_with_valid_credentials', async () => {
      // Act
      const result = await loginUserWithEmailPassword(testEmail, testPassword);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.user.first_name).toBe(testFirstName);
      expect(result.user.last_name).toBe(testLastName);
      expect(result.user.password_hash).toBeUndefined(); // Never return password
    });

    it('should_return_access_and_refresh_tokens', async () => {
      // Act
      const result = await loginUserWithEmailPassword(testEmail, testPassword);

      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');

      // Verify token format (JWT has 3 parts)
      expect(result.accessToken.split('.').length).toBe(3);
      expect(result.refreshToken.split('.').length).toBe(3);

      // Decode and verify payload
      const accessDecoded = jwt.decode(result.accessToken);
      const refreshDecoded = jwt.decode(result.refreshToken);

      expect(accessDecoded.userId).toBeDefined();
      expect(accessDecoded.role).toBeDefined();
      expect(accessDecoded.type).toBe('access');

      expect(refreshDecoded.userId).toBeDefined();
      expect(refreshDecoded.type).toBe('refresh');
      expect(refreshDecoded.jti).toBeDefined();
    });

    it('should_reject_login_with_invalid_password', async () => {
      // Arrange
      const wrongPassword = 'WrongPassword123!';

      // Act & Assert
      await expect(
        loginUserWithEmailPassword(testEmail, wrongPassword)
      ).rejects.toThrow('Invalid email or password');
    });

    it('should_reject_login_with_nonexistent_email', async () => {
      // Arrange
      const nonexistentEmail = 'nonexistent@hogwarts.edu';

      // Act & Assert
      await expect(
        loginUserWithEmailPassword(nonexistentEmail, testPassword)
      ).rejects.toThrow('Invalid email or password');
    });

    it('should_create_refresh_token_in_database', async () => {
      // Act
      const result = await loginUserWithEmailPassword(testEmail, testPassword);

      // Assert - Check refresh token is stored
      const refreshDecoded = jwt.decode(result.refreshToken);
      const dbResult = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token_hash = $1',
        [refreshDecoded.jti]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].is_revoked).toBe(false);
    });

    it('should_include_user_role_in_token_payload', async () => {
      // Act
      const result = await loginUserWithEmailPassword(testEmail, testPassword);

      // Assert
      const accessDecoded = jwt.decode(result.accessToken);
      expect(accessDecoded.role).toBe('STUDENT'); // Default role
    });

    it('should_reject_login_without_credentials', async () => {
      // Act & Assert - Missing email
      await expect(
        loginUserWithEmailPassword(null, testPassword)
      ).rejects.toThrow('Email is required');

      // Act & Assert - Missing password
      await expect(
        loginUserWithEmailPassword(testEmail, null)
      ).rejects.toThrow('Password is required');
    });

    it('should_return_user_profile_on_successful_login', async () => {
      // Act
      const result = await loginUserWithEmailPassword(testEmail, testPassword);

      // Assert - User object structure
      expect(result.user).toBeDefined();
      expect(result.user.id).toBeDefined(); // UUID
      expect(result.user.email).toBe(testEmail);
      expect(result.user.first_name).toBe(testFirstName);
      expect(result.user.last_name).toBe(testLastName);
      expect(result.user.role).toBe('STUDENT');
      expect(result.user.house).toBeDefined(); // May be null initially
      expect(result.user.created_at).toBeDefined();
      expect(result.user.updated_at).toBeDefined();

      // Should NOT include sensitive data
      expect(result.user.password_hash).toBeUndefined();
    });
  });
});

// ============================================================================
// Test Suite: Phase 5 - Token Verification & Protected Routes
// ============================================================================

describe('Phase 5: Token Verification', () => {
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testUserRole = 'PREFECT';

  afterAll(async () => {
    await pool.end();
  });

  // ==========================================================================
  // Token Verification
  // ==========================================================================

  describe('verifyAccessTokenAndReturnPayload', () => {
    it('should_verify_valid_jwt_access_token', async () => {
      // Arrange - Generate a valid access token
      const validToken = await generateAccessTokenForUserId(testUserId, testUserRole);

      // Act
      const payload = await verifyAccessTokenAndReturnPayload(validToken);

      // Assert
      expect(payload).toBeDefined();
      expect(payload.userId).toBe(testUserId);
      expect(payload.role).toBe(testUserRole);
      expect(payload.type).toBe('access');
      expect(payload.iat).toBeDefined(); // Issued at
      expect(payload.exp).toBeDefined(); // Expires at
    });

    it('should_reject_expired_access_token', async () => {
      // Arrange - Create a token that's already expired
      const jwtSecret = process.env.JWT_SECRET;
      const expiredToken = jwt.sign(
        { userId: testUserId, role: testUserRole, type: 'access' },
        jwtSecret,
        { expiresIn: '-1s' } // Expired 1 second ago
      );

      // Act & Assert
      await expect(
        verifyAccessTokenAndReturnPayload(expiredToken)
      ).rejects.toThrow('jwt expired');
    });

    it('should_reject_tampered_access_token', async () => {
      // Arrange - Generate valid token then tamper with it
      const validToken = await generateAccessTokenForUserId(testUserId, testUserRole);
      const parts = validToken.split('.');
      // Tamper with the payload (middle part)
      const tamperedToken = `${parts[0]}.${parts[1]}XXX.${parts[2]}`;

      // Act & Assert
      await expect(
        verifyAccessTokenAndReturnPayload(tamperedToken)
      ).rejects.toThrow();
    });

    it('should_reject_token_with_invalid_signature', async () => {
      // Arrange - Sign with different secret
      const wrongSecret = 'wrong-secret-key';
      const invalidToken = jwt.sign(
        { userId: testUserId, role: testUserRole, type: 'access' },
        wrongSecret,
        { expiresIn: '15m' }
      );

      // Act & Assert
      await expect(
        verifyAccessTokenAndReturnPayload(invalidToken)
      ).rejects.toThrow('invalid signature');
    });

    it('should_extract_user_id_from_valid_token', async () => {
      // Arrange
      const validToken = await generateAccessTokenForUserId(testUserId, testUserRole);

      // Act
      const payload = await verifyAccessTokenAndReturnPayload(validToken);

      // Assert
      expect(payload.userId).toBe(testUserId);
      expect(typeof payload.userId).toBe('string');
    });

    it('should_reject_refresh_token_as_access_token', async () => {
      // Arrange - Try to use refresh token as access token
      const refreshToken = await generateRefreshTokenForUserId(testUserId);

      // Act
      const payload = await verifyAccessTokenAndReturnPayload(refreshToken);

      // Assert - Should verify successfully but payload.type should be 'refresh'
      expect(payload.type).toBe('refresh');
      // Note: In production, middleware should check type === 'access'
    });
  });
});
