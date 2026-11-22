import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  ArrowRight,
  Code,
  FileWarning,
  Flame,
  Search,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import SecurityBadge from '../components/SecurityBadge';

export default function SecurityAnalysis() {
  const [testPayload, setTestPayload] = useState([
    'HTTP/1.1 200 OK',
    'Server: Apache/2.4.41 (Ubuntu)',
    'X-Powered-By: Express',
    'X-Custom-Profile: user1%0d%0aSet-Cookie: session=injected_super_admin; Path=/; SameSite=None',
    'Set-Cookie: auth_token=jwt_sample_12345; Path=/app',
    'Set-Cookie: tracking_id=track_9988; Max-Age=63072000; SameSite=None'
  ].join('\n'));

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const handleScan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.scanSecurity({ rawHeaders: testPayload });
      if (res.success) {
        setReport(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const findings = report?.findings || [];
  const filteredFindings = filterSeverity === 'ALL'
    ? findings
    : findings.filter((f) => f.severity === filterSeverity);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-cyan-400" />
          HTTP Header & Cookie Security Vulnerability Analysis
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Deep vulnerability scanner for CRLF injection (CWE-113), cookie security flags, HSTS/CSP posture, and information disclosure.
        </p>
      </div>

      {/* Interactive Scanner Box */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            Security Audit Scanner Input
          </label>
          <span className="text-xs text-slate-400">Paste headers or cookies to assess security posture</span>
        </div>

        <textarea
          value={testPayload}
          onChange={(e) => setTestPayload(e.target.value)}
          rows={5}
          className="w-full bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed resize-y"
          placeholder="Paste headers or Set-Cookie strings to scan..."
        />

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Scans for CWE-113, CWE-1004, CWE-614, CWE-1275, CWE-319, CWE-1021, and RFC 6265bis rules.
          </span>
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2"
          >
            {loading ? 'Evaluating Security Vectors...' : 'Execute Deep Vulnerability Scan'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Security Posture Score & Counts */}
      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Security Score Gauge */}
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Security Posture Score</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-bold font-mono ${
                  report.securityScore >= 80 ? 'text-emerald-400' :
                  report.securityScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {report.securityScore}
                </span>
                <span className="text-xs text-slate-500 font-mono">/ 100</span>
              </div>
              <div className="mt-2 text-xs font-semibold">
                Status: <span className={
                  report.posture === 'SECURE' ? 'text-emerald-400' :
                  report.posture === 'MODERATE RISK' ? 'text-amber-400' : 'text-rose-400'
                }>{report.posture}</span>
              </div>
            </div>

            {/* Critical & High Counts */}
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Critical & High Vulnerabilities</span>
              <div className="mt-2">
                <div className="text-3xl font-bold font-mono text-rose-400">
                  {(report.counts?.CRITICAL || 0) + (report.counts?.HIGH || 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {report.counts?.CRITICAL || 0} Critical | {report.counts?.HIGH || 0} High
                </div>
              </div>
            </div>

            {/* Medium & Low Counts */}
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Medium & Low Warnings</span>
              <div className="mt-2">
                <div className="text-3xl font-bold font-mono text-amber-400">
                  {(report.counts?.MEDIUM || 0) + (report.counts?.LOW || 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {report.counts?.MEDIUM || 0} Medium | {report.counts?.LOW || 0} Low
                </div>
              </div>
            </div>

            {/* Total Assessed Items */}
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400">Total Findings</span>
              <div className="mt-2">
                <div className="text-3xl font-bold font-mono text-white">
                  {report.totalFindings}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Across all response vectors
                </div>
              </div>
            </div>
          </div>

          {/* Severity Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 mr-2">Filter by Severity:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                  filterSeverity === sev
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                    : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sev} {sev !== 'ALL' && report.counts?.[sev] !== undefined ? `(${report.counts[sev]})` : ''}
              </button>
            ))}
          </div>

          {/* Detailed Vulnerability Cards */}
          <div className="space-y-3">
            {filteredFindings.length > 0 ? (
              filteredFindings.map((finding, idx) => (
                <div
                  key={finding.id || idx}
                  className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <SecurityBadge severity={finding.severity} size="sm" />
                      <h4 className="text-sm font-bold text-slate-100">{finding.title}</h4>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#080d19] border border-slate-800 text-cyan-400">
                      {finding.cwe || 'CWE'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed">
                    {finding.description}
                  </div>

                  {finding.evidence && (
                    <div className="p-2.5 rounded bg-[#060a14] border border-slate-800 text-xs font-mono text-slate-300">
                      <span className="text-slate-500 select-none">Evidence: </span>
                      <span className="text-rose-300">{finding.evidence}</span>
                    </div>
                  )}

                  {/* Remediation Snippet */}
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Remediation Recommendation:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {finding.recommendation}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 bg-[#0b1222] rounded-xl border border-slate-800">
                No vulnerabilities found matching filter "{filterSeverity}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
