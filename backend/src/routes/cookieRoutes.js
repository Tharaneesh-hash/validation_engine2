const express = require('express');
const router = express.Router();
const {
  validateCookieName,
  validateCookieValue,
  validateCookieAttributes
} = require('../engine/regexValidator');
const { parseSetCookieString } = require('../engine/headerParser');
const { transition, DFA_STATES, DFA_ALPHABET } = require('../engine/dfaStateMachine');
const { analyzeSecurity } = require('../engine/securityAnalyzer');
const DataStore = require('../models/dataStore');

/**
 * Validates a cookie payload using Regex engine
 */
function runCookieValidation(name, value, attributes = {}) {
  const nameVal = validateCookieName(name);
  const valueVal = validateCookieValue(value);
  const attrVal = validateCookieAttributes(attributes, name);

  const issues = [];
  const suggestions = [];

  if (!nameVal.isValid) {
    issues.push(`Cookie name error: ${nameVal.error}`);
    if (nameVal.suggestion) suggestions.push(nameVal.suggestion);
  }

  if (!valueVal.isValid) {
    issues.push(`Cookie value error: ${valueVal.error}`);
    if (valueVal.suggestion) suggestions.push(valueVal.suggestion);
  }

  if (!attrVal.isValid) {
    issues.push(...attrVal.issues);
  }

  if (attrVal.attributes.prefixCheck && !attrVal.attributes.prefixCheck.isValid) {
    issues.push(...attrVal.attributes.prefixCheck.violations);
  }

  const isValid = nameVal.isValid && valueVal.isValid && attrVal.isValid;

  return {
    isValid,
    nameValidation: nameVal,
    valueValidation: valueVal,
    attributesValidation: attrVal.attributes,
    issues,
    suggestions
  };
}

/**
 * POST /api/cookies/validate
 * Validates cookie name, value, attributes, and prefixes using Regex.
 */
