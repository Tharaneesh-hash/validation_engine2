const mongoose = require('mongoose');

const DfaTransitionLogSchema = new mongoose.Schema({
  cookieId: {
    type: String,
    required: true,
    index: true
  },
  cookieName: {
    type: String,
    required: true
  },
  fromState: {
    type: String,
    required: true
  },
  toState: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  success: {
    type: Boolean,
    required: true
  },
  reason: {
    type: String
  },
  error: {
    type: String
  },
  triggeredBy: {
    type: String,
    default: 'user_action'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('DfaTransitionLog', DfaTransitionLogSchema);
