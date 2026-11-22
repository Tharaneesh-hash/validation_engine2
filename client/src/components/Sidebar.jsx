import React from 'react';
import {
  LayoutDashboard,
  FileCheck2,
  Cookie,
  GitFork,
  ShieldAlert,
  History,
  Settings,
  Terminal,
  Layers,
  ChevronRight
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'System overview & live metrics'
  },
  {
    id: 'headers',
    label: 'HTTP Header Inspector',
    icon: FileCheck2,
    badge: 'Regex',
    description: 'RFC 7230/9110 format inspection'
  },
  {
    id: 'cookies',
    label: 'Cookie Validator',
    icon: Cookie,
    badge: 'RFC 6265',
    description: 'Attributes, tokens & prefix checks'
  },
  {
    id: 'dfa',
    label: 'DFA State Machine',
    icon: GitFork,
    badge: 'Formal',
    description: 'Session cookie finite automata'
  },
  {
    id: 'security',
    label: 'Security Analysis',
    icon: ShieldAlert,
    badge: 'CWE',
    description: 'CRLF injection & risk scoring'
  },
  {
    id: 'history',
    label: 'Validation History',
    icon: History,
    badge: null,
    description: 'MongoDB persistence audit trail'
  },
  {
    id: 'settings',
    label: 'Settings & Deployment',
    icon: Settings,
    badge: 'Atlas',
    description: 'Database connection & REST API docs'
  }
];

export default function Sidebar({ activeTab, onSelectTab }) {
  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#080d1a] flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-800/60">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-2">
          Validation Modules
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800/60 text-slate-400 group-hover:text-slate-200'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold truncate leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border uppercase tracking-wider shrink-0 ${
                  isActive
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800/60 bg-[#060a14]">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-semibold text-[11px] mb-1">
            <Layers className="w-3.5 h-3.5" />
            Theoretical CS Engine
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Deterministic Finite Automata M = (Q, Σ, δ, q₀, F) & RFC 7230/6265 Regex Validators active.
          </p>
        </div>
      </div>
    </aside>
  );
}
