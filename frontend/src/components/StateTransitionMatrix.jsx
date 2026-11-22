import React from 'react';
import { Check, X, ShieldAlert, ArrowRight } from 'lucide-react';

export default function StateTransitionMatrix({ onTestTransition = null }) {
  const states = ['START', 'ISSUED', 'ACTIVE', 'EXPIRED', 'REVOKED'];
  const alphabet = ['CREATE', 'ACTIVATE', 'EXPIRE', 'REVOKE'];

  // Formal transition matrix mappings
  const matrix = {
    START: {
      CREATE: { valid: true, target: 'ISSUED', note: 'Session cookie minted by server' },
      ACTIVATE: { valid: false, reason: 'Cookie must be created before activation' },
      EXPIRE: { valid: false, reason: 'Uninitialized cookie cannot expire' },
      REVOKE: { valid: false, reason: 'Uninitialized cookie cannot be revoked' }
    },
    ISSUED: {
      CREATE: { valid: false, reason: 'Cookie already created in this lifecycle' },
      ACTIVATE: { valid: true, target: 'ACTIVE', note: 'Client presents cookie in valid authenticated request' },
      EXPIRE: { valid: false, reason: 'Issued cookie must become active before expiration' },
      REVOKE: { valid: true, target: 'REVOKED', note: 'Revocation prior to first use' }
    },
    ACTIVE: {
      CREATE: { valid: false, reason: 'Active session cannot be re-created without logout' },
      ACTIVATE: { valid: false, reason: 'Already in ACTIVE operational state' },
      EXPIRE: { valid: true, target: 'EXPIRED', note: 'Max-Age or Expires timestamp elapsed' },
      REVOKE: { valid: true, target: 'REVOKED', note: 'Manual user logout or admin revocation' }
    },
    EXPIRED: {
      CREATE: { valid: false, reason: 'Terminal trap state (∅) - must mint new cookie' },
      ACTIVATE: { valid: false, reason: 'Security Violation: Expired session cannot be resurrected' },
      EXPIRE: { valid: false, reason: 'Already expired (dead state)' },
      REVOKE: { valid: false, reason: 'Already terminated by expiration' }
    },
    REVOKED: {
      CREATE: { valid: false, reason: 'Terminal trap state (∅) - must mint new cookie' },
      ACTIVATE: { valid: false, reason: 'Replay Attack Prevention: Revoked tokens cannot reactivate' },
      EXPIRE: { valid: false, reason: 'Already terminated by revocation' },
      REVOKE: { valid: false, reason: 'Already in permanently revoked state' }
    }
  };

  return (
    <div className="bg-[#0a1122] border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Formal DFA State Transition Table δ(q, σ)</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic state transition function mapping State × Alphabet to Next State or ∅ (Rejection).
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <Check className="w-3.5 h-3.5" /> Accepted Transition
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <X className="w-3.5 h-3.5" /> Rejected Transition (∅)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-[#0e172a] text-slate-300 border-b border-slate-800">
              <th className="p-3 font-semibold text-cyan-400">Current State (q ∈ Q)</th>
              {alphabet.map((symbol) => (
                <th key={symbol} className="p-3 font-semibold text-slate-200 border-l border-slate-800">
                  <span className="text-slate-400 font-normal">Input:</span> {symbol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {states.map((state) => {
              const isTrap = state === 'EXPIRED' || state === 'REVOKED';
              return (
                <tr key={state} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-slate-200 bg-[#0a1122]/80">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        state === 'ACTIVE' ? 'bg-emerald-400' :
                        state === 'ISSUED' ? 'bg-blue-400' :
                        state === 'EXPIRED' ? 'bg-amber-400' :
                        state === 'REVOKED' ? 'bg-rose-400' : 'bg-slate-500'
                      }`} />
                      <span>{state}</span>
                      {isTrap && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">
                          Trap State
                        </span>
                      )}
                    </div>
                  </td>

                  {alphabet.map((action) => {
                    const cell = matrix[state][action];
                    return (
                      <td key={action} className="p-3 border-l border-slate-800/80">
                        {cell.valid ? (
                          <div 
                            onClick={() => onTestTransition && onTestTransition(state, action)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer transition-all"
                            title={cell.note}
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-semibold">{cell.target}</span>
                          </div>
                        ) : (
                          <div 
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-rose-950/30 border border-rose-900/40 text-rose-400/90 text-[11px]"
                            title={cell.reason}
                          >
                            <X className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="text-rose-300 font-semibold">REJECTED</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
