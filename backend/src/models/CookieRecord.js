const mongoose = require('mongoose');

const CookieRecordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    default: ''
  },
  rawCookie: {
    type: String
  },
  attributes: {
    expires: { type: String, default: null },
    maxAge: { type: String, default: null },
    domain: { type: String, default: null },
    path: { type: String, default: null },
    secure: { type: Boolean, default: false },
    httpOnly: { type: Boolean, default: false },
    sameSite: { type: String, default: null }
  },
  currentState: {
    type: String,
    enum: ['START', 'ISSUED', 'ACTIVE', 'EXPIRED', 'REVOKED'],
    default: 'ISSUED'
  },
  isValidFormat: {
    type: Boolean,
    default: true
  },
  validationIssues: [{
    type: String
  }],
  securityWarnings: [{
    id: String,
    title: String,
    severity: String,
    description: String,
    recommendation: String
  }],
  history: [{
    fromState: String,
    toState: String,
    action: String,
    success: Boolean,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

CookieRecordSchema.index({ currentState: 1 });
CookieRecordSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CookieRecord', CookieRecordSchema);
