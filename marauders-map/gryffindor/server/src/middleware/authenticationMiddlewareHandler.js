// ============================================================================
// Authentication Middleware Handler
// ============================================================================
// Year 1: Mock authentication (always allow)
// Year 2: Implement real JWT authentication
// Following pattern: 4-word naming convention
// ============================================================================

/**
 * Mock authentication middleware
 * In Year 1, we accept any request with an Authorization header
 * In Year 2, this will validate JWT tokens
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function authenticateRequestWithJwtToken(req, res, next) {
  // Check for Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Authorization header required',
      message: 'Please provide an Authorization header'
    });
  }

  // For Year 1: Accept any token
  // Extract token (format: "Bearer <token>")
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Invalid authorization format',
      message: 'Expected format: Bearer <token>'
    });
  }

  // Year 1: Mock user (Harry Potter from seed data)
  // In Year 2, we'll decode the JWT and get real user data
  req.user = {
    // This UUID matches Harry Potter from init.sql seed data
    // We'll query the database to get the actual UUID in a moment
    id: null, // Will be set by looking up Harry Potter
    email: 'harry.potter@hogwarts.edu',
    role: 'AUROR'
  };

  // TODO Year 2: Replace with real JWT validation
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // req.user = decoded;

  next();
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
