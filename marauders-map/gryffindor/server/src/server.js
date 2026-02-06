// ============================================================================
// Gryffindor Server - Express Backend for The Marauder's Map
// ============================================================================
// "Ship it, we'll fix it in the Room of Requirement"
// Following patterns from: Idiom-React-Frontend-Patterns.md
// Naming convention: 4-word pattern
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDatabaseConnectionStatus } from './db/connectionPoolManager.js';
import authRouteHandler from './routes/authRouteHandler.js';
import incidentsRouteHandler from './routes/incidentsRouteHandler.js';
import {
  initializeSocketServerWithHttpServer,
  startPresenceSessionCleanupScheduler
} from './websocket/socketServer.js';

// Load environment variables
dotenv.config();

// ============================================================================
// Express App Configuration
// ============================================================================

export const app = express();

const PORT = process.env.PORT || 4001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];

// ============================================================================
// Middleware Setup
// ============================================================================

// CORS - Allow frontend to access API
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (Gryffindor style - simple and direct)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'gryffindor-server',
    timestamp: new Date().toISOString(),
    message: 'The Marauder\'s Map is active'
  });
});

// API root
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to The Marauder\'s Map - Gryffindor Wing',
    motto: 'I solemnly swear that I am up to no good',
    version: '3.0.0',
    features: {
      year1: 'Core CRUD Operations',
      year2: 'Authentication & Authorization (JWT)',
      year3: 'Real-Time Features (WebSockets)'
    },
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      incidents: '/api/incidents',
      websocket: 'ws://localhost:' + (process.env.PORT || 4001)
    },
    documentation: '/api/docs'
  });
});

// Mount auth routes (Year 2: Authentication & Authorization)
app.use('/api/auth', authRouteHandler);

// Mount incidents routes
app.use('/api/incidents', incidentsRouteHandler);

// ============================================================================
// Error Handling Middleware
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    suggestion: 'Try /health, /api/auth, or /api/incidents'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============================================================================
// Server Startup
// ============================================================================

export let server;

/**
 * Start the Express server
 * @returns {Promise<void>}
 */
async function startServerWithDatabaseConnection() {
  try {
    // Test database connection first
    console.log('🔍 Testing connection to Gringotts vault...');
    const dbConnected = await testDatabaseConnectionStatus();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start server
    server = app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('🦁  GRYFFINDOR WING - THE MARAUDER\'S MAP v3.0.0');
      console.log('='.repeat(60));
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
      console.log(`📋 Incidents API: http://localhost:${PORT}/api/incidents`);
      console.log('='.repeat(60));
      console.log('"I solemnly swear that I am up to no good."');
      console.log('='.repeat(60));
      console.log('');

      // Initialize Socket.io server (Year 3: Real-time features)
      initializeSocketServerWithHttpServer(server);

      // Start presence session cleanup scheduler
      startPresenceSessionCleanupScheduler();

      console.log('🔌 WebSocket server ready');
      console.log('');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

function shutdownServerGracefullyCleanup() {
  console.log('\n🛑 Shutting down gracefully...');

  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Handle termination signals
process.on('SIGTERM', shutdownServerGracefullyCleanup);
process.on('SIGINT', shutdownServerGracefullyCleanup);

// ============================================================================
// Start Server (only if not in test mode)
// ============================================================================

if (process.env.NODE_ENV !== 'test') {
  startServerWithDatabaseConnection();
}

// ============================================================================
// Export for Testing
// ============================================================================

export default app;
