const express = require('express');
const router = express.Router();
const {
  getDfaDefinition,
  simulateSequence,
  transition,
  DFA_STATES,
  DFA_ALPHABET
} = require('../engine/dfaStateMachine');
const DataStore = require('../models/dataStore');

/**
 * GET /api/dfa/definition
 * Returns the formal 5-tuple mathematical definition, state metadata, transition matrix, and graph layout.
 */
router.get('/definition', (req, res) => {
  try {
    const definition = getDfaDefinition();
    return res.status(200).json({
      success: true,
      data: definition
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/dfa/simulate
 * Simulates a sequence of alphabet actions on the DFA: δ*(q0, w)
 */
router.post('/simulate', (req, res) => {
  try {
    const { actions = [], initialState = DFA_STATES.START } = req.body;

    if (!Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        error: 'actions must be an array of input symbols (e.g., ["CREATE", "ACTIVATE", "EXPIRE"])'
      });
    }

    const simulation = simulateSequence(actions, initialState);

    return res.status(200).json({
      success: true,
      data: simulation
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/dfa/logs
 * Returns audit log of all DFA state transitions
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const logs = await DataStore.getTransitionLogs(null, limit);
    return res.status(200).json({
      success: true,
      total: logs.length,
      data: logs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
