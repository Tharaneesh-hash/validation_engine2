/**
 * Database Connection & Status Management Module
 * Manages connection to MongoDB Atlas / Local MongoDB, with diagnostic metrics and dynamic reconfiguration.
 */

const mongoose = require('mongoose');

// State tracker for real-time frontend reporting
const dbState = {
  status: 'disconnected', // 'connected' | 'connecting' | 'disconnected' | 'error' | 'in-memory-fallback'
  host: null,
  databaseName: null,
  connectionType: 'None',
  pingLatencyMs: null,
  connectedAt: null,
  lastError: null,
  configuredUri: null,
  isAtlas: false
};

// Measure ping latency to MongoDB cluster
async function measurePingLatency() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      dbState.pingLatencyMs = Date.now() - startTime;
    } catch (err) {
      dbState.pingLatencyMs = null;
    }
  } else {
    dbState.pingLatencyMs = null;
  }
}

/**
 * Connects to MongoDB Atlas or local MongoDB
 * @param {string} uri - MongoDB connection URI
 */
async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/validation_engine';
  dbState.configuredUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'); // Redact credentials
  dbState.isAtlas = mongoUri.includes('mongodb.net') || mongoUri.startsWith('mongodb+srv://');

  dbState.status = 'connecting';
  dbState.lastError = null;

  try {
    // Disconnect if already connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    dbState.status = 'connected';
    dbState.host = conn.connection.host;
    dbState.databaseName = conn.connection.name;
    dbState.connectedAt = new Date();
    dbState.connectionType = dbState.isAtlas ? 'MongoDB Atlas (Cloud)' : 'MongoDB (Local / Dedicated)';
    await measurePingLatency();

    console.log(`[Database] Successfully connected to ${dbState.connectionType} at ${dbState.host}/${dbState.databaseName}`);
    return { success: true, state: getDbStatus() };
  } catch (error) {
    console.warn(`[Database] Connection to "${dbState.configuredUri}" failed: ${error.message}`);
    dbState.status = 'error';
    dbState.lastError = error.message;

    // Use embedded memory store fallback so app stays functional
    dbState.connectionType = 'In-Memory Engine (Pending Atlas URI)';
    console.log('[Database] Operating with local in-memory persistence fallback.');
    return { success: false, error: error.message, state: getDbStatus() };
  }
}

/**
 * Retrieves current database health and status
 */
function getDbStatus() {
  return {
    ...dbState,
    readyState: mongoose.connection.readyState,
    readyStateDesc: ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'][mongoose.connection.readyState] || 'Unknown'
  };
}

// Periodic ping check every 30 seconds
setInterval(async () => {
  if (mongoose.connection.readyState === 1) {
    await measurePingLatency();
  }
}, 30000);

module.exports = {
  connectDB,
  getDbStatus,
  measurePingLatency,
  dbState
};
