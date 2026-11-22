import React from 'react';
import { Shield, Check, Lock, XCircle, ArrowRight } from 'lucide-react';

export default function DfaVisualizer({
  currentState = null,
  activeTransition = null,
  onSelectState = null,
  selectedState = null
}) {
  // Formal DFA Node Coordinates in SVG Viewport (820 x 360)
  const nodes = [
    {
      id: 'START',
      label: 'START',
      sublabel: 'Initial State',
      x: 90,
      y: 180,
      radius: 36,
      isInitial: true,
      isAccepting: false,
      isTerminal: false,
      color: '#64748b',
      borderClass: 'stroke-slate-500'
    },
    {
      id: 'ISSUED',
      label: 'ISSUED',
      sublabel: 'Cookie Created',
      x: 270,
      y: 180,
      radius: 40,
      isInitial: false,
      isAccepting: true,
      isTerminal: false,
      color: '#3b82f6',
      borderClass: 'stroke-blue-500'
    },
    {
      id: 'ACTIVE',
      label: 'ACTIVE',
      sublabel: 'Session Valid',
      x: 480,
      y: 180,
      radius: 40,
      isInitial: false,
      isAccepting: true,
      isTerminal: false,
      color: '#10b981',
      borderClass: 'stroke-emerald-500'
    },
    {
      id: 'EXPIRED',
      label: 'EXPIRED',
      sublabel: 'Trap / Dead State',
      x: 710,
      y: 90,
      radius: 40,
      isInitial: false,
      isAccepting: true,
      isTerminal: true,
      color: '#f59e0b',
      borderClass: 'stroke-amber-500'
    },
    {
      id: 'REVOKED',
      label: 'REVOKED',
      sublabel: 'Trap / Invalidation',
      x: 710,
      y: 270,
      radius: 40,
      isInitial: false,
      isAccepting: true,
      isTerminal: true,
      color: '#ef4444',
      borderClass: 'stroke-rose-500'
    }
  ];

  // Defined Transition Edges δ(u, a) = v
  const edges = [
    {
      id: 'START-CREATE-ISSUED',
      from: 'START',
      to: 'ISSUED',
      symbol: 'CREATE',
      path: 'M 126 180 L 230 180',
      labelX: 178,
      labelY: 162
    },
    {
      id: 'ISSUED-ACTIVATE-ACTIVE',
      from: 'ISSUED',
      to: 'ACTIVE',
      symbol: 'ACTIVATE',
      path: 'M 310 180 L 440 180',
      labelX: 375,
      labelY: 162
    },
    {
      id: 'ACTIVE-EXPIRE-EXPIRED',
      from: 'ACTIVE',
      to: 'EXPIRED',
      symbol: 'EXPIRE',
      path: 'M 515 155 Q 585 105 670 95',
      labelX: 585,
      labelY: 105
    },
    {
      id: 'ACTIVE-REVOKE-REVOKED',
      from: 'ACTIVE',
      to: 'REVOKED',
      symbol: 'REVOKE',
      path: 'M 515 205 Q 585 255 670 265',
      labelX: 585,
      labelY: 260
    },
    {
      id: 'ISSUED-REVOKE-REVOKED',
      from: 'ISSUED',
      to: 'REVOKED',
      symbol: 'REVOKE',
      path: 'M 285 220 C 340 330, 560 340, 670 285',
      labelX: 470,
      labelY: 330
    }
  ];

  return (
    <div className="w-full bg-[#0a1122] border border-slate-800 rounded-xl p-5 relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              M = (Q, Σ, δ, q₀, F)
            </span>
            <h4 className="text-sm font-semibold text-slate-200">Session Cookie DFA State Transition Diagram</h4>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Formal 5-tuple Deterministic Finite Automaton with terminal trap states (EXPIRED, REVOKED).
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-slate-400" />
            <span>Normal State</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 p-[1px]">
              <div className="w-full h-full rounded-full border border-emerald-400" />
            </div>
            <span>Accepting (F)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span>Trap State (∅)</span>
          </div>
          {currentState && (
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Current: {currentState}</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Diagram Canvas */}
      <div className="w-full overflow-x-auto relative z-10">
        <svg
          viewBox="0 0 820 360"
          className="w-full h-auto min-w-[700px] select-none"
        >
          <defs>
            {/* Arrowhead marker for transitions */}
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
            </marker>

            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
            </marker>

            <marker
              id="arrowhead-start"
              markerWidth="7"
              markerHeight="5"
              refX="6"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 7 2.5, 0 5" fill="#94a3b8" />
            </marker>

            {/* Glowing filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Initial State Inbound Arrow (from void into START) */}
          <g>
            <line
              x1="25"
              y1="180"
              x2="52"
              y2="180"
              stroke="#94a3b8"
              strokeWidth="2.5"
              markerEnd="url(#arrowhead-start)"
            />
            <text x="28" y="172" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              START
            </text>
          </g>

          {/* Transition Edges */}
          {edges.map((edge) => {
            const isEdgeActive = activeTransition &&
              activeTransition.from === edge.from &&
              activeTransition.action === edge.symbol;

            return (
              <g key={edge.id} className="transition-all duration-300">
                {/* Background path for easy hover */}
                <path
                  d={edge.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                  className="cursor-pointer"
                />

                {/* Visible transition arc */}
                <path
                  d={edge.path}
                  fill="none"
                  stroke={isEdgeActive ? '#10b981' : '#0891b2'}
                  strokeWidth={isEdgeActive ? '3.5' : '2'}
                  strokeDasharray={isEdgeActive ? '6 3' : 'none'}
                  className={isEdgeActive ? 'animate-dash' : ''}
                  markerEnd={isEdgeActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                />

                {/* Symbol Label Pill */}
                <g transform={`translate(${edge.labelX}, ${edge.labelY})`}>
                  <rect
                    x="-32"
                    y="-11"
                    width="64"
                    height="20"
                    rx="10"
                    fill="#090f1d"
                    stroke={isEdgeActive ? '#10b981' : '#1e293b'}
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={isEdgeActive ? '#34d399' : '#06b6d4'}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {edge.symbol}
                  </text>
                </g>
              </g>
            );
          })}

          {/* DFA State Nodes */}
          {nodes.map((node) => {
            const isCurrent = currentState === node.id;
            const isSelected = selectedState === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onSelectState && onSelectState(node.id)}
                className="cursor-pointer group"
              >
                {/* Active State Glow Aura */}
                {isCurrent && (
                  <circle
                    r={node.radius + 10}
                    fill={node.color}
                    opacity="0.25"
                    className="animate-pulse"
                    filter="url(#glow)"
                  />
                )}

                {/* Outer Circle (for accepting states: double circle) */}
                {node.isAccepting && (
                  <circle
                    r={node.radius + 6}
                    fill="none"
                    stroke={isCurrent ? '#38bdf8' : isSelected ? '#a855f7' : node.color}
                    strokeWidth={isCurrent ? '2.5' : '1.5'}
                    strokeOpacity={isCurrent ? '1' : '0.6'}
                  />
                )}

                {/* Main Node Body */}
                <circle
                  r={node.radius}
                  fill="#0c1427"
                  stroke={isCurrent ? '#38bdf8' : isSelected ? '#c084fc' : node.color}
                  strokeWidth={isCurrent ? '3' : '2'}
                  className="transition-all duration-200 group-hover:brightness-125"
                />

                {/* Terminal Trap State Inner Indicator */}
                {node.isTerminal && (
                  <circle
                    r={node.radius - 8}
                    fill="none"
                    stroke={node.color}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.5"
                  />
                )}

                {/* State Label */}
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.label}
                </text>

                {/* Status Sublabel / Type */}
                <text
                  x="0"
                  y="12"
                  textAnchor="middle"
                  fill={isCurrent ? '#38bdf8' : '#94a3b8'}
                  fontSize="8"
                  fontFamily="sans-serif"
                >
                  {node.isTerminal ? 'TRAP (∅)' : node.isAccepting ? 'F (Accept)' : 'Start (q₀)'}
                </text>

                {/* Current State Pin Marker */}
                {isCurrent && (
                  <g transform="translate(0, -48)">
                    <rect
                      x="-28"
                      y="-10"
                      width="56"
                      height="18"
                      rx="9"
                      fill="#0369a1"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      ACTIVE
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Rejection / Acceptance Rules Summary Footnote */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-mono font-semibold">δ Accepted:</span>
          <span>START→CREATE→ISSUED→ACTIVATE→ACTIVE→{'{EXPIRE, REVOKE}'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-rose-400 font-mono font-semibold">δ Rejected:</span>
          <span>EXPIRED→* (Trap), REVOKED→* (Replay Prevention), ISSUED→EXPIRE</span>
        </div>
      </div>
    </div>
  );
}
