import React from 'react';
import { Shield, Activity, Cpu, Settings, ExternalLink, Terminal } from 'lucide-react';
import DatabaseStatusIndicator from './DatabaseStatusIndicator';

export default function Navbar({ onOpenSettings, activeTab, onSelectTab }) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#090f1e]/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
              HTTP Header & Cookie Validation Platform
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Formal Regex RFC Inspection & DFA State Machine Engine
          </p>
        </div>
      </div>

      {/* Right Controls & Database Indicator */}
      <div className="flex items-center gap-4">
        {/* Genuine Database Status Pill */}
        <DatabaseStatusIndicator onOpenSettings={onOpenSettings} />

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
              : 'border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Settings & Config</span>
        </button>
      </div>
    </header>
  );
}
