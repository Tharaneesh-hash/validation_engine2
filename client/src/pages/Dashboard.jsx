import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  AlertTriangle,
  Cookie,
  ShieldAlert,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  GitFork
} from 'lucide-react';
import api from '../services/api';
import DfaVisualizer from '../components/DfaVisualizer';
import SecurityBadge from '../components/SecurityBadge';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, activityRes] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentActivity()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (activityRes.success) setActivity(activityRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 20000);
    return () => clearInterval(timer);
  }, []);

  const totalHeaders = stats?.totalHeaders || 0;
  const validHeaders = stats?.validHeadersCount || 0;
  const invalidHeaders = stats?.invalidHeadersCount || 0;
  const successRate = stats?.validationSuccessPercentage ?? 100;
  const cookies = stats?.cookies || { total: 0, active: 0, issued: 0, expired: 0, revoked: 0 };
  const secWarnings = stats?.securityWarnings?.total || 0;
  const secBreakdown = stats?.securityWarnings?.breakdown || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Security & Validation Operations Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time HTTP header RFC inspection telemetry, DFA session cookie tracking, and vulnerability metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1527] hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh Telemetry
          </button>
          <button
            onClick={() => onNavigate('headers')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-colors"
          >
            Inspect Headers <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between">
          <span>Failed to load live metrics: {error}</span>
          <button onClick={loadData} className="underline font-semibold ml-2">Retry</button>
        </div>
      )}

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Headers Inspected */}
        <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Headers Inspected</span>
            <FileCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">{totalHeaders}</div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> {validHeaders} valid
              </span>
              <span className="text-rose-400 flex items-center gap-0.5">
                <XCircle className="w-3 h-3" /> {invalidHeaders} malformed
              </span>
            </div>
          </div>
        </div>

        {/* Validation Success Rate */}
        <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Validation Success</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-400">{successRate}%</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${successRate}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Total Cookies Tracked */}
        <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Cookies Tracked</span>
            <Cookie className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">{cookies.total}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {cookies.issued} Issued | {cookies.active} Active
            </div>
          </div>
        </div>

        {/* Cookie DFA States (Active vs Expired/Revoked) */}
        <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active vs Terminated</span>
            <GitFork className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-cyan-300">{cookies.active}</div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-amber-400">{cookies.expired} Expired</span>
              <span className="text-rose-400">{cookies.revoked} Revoked</span>
            </div>
          </div>
        </div>

        {/* Security Warnings */}
        <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Security Alerts</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold font-mono ${secWarnings > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {secWarnings}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {secBreakdown.CRITICAL > 0 ? (
                <span className="text-rose-400 font-bold">{secBreakdown.CRITICAL} Critical findings</span>
              ) : (
                <span>{secBreakdown.HIGH || 0} High | {secBreakdown.MEDIUM || 0} Medium</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visual DFA State Machine Diagram Preview */}
      <DfaVisualizer 
        currentState={cookies.active > 0 ? 'ACTIVE' : cookies.issued > 0 ? 'ISSUED' : 'START'}
        onSelectState={() => onNavigate('dfa')}
      />

      {/* Two Column Layout: Security Vulnerability Posture & Recent Inspection Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Vulnerability Summary Card */}
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-slate-200">Security Severity Telemetry</h3>
            </div>
            <button
              onClick={() => onNavigate('security')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              Deep Scan <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {[
              { level: 'CRITICAL', label: 'CRLF Injection / Splitting (CWE-113)', count: secBreakdown.CRITICAL, color: 'bg-rose-500', text: 'text-rose-400' },
              { level: 'HIGH', label: 'Missing HttpOnly / Secure / Prefix Flaw', count: secBreakdown.HIGH, color: 'bg-orange-500', text: 'text-orange-400' },
              { level: 'MEDIUM', label: 'Unsafe SameSite / Missing HSTS / CSP', count: secBreakdown.MEDIUM, color: 'bg-amber-500', text: 'text-amber-400' },
              { level: 'LOW', label: 'Server Banner Leak / Lifetime Warnings', count: secBreakdown.LOW, color: 'bg-blue-500', text: 'text-blue-400' },
              { level: 'INFORMATIONAL', label: 'Purged Cookies / Protocol Diagnostics', count: secBreakdown.INFORMATIONAL, color: 'bg-slate-500', text: 'text-slate-400' }
            ].map((item) => (
              <div key={item.level} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0f172a]/70 border border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{item.level}</div>
                    <div className="text-[10px] text-slate-400">{item.label}</div>
                  </div>
                </div>
                <div className={`text-sm font-mono font-bold ${item.text}`}>
                  {item.count || 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Validation Activity */}
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recent Validation Activity</h3>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              View All History <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {activity?.recentInspections && activity.recentInspections.length > 0 ? (
              activity.recentInspections.map((item, idx) => (
                <div
                  key={item._id || idx}
                  onClick={() => onNavigate('history')}
                  className="p-3 rounded-lg bg-[#0f172a]/60 hover:bg-[#1e293b]/60 border border-slate-800/80 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200 truncate">
                        Inspection #{item._id ? String(item._id).substring(18) : idx + 1}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {item.totalCount || 0} headers
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span className="text-emerald-400 font-mono">{item.validCount || 0} valid</span>
                      <span>•</span>
                      <span className="text-rose-400 font-mono">{item.invalidCount || 0} malformed</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt || Date.now()).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div>
                    {item.invalidCount === 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                        100% PASS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/60 text-rose-400 border border-rose-500/30">
                        ISSUES DETECTED
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No inspection records logged yet. Run a validation to generate telemetry!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
