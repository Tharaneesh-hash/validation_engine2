/**
 * Deterministic Finite Automaton (DFA) Engine for Session Cookie State Management
 *
 * Formal 5-Tuple Definition:
 * M = (Q, Σ, δ, q0, F)
 *
 * Q (States): { START, ISSUED, ACTIVE, EXPIRED, REVOKED }
 * Σ (Alphabet / Events): { CREATE, ACTIVATE, EXPIRE, REVOKE }
 * q0 (Initial State): START
 * F (Accepting States): { ISSUED, ACTIVE, EXPIRED, REVOKED }
 * δ (Transition Function): Q × Σ → Q ∪ { REJECTED }
 */

const DFA_STATES = {
  START: 'START',
  ISSUED: 'ISSUED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

const DFA_ALPHABET = {
  CREATE: 'CREATE',
  ACTIVATE: 'ACTIVATE',
  EXPIRE: 'EXPIRE',
  REVOKE: 'REVOKE'
};

// Formal state transition table δ(state, event)
const TRANSITION_TABLE = {
  [DFA_STATES.START]: {
    [DFA_ALPHABET.CREATE]: DFA_STATES.ISSUED
  },
  [DFA_STATES.ISSUED]: {
    [DFA_ALPHABET.ACTIVATE]: DFA_STATES.ACTIVE,
    [DFA_ALPHABET.REVOKE]: DFA_STATES.REVOKED
  },
  [DFA_STATES.ACTIVE]: {
    [DFA_ALPHABET.EXPIRE]: DFA_STATES.EXPIRED,
    [DFA_ALPHABET.REVOKE]: DFA_STATES.REVOKED
  },
  [DFA_STATES.EXPIRED]: {
    // Trap/Terminal state: No outbound transitions
  },
  [DFA_STATES.REVOKED]: {
    // Trap/Terminal state: No outbound transitions
  }
};

// State descriptions & semantics
const STATE_METADATA = {
  [DFA_STATES.START]: {
    label: 'Start (Uninitialized)',
    isAccepting: false,
    isTerminal: false,
    color: '#64748b',
    description: 'Initial pre-creation state. Cookie does not yet exist on client or server.'
  },
  [DFA_STATES.ISSUED]: {
    label: 'Issued',
    isAccepting: true,
    isTerminal: false,
    color: '#3b82f6',
    description: 'Cookie minted by server and transmitted via Set-Cookie header. Awaiting initial activation.'
  },
  [DFA_STATES.ACTIVE]: {
    label: 'Active',
    isAccepting: true,
    isTerminal: false,
    color: '#10b981',
    description: 'Cookie verified and actively maintaining client authenticated session.'
  },
  [DFA_STATES.EXPIRED]: {
    label: 'Expired',
    isAccepting: true,
    isTerminal: true,
    color: '#f59e0b',
    description: 'Validity duration (Expires/Max-Age) has elapsed. Terminal trap state.'
  },
  [DFA_STATES.REVOKED]: {
    label: 'Revoked',
    isAccepting: true,
    isTerminal: true,
    color: '#ef4444',
    description: 'Explicitly invalidated by server logout or security revocation. Terminal trap state.'
  }
};

/**
 * Executes a single DFA state transition δ(currentState, action)
 */
function transition(currentState, action) {
  const normState = String(currentState || '').toUpperCase();
  const normAction = String(action || '').toUpperCase();

  if (!DFA_STATES[normState]) {
    return {
      success: false,
      fromState: normState,
      action: normAction,
      toState: null,
      isAccepted: false,
      error: `Invalid current state "${normState}". Must be one of [${Object.keys(DFA_STATES).join(', ')}]`,
      reason: 'State does not belong to the DFA state set Q.'
    };
  }

  if (!DFA_ALPHABET[normAction]) {
    return {
      success: false,
      fromState: normState,
      action: normAction,
      toState: null,
      isAccepted: false,
      error: `Invalid input symbol "${normAction}". Must be one of [${Object.keys(DFA_ALPHABET).join(', ')}]`,
      reason: 'Action does not belong to the input alphabet Σ.'
    };
  }

  const nextState = TRANSITION_TABLE[normState]?.[normAction];

  if (!nextState) {
    let rejectionReason = `Transition δ(${normState}, ${normAction}) is undefined in the DFA transition table.`;
    if (normState === DFA_STATES.EXPIRED) {
      rejectionReason = 'Security Violation: EXPIRED state is a terminal trap state. Expired cookies cannot be resurrected or transitioned.';
    } else if (normState === DFA_STATES.REVOKED) {
      rejectionReason = 'Security Violation: REVOKED state is a terminal trap state. Revoked cookies are permanently invalidated to prevent replay attacks.';
    } else if (normState === DFA_STATES.ISSUED && normAction === DFA_ALPHABET.EXPIRE) {
      rejectionReason = 'Protocol Violation: An ISSUED cookie must become ACTIVE before it can natural-expire; it can only be activated or revoked.';
    } else if (normState === DFA_STATES.START && normAction !== DFA_ALPHABET.CREATE) {
      rejectionReason = 'Order Violation: A cookie must be created before any other action can occur.';
    }

    return {
      success: false,
      fromState: normState,
      action: normAction,
      toState: normState, // remains in current state
      isAccepted: false,
      error: `Transition Rejected: δ(${normState}, ${normAction}) → REJECTED`,
      reason: rejectionReason
    };
  }

  return {
    success: true,
    fromState: normState,
    action: normAction,
    toState: nextState,
    isAccepted: true,
    error: null,
    reason: `Valid transition δ(${normState}, ${normAction}) → ${nextState}`
  };
}

/**
 * Simulates a sequence of actions on the DFA: δ*(q0, w)
 * @param {Array<string>} actions - List of input symbols
 * @param {string} [initialState='START'] - Starting state
 */
function simulateSequence(actions = [], initialState = DFA_STATES.START) {
  let currentState = initialState;
  const trace = [];
  let isAccepted = true;
  let haltedAt = null;

  for (let i = 0; i < actions.length; i++) {
    const symbol = actions[i];
    const stepResult = transition(currentState, symbol);

    trace.push({
      step: i + 1,
      inputSymbol: symbol,
      fromState: currentState,
      toState: stepResult.success ? stepResult.toState : currentState,
      success: stepResult.success,
      reason: stepResult.reason,
      error: stepResult.error
    });

    if (!stepResult.success) {
      isAccepted = false;
      haltedAt = i;
      break;
    }

    currentState = stepResult.toState;
  }

  const isFinalStateAccepting = Boolean(STATE_METADATA[currentState]?.isAccepting);

  return {
    initialState,
    finalState: currentState,
    isAccepted: isAccepted && isFinalStateAccepting,
    haltedAt,
    trace,
    totalSteps: trace.length,
    acceptingState: isFinalStateAccepting
  };
}

/**
 * Returns full matrix and graph definition for frontend visualization
 */
function getDfaDefinition() {
  const allStates = Object.keys(DFA_STATES);
  const allActions = Object.keys(DFA_ALPHABET);

  const matrix = allStates.map((state) => {
    const row = { state, metadata: STATE_METADATA[state], transitions: {} };
    allActions.forEach((action) => {
      const next = TRANSITION_TABLE[state]?.[action] || null;
      row.transitions[action] = {
        isValid: Boolean(next),
        target: next,
        label: next ? `δ(${state}, ${action}) = ${next}` : `δ(${state}, ${action}) = ∅ (Rejected)`
      };
    });
    return row;
  });

  const graph = {
    nodes: [
      { id: DFA_STATES.START, label: 'START', x: 80, y: 180, isInitial: true, isAccepting: false, isTerminal: false },
      { id: DFA_STATES.ISSUED, label: 'ISSUED', x: 260, y: 180, isInitial: false, isAccepting: true, isTerminal: false },
      { id: DFA_STATES.ACTIVE, label: 'ACTIVE', x: 480, y: 180, isInitial: false, isAccepting: true, isTerminal: false },
      { id: DFA_STATES.EXPIRED, label: 'EXPIRED', x: 700, y: 100, isInitial: false, isAccepting: true, isTerminal: true },
      { id: DFA_STATES.REVOKED, label: 'REVOKED', x: 700, y: 260, isInitial: false, isAccepting: true, isTerminal: true }
    ],
    edges: [
      { from: DFA_STATES.START, to: DFA_STATES.ISSUED, symbol: 'CREATE', curvature: 0 },
      { from: DFA_STATES.ISSUED, to: DFA_STATES.ACTIVE, symbol: 'ACTIVATE', curvature: 0 },
      { from: DFA_STATES.ISSUED, to: DFA_STATES.REVOKED, symbol: 'REVOKE', curvature: 0.3 },
      { from: DFA_STATES.ACTIVE, to: DFA_STATES.EXPIRED, symbol: 'EXPIRE', curvature: -0.2 },
      { from: DFA_STATES.ACTIVE, to: DFA_STATES.REVOKED, symbol: 'REVOKE', curvature: 0.2 }
    ]
  };

  return {
    formalDefinition: {
      tuple: 'M = (Q, Σ, δ, q0, F)',
      Q: allStates,
      Sigma: allActions,
      q0: DFA_STATES.START,
      F: [DFA_STATES.ISSUED, DFA_STATES.ACTIVE, DFA_STATES.EXPIRED, DFA_STATES.REVOKED]
    },
    stateMetadata: STATE_METADATA,
    matrix,
    graph
  };
}

module.exports = {
  DFA_STATES,
  DFA_ALPHABET,
  TRANSITION_TABLE,
  STATE_METADATA,
  transition,
  simulateSequence,
  getDfaDefinition
};
