
/**
 * Validation Engine Backend Server
 * Express.js application serving HTTP Header & Cookie Validation REST APIs.
 */

// Load environment variables first
require('dotenv').config();

// Configure DNS before MongoDB connection
const dns = require('dns');

// Enable public DNS only when explicitly configured.
// Use this for local DNS troubleshooting.
if (process.env.USE_PUBLIC_DNS === 'true') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  console.log('[DNS] Using Google and Cloudflare DNS');
}

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

// Import Route Handlers
const headerRoutes = require('./routes/headerRoutes');
const cookieRoutes = require('./routes/cookieRoutes');
const dfaRoutes = require('./routes/dfaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const securityRoutes = require('./routes/securityRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware Configuration
app.disable('x-powered-by');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ]
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({
  extended: true,
  limit: '2mb'
}));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[API] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`
      );
    }
  });

  next();
});

// Root API Discovery Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    platform: 'HTTP Header and Cookie Validation Platform',
    version: '1.0.0',
    description:
      'Web Form Input Validation Engine Using Regular Expressions and DFA',
    modules: {
      headers: '/api/headers',
      cookies: '/api/cookies',
      dfa: '/api/dfa',
      security: '/api/security',
      dashboard: '/api/dashboard',
      health: '/api/health',
      dbStatus: '/api/db/status'
    },
    documentation: 'https://github.com/validation-engine/docs'
  });
});

// Register API Routes
app.use('/api/headers', headerRoutes);
app.use('/api/cookies', cookieRoutes);
app.use('/api/dfa', dfaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/security', securityRoutes);
app.use('/api', healthRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Initialize Database & Start Server
async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('=======================================================');
      console.log(' HTTP Header and Cookie Validation Engine Started');
      console.log(` Server Port:     ${PORT}`);
      console.log(` Health Check:    http://localhost:${PORT}/api/health`);
      console.log(` API Endpoints:   http://localhost:${PORT}/api/headers/validate`);
      console.log('=======================================================');
    });

    return server;

  } catch (error) {
    console.error('[Server Startup Error]:', error);
    throw error;
  }
}

// Start application
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('[Fatal] Application startup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { app, startServer };
