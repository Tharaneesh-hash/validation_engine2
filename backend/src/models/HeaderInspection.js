const mongoose = require('mongoose');

const HeaderInspectionSchema = new mongoose.Schema({
  rawText: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['manual', 'raw_paste', 'api_test', 'sample_preset'],
    default: 'raw_paste'
  },
  totalCount: {
    type: Number,
    default: 0
  },
  validCount: {
    type: Number,
    default: 0
  },
  invalidCount: {
    type: Number,
    default: 0
  },
  headers: [{
    lineNumber: Number,
    raw: String,
    name: String,
    value: String,
    isValid: Boolean,
    issues: [String],
    suggestions: [String],
    isCookieHeader: Boolean,
    isControlLine: Boolean
  }],
  validHeaders: [{
    lineNumber: Number,
    raw: String,
    name: String,
    value: String
  }],
  invalidHeaders: [{
    lineNumber: Number,
    raw: String,
    name: String,
    value: String,
    issues: [String],
    suggestions: [String]
  }],
  securityReport: {
    findings: [{
      id: String,
      category: String,
      cwe: String,
      title: String,
      target: String,
      lineNumber: Number,
      severity: String,
      evidence: String,
      description: String,
      recommendation: String
    }],
    totalFindings: Number,
    counts: {
      CRITICAL: Number,
      HIGH: Number,
      MEDIUM: Number,
      LOW: Number,
      INFORMATIONAL: Number
    },
    securityScore: Number,
    posture: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

HeaderInspectionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('HeaderInspection', HeaderInspectionSchema);
