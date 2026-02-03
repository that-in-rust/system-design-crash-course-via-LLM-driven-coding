// ============================================================================
// Authentication Middleware Handler
// ============================================================================
// Year 2: Real JWT authentication with token verification
// Following pattern: 4-word naming convention
// ============================================================================

import { verifyAccessTokenAndReturnPayload } from '../services/authenticationService.js';

/**
 * Authentication middleware - verify JWT access tokens
 *
 * Validates JWT tokens and attaches user payload to request object.
 * Replaces Year 1 mock authentication with real JWT verification.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * Security:
 * - Verifies JWT signature
 * - Checks token expiration
 * - Validates token type (should be 'access')
 * - Attaches payload to req.user for downstream use
 */
export async function authenticateRequestWithJwtToken(req, res, next) {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authorization header required',
        message: 'Please provide an Authorization header'
      });
    }

    // Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Expected format: Bearer <token>'
      });
    }

    const token = parts[1];

    // Year 2: Real JWT verification
    const payload = await verifyAccessTokenAndReturnPayload(token);

    // Optional: Verify token type is 'access' (not 'refresh')
    if (payload.type !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type',
        message: 'Access token required, got: ' + payload.type
      });
    }

    // Attach user data to request for downstream middleware/handlers
    req.user = {
      userId: payload.userId,
      role: payload.role,
      // Include token metadata for auditing if needed
      tokenIssuedAt: payload.iat,
      tokenExpiresAt: payload.exp
    };

    next();

  } catch (error) {
    // Handle JWT verification errors
    if (error.message === 'jwt expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }

    if (error.message === 'invalid signature') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token signature verification failed'
      });
    }

    // Generic error for other JWT issues
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or malformed token'
    });
  }
}

/**
 * Authorization middleware - check user role
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export function authorizeUserByRoleLevel(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

// ============================================================================
// Export Middleware Functions
// ============================================================================

export default {
  authenticateRequestWithJwtToken,
  authorizeUserByRoleLevel
};