router.post('/validate', (req, res) => {
  try {
    let { rawCookie, name, value, attributes } = req.body;

    // If raw Set-Cookie string is provided, parse it first
    if (rawCookie && (!name || typeof attributes !== 'object')) {
      const parsed = parseSetCookieString(rawCookie);
      if (parsed) {
        name = parsed.name;
        value = parsed.value;
        attributes = parsed.attributes;
      }
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Cookie name or rawCookie string is required.'
      });
    }

    const validation = runCookieValidation(name, value, attributes || {});
    const secReport = analyzeSecurity([], [{
      name,
      value,
      rawCookie: rawCookie || `${name}=${value || ''}`,
      attributes: attributes || {}
    }]);

    return res.status(200).json({
      success: true,
      data: {
        cookie: {
          name,
          value,
          attributes: attributes || {},
          rawCookie: rawCookie || `${name}=${value || ''}`
        },
        validation,
        securityReport: secReport
      }
    });
  } catch (err) {
    console.error('Error in /api/cookies/validate:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cookies/create
 * Creates a new cookie and executes initial DFA transition START -> CREATE -> ISSUED
 */
router.post('/create', async (req, res) => {
  try {
    let { rawCookie, name, value, attributes, initialAction = 'CREATE' } = req.body;

    if (rawCookie && (!name || typeof attributes !== 'object')) {
      const parsed = parseSetCookieString(rawCookie);
      if (parsed) {
        name = parsed.name;
        value = parsed.value;
        attributes = parsed.attributes;
      }
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Cookie name is required.'
      });
    }

    // 1. Run Regex Validation
    const validation = runCookieValidation(name, value, attributes || {});

    // 2. Run Security Scan
    const secReport = analyzeSecurity([], [{
      name,
      value,
      rawCookie: rawCookie || `${name}=${value || ''}`,
      attributes: attributes || {}
    }]);

    // 3. Run DFA Transition: START + CREATE -> ISSUED
    const dfaResult = transition(DFA_STATES.START, initialAction);

    if (!dfaResult.success) {
      return res.status(400).json({
        success: false,
        error: 'DFA Creation Rejected',
        dfaResult
      });
    }

    const now = new Date();
    const historyItem = {
      fromState: DFA_STATES.START,
      toState: dfaResult.toState,
      action: initialAction,
      success: true,
      reason: dfaResult.reason,
      timestamp: now
    };

    // 4. Save to MongoDB
    const cookieRecord = await DataStore.createCookie({
      name,
      value: value || '',
      rawCookie: rawCookie || `${name}=${value || ''}`,
      attributes: attributes || {},
      currentState: dfaResult.toState,
      isValidFormat: validation.isValid,
      validationIssues: validation.issues,
      securityWarnings: secReport.findings,
      history: [historyItem]
    });

    // 5. Log DFA transition in transition collection
    await DataStore.logTransition({
      cookieId: cookieRecord._id.toString(),
      cookieName: name,
      fromState: DFA_STATES.START,
      toState: dfaResult.toState,
      action: initialAction,
      success: true,
      reason: dfaResult.reason,
      triggeredBy: 'cookie_creation'
    });

    return res.status(201).json({
      success: true,
      message: `Cookie created in state "${dfaResult.toState}" via DFA transition.`,
      data: cookieRecord,
      dfaResult
    });
  } catch (err) {
    console.error('Error in /api/cookies/create:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/cookies/:id/transition
 * Executes a DFA state transition for an existing cookie:
 * e.g., ISSUED -> ACTIVATE -> ACTIVE
 *       ACTIVE -> EXPIRE -> EXPIRED
 *       ACTIVE -> REVOKE -> REVOKED
 *       ISSUED -> REVOKE -> REVOKED
 */
router.put('/:id/transition', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Transition action is required. Options: [ACTIVATE, EXPIRE, REVOKE]'
      });
    }

    const cookie = await DataStore.getCookieById(id);
    if (!cookie) {
      return res.status(404).json({
        success: false,
        error: 'Cookie not found.'
      });
    }

    const fromState = cookie.currentState;
    const dfaResult = transition(fromState, action);

    // Record transition attempt in DFA transition logs regardless of outcome
    await DataStore.logTransition({
      cookieId: id.toString(),
      cookieName: cookie.name,
      fromState,
      toState: dfaResult.toState || fromState,
      action: action.toUpperCase(),
      success: dfaResult.success,
      reason: dfaResult.reason,
      error: dfaResult.error,
      triggeredBy: req.body.triggeredBy || 'dashboard_user'
    });

    if (!dfaResult.success) {
      // Transition rejected by DFA!
      return res.status(422).json({
        success: false,
        isAccepted: false,
        error: dfaResult.error,
        reason: dfaResult.reason,
        currentState: fromState,
        attemptedAction: action,
        message: `DFA Rejected Transition: State remains "${fromState}". ${dfaResult.reason}`
      });
    }

    // Transition accepted! Update cookie state in MongoDB
    const historyEntry = {
      fromState,
      toState: dfaResult.toState,
      action: action.toUpperCase(),
      success: true,
      reason: dfaResult.reason,
      timestamp: new Date()
    };

    const currentHistory = Array.isArray(cookie.history) ? [...cookie.history] : [];
    currentHistory.push(historyEntry);

    const updatedCookie = await DataStore.updateCookie(id, {
      currentState: dfaResult.toState,
      history: currentHistory
    });

    return res.status(200).json({
      success: true,
      isAccepted: true,
      message: `DFA Transition Accepted: δ(${fromState}, ${action.toUpperCase()}) → ${dfaResult.toState}`,
      data: updatedCookie,
      transition: dfaResult
    });
  } catch (err) {
    console.error('Error in /api/cookies/:id/transition:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/cookies
 * Lists cookies with optional status filter.
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.state) {
      filter.currentState = req.query.state.toUpperCase();
    }

    const cookies = await DataStore.getCookies(filter);
    return res.status(200).json({
      success: true,
      total: cookies.length,
      data: cookies
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/cookies/:id
 * Retrieves a single cookie with its full history.
 */
router.get('/:id', async (req, res) => {
  try {
    const cookie = await DataStore.getCookieById(req.params.id);
    if (!cookie) {
      return res.status(404).json({ success: false, error: 'Cookie not found.' });
    }
    const transitionLogs = await DataStore.getTransitionLogs(req.params.id);
    return res.status(200).json({
      success: true,
      data: cookie,
      transitionLogs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/cookies/:id
 * Deletes a cookie and related transition records.
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await DataStore.deleteCookie(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Cookie not found to delete.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Cookie deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/cookies/:id/transitions
 * Gets transition logs for specific cookie.
 */
router.get('/:id/transitions', async (req, res) => {
  try {
    const logs = await DataStore.getTransitionLogs(req.params.id);
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
