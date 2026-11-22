import React, { useState, useEffect } from 'react';
import {
  GitFork,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  Shield,
  Trash2,
  RefreshCw,
  Info
} from 'lucide-react';
import api from '../services/api';
import DfaVisualizer from '../components/DfaVisualizer';
import StateTransitionMatrix from '../components/StateTransitionMatrix';

export default function DfaStateMachine({ targetCookie = null }) {
  const [cookies, setCookies] = useState([]);
  const [selectedCookieId, setSelectedCookieId] = useState(targetCookie?._id || null);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Simulation State
  const [simSequence, setSimSequence] = useState('CREATE, ACTIVATE, EXPIRE');
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Load cookies and audit logs
  const loadData = async () => {
    try {
      setLoading(true);
      const [cookiesRes, logsRes] = await Promise.all([
        api.getCookies(),
        api.getDfaLogs(20)
      ]);

      if (cookiesRes.success) {
        setCookies(cookiesRes.data);
        if (!selectedCookieId && cookiesRes.data.length > 0) {
          setSelectedCookieId(cookiesRes.data[0]._id);
        }
      }
      if (logsRes.success) {
        setAuditLogs(logsRes.data);
      }
    } catch (err) {
      console.error('Failed to load DFA data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (targetCookie?._id) {
      setSelectedCookieId(targetCookie._id);
    }
  }, [targetCookie]);

  const activeCookie = cookies.find((c) => c._id === selectedCookieId) || null;

  // Execute transition
  const handleTriggerAction = async (action) => {
    if (!activeCookie) return;

    try {
      setTransitioning(true);
      setLastFeedback(null);

      const res = await api.transitionCookie(activeCookie._id, action, 'dfa_controller');

      setLastFeedback({
        action,
        fromState: activeCookie.currentState,
        toState: res.data?.currentState,
        isAccepted: true,
        reason: res.message || res.transition?.reason
      });

      // Reload
      await loadData();
    } catch (err) {
      // Transition was rejected by the DFA!
      const errData = err.data;
      setLastFeedback({
        action,
        fromState: activeCookie.currentState,
        toState: activeCookie.currentState,
        isAccepted: false,
        error: errData?.error || err.message,
        reason: errData?.reason || 'Undefined transition in DFA transition table'
      });
      await loadData();
    } finally {
      setTransitioning(false);
    }
  };

  // Run Custom Sequence Simulation
  const handleSimulate = async () => {
    const symbols = simSequence
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    if (symbols.length === 0) return;

    try {
      setSimulating(true);
      const res = await api.simulateDfa(symbols);
      if (res.success) {
        setSimResult(res.data);
      }
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitFork className="w-5 h-5 text-cyan-400" />
            Deterministic Finite Automaton (DFA) State Machine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal State Machine M = (Q, Σ, δ, q₀, F) governing session cookie lifecycle security and preventing session replay.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1527] hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh State
        </button>
      </div>

      {/* Visual State Diagram */}
      <DfaVisualizer
        currentState={activeCookie?.currentState || null}
        activeTransition={lastFeedback ? { from: lastFeedback.fromState, action: lastFeedback.action } : null}
      />

      {/* State Transition Matrix Table */}
      <StateTransitionMatrix
        onTestTransition={(fromState, action) => {
          // If we have an active cookie in that state, trigger it
          if (activeCookie && activeCookie.currentState === fromState) {
            handleTriggerAction(action);
          } else {
            alert(`Selected cookie is currently in state "${activeCookie?.currentState || 'NONE'}". To test δ(${fromState}, ${action}), select or create a cookie in state "${fromState}".`);
          }
        }}
      />

      {/* Interactive Cookie State Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Cookies Selection List */}
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Tracked Cookies in MongoDB ({cookies.length})
            </h3>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {cookies.length > 0 ? (
              cookies.map((c) => {
                const isSelected = c._id === selectedCookieId;
                return (
                  <div
                    key={c._id}
                    onClick={() => {
                      setSelectedCookieId(c._id);
                      setLastFeedback(null);
                    }}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                        : 'bg-[#0f172a]/60 border-slate-800/80 hover:bg-[#1e293b]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-200 truncate pr-2">
                        {c.name}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                        c.currentState === 'ACTIVE' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' :
                        c.currentState === 'ISSUED' ? 'bg-blue-950/80 text-blue-300 border-blue-500/40' :
                        c.currentState === 'EXPIRED' ? 'bg-amber-950/80 text-amber-300 border-amber-500/40' :
                        'bg-rose-950/80 text-rose-300 border-rose-500/40'
                      }`}>
                        {c.currentState}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">
                      val: {c.value || '(empty)'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No cookies registered yet. Go to the Cookie Validator page to mint a session cookie!
              </div>
            )}
          </div>
        </div>

        {/* Right: State Transition Stepper & Rejection Inspector */}
        <div className="lg:col-span-2 bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Live DFA Transition Execution Controller
            </h3>
            {activeCookie && (
              <div className="text-xs font-mono">
                <span className="text-slate-400">Target Cookie: </span>
                <span className="text-cyan-400 font-bold">{activeCookie.name}</span>
              </div>
            )}
          </div>

          {activeCookie ? (
            <div className="space-y-4">
              {/* Current State Indicator Box */}
              <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 block">Current DFA State:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-3 h-3 rounded-full ${
                      activeCookie.currentState === 'ACTIVE' ? 'bg-emerald-400 animate-ping' :
                      activeCookie.currentState === 'ISSUED' ? 'bg-blue-400' :
                      activeCookie.currentState === 'EXPIRED' ? 'bg-amber-400' : 'bg-rose-400'
                    }`} />
                    <span className="text-lg font-mono font-bold text-white">
                      {activeCookie.currentState}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {activeCookie.currentState === 'EXPIRED' || activeCookie.currentState === 'REVOKED'
                        ? 'Terminal Trap State (∅)'
                        : 'Operational State'}
                    </span>
                  </div>
                </div>

                {/* Transition Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTriggerAction('ACTIVATE')}
                    disabled={transitioning || activeCookie.currentState !== 'ISSUED'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all flex items-center gap-1.5 ${
                      activeCookie.currentState === 'ISSUED'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    ACTIVATE
                  </button>

                  <button
                    onClick={() => handleTriggerAction('EXPIRE')}
                    disabled={transitioning || activeCookie.currentState !== 'ACTIVE'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all flex items-center gap-1.5 ${
                      activeCookie.currentState === 'ACTIVE'
                        ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    EXPIRE
                  </button>

                  <button
                    onClick={() => handleTriggerAction('REVOKE')}
                    disabled={transitioning || (activeCookie.currentState !== 'ACTIVE' && activeCookie.currentState !== 'ISSUED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all flex items-center gap-1.5 ${
                      activeCookie.currentState === 'ACTIVE' || activeCookie.currentState === 'ISSUED'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                        : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    REVOKE
                  </button>
                </div>
              </div>

              {/* Transition Verdict Banner */}
              {lastFeedback && (
                <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  lastFeedback.isAccepted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-2">
                      {lastFeedback.isAccepted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>
                        {lastFeedback.isAccepted ? 'DFA Transition Accepted' : 'DFA Transition REJECTED'}
                      </span>
                    </span>
                    <span className="font-mono text-[11px]">
                      δ({lastFeedback.fromState}, {lastFeedback.action}) → {lastFeedback.isAccepted ? lastFeedback.toState : '∅'}
                    </span>
                  </div>

                  <div className="text-[11px] leading-relaxed text-slate-200">
                    {lastFeedback.reason}
                  </div>

                  {!lastFeedback.isAccepted && (
                    <div className="text-[10px] font-mono text-rose-400 pt-1">
                      Theoretical Rule: Invalid input symbols in current state map to the empty state (∅). The cookie remains in state "{lastFeedback.fromState}".
                    </div>
                  )}
                </div>
              )}

              {/* Cookie Lifecycle History */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Transition Audit History for this Cookie:
                </span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {activeCookie.history && activeCookie.history.length > 0 ? (
                    activeCookie.history.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#080d19] border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">#{idx + 1}</span>
                          <span className="text-cyan-400">{step.fromState}</span>
                          <span>→</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                            {step.action}
                          </span>
                          <span>→</span>
                          <span className="text-emerald-400 font-bold">{step.toState}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(step.timestamp || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">No historical steps recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Select a cookie from the left panel to control its state.
            </div>
          )}
        </div>
      </div>

      {/* DFA Sequence Simulator */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Theoretical DFA Sequence Simulator: δ*(q₀, w)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test any sequence of input symbols w = [a₁, a₂, ... aₙ] from alphabet Σ to verify if the DFA reaches an accepting state or rejects the string.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={simSequence}
            onChange={(e) => setSimSequence(e.target.value)}
            placeholder="e.g. CREATE, ACTIVATE, EXPIRE"
            className="flex-1 bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
          />
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            {simulating ? 'Simulating...' : 'Simulate Sequence'}
          </button>
        </div>

        {/* Quick simulation presets */}
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <span className="text-slate-500 self-center text-[11px]">Presets:</span>
          {[
            { label: 'Normal: CREATE, ACTIVATE, EXPIRE', seq: 'CREATE, ACTIVATE, EXPIRE' },
            { label: 'Early Logout: CREATE, ACTIVATE, REVOKE', seq: 'CREATE, ACTIVATE, REVOKE' },
            { label: 'Unused Revoke: CREATE, REVOKE', seq: 'CREATE, REVOKE' },
            { label: 'Illegal Reactivate: CREATE, ACTIVATE, EXPIRE, ACTIVATE', seq: 'CREATE, ACTIVATE, EXPIRE, ACTIVATE' },
            { label: 'Skip Activation: CREATE, EXPIRE', seq: 'CREATE, EXPIRE' }
          ].map((preset, i) => (
            <button
              key={i}
              onClick={() => {
                setSimSequence(preset.seq);
                setSimResult(null);
              }}
              className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Simulation Output Trace */}
        {simResult && (
          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                {simResult.isAccepted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>Final Result: {simResult.isAccepted ? 'LANGUAGE ACCEPTED' : 'STRING REJECTED'}</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                Final State: <strong className="text-white">{simResult.finalState}</strong>
              </span>
            </div>

            {/* Trace Steps */}
            <div className="space-y-1.5">
              {simResult.trace.map((step) => (
                <div
                  key={step.step}
                  className={`p-2.5 rounded text-xs font-mono flex items-center justify-between ${
                    step.success
                      ? 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-950/20 border border-rose-500/20 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Step {step.step}:</span>
                    <span>δ({step.fromState}, {step.inputSymbol}) → {step.toState}</span>
                  </div>
                  <span className="text-[11px] font-sans text-slate-400">
                    {step.reason || step.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
