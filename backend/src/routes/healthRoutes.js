const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getDbStatus, connectDB } = require('../config/db');
const DataStore = require('../models/dataStore');

const serverStartTime = Date.now();

/**
 * GET /api/health
 * Production health check endpoint
 */
router.get('/health', (req, res) => {
  const dbStatus = getDbStatus();
  const memory = process.memoryUsage();

  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    memoryUsageMB: {
      rss: Math.round(memory.rss / (1024 * 1024)),
      heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
      heapUsed: Math.round(memory.heapUsed / (1024 * 1024))
    },
    database: {
      status: dbStatus.status,
      connectionType: dbStatus.connectionType,
      isAtlas: dbStatus.isAtlas,
      pingLatencyMs: dbStatus.pingLatencyMs
    }
  });
});

/**
 * GET /api/db/status
 * Returns genuine database status and diagnostics
 */
router.get('/db/status', async (req, res) => {
  try {
    const dbStatus = getDbStatus();

    let collections = [];
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const collList = await mongoose.connection.db.listCollections().toArray();
      collections = collList.map((c) => c.name);
    }

    const counts = {
      headerInspections: await DataStore.countHeaderInspections(),
      cookieRecords: (await DataStore.countCookies()).total,
      transitionLogs: (await DataStore.getTransitionLogs(null, 1000)).length
    };

    return res.status(200).json({
      success: true,
      data: {
        ...dbStatus,
        collections,
        counts
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/db/configure
 * Dynamically updates the MongoDB URI and reconnects
 */
router.post('/db/configure', async (req, res) => {
  try {
    const { uri } = req.body;

    if (!uri || typeof uri !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MongoDB connection uri string is required.'
      });
    }

    const result = await connectDB(uri);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Successfully reconnected to MongoDB cluster.',
        data: result.state
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Failed to connect with provided MongoDB URI.',
        error: result.error,
        data: result.state
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
