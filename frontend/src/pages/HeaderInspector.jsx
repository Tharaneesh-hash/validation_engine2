import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Cookie,
  Code,
  Sparkles,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';
import PresetSelector from '../components/PresetSelector';
import SecurityBadge from '../components/SecurityBadge';

export default function HeaderInspector({ onNavigateToCookie }) {
  const [rawHeaders, setRawHeaders] = useState([
    'GET /api/v1/auth/session HTTP/1.1',
    'Host: api.enterprise-validator.com',
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Accept: application/json; charset=utf-8',
    'Set-Cookie: __Host-session=a9f8e4b7c2d1e0f3; Path=/; Secure; HttpOnly; SameSite=Strict'
  ].join('\n'));

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleValidate = async () => {
    if (!rawHeaders.trim()) {
      setError('Please provide raw HTTP headers to inspect.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.validateHeaders(rawHeaders, 'raw_paste');
      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawHeaders);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setRawHeaders('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-cyan-400" />
          HTTP Header Inspector & RFC Validator
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Inspects HTTP request and response headers against RFC 7230/9110 token specifications and detects CRLF injection vectors.
        </p>
      </div>

      {/* Preset Selector */}
      <PresetSelector
        onSelectPreset={(presetText) => {
          setRawHeaders(presetText);
          setResult(null);
          setError(null);
        }}
      />

      {/* Raw Header Input Box */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            Paste Raw HTTP Request / Response Headers
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-xs flex items-center gap-1 font-mono"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-xs flex items-center gap-1 font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={rawHeaders}
            onChange={(e) => setRawHeaders(e.target.value)}
            rows={8}
            placeholder="Host: example.com&#10;User-Agent: Mozilla/5.0&#10;Authorization: Bearer token...&#10;Set-Cookie: session_id=123; Path=/; Secure; HttpOnly; SameSite=Strict"
            className="w-full bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed resize-y"
          />
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-mono">
            RFC 7230 §3.2 token format: <code className="text-cyan-400">^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$</code>
          </div>
          <button
            onClick={handleValidate}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2"
          >
            {loading ? 'Inspecting Headers...' : 'Run Regex & Security Inspection'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inspection Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Total Lines</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{result.totalCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Valid Headers</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{result.validCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Malformed Headers</div>
                <div className={`text-xl font-bold font-mono mt-0.5 ${result.invalidCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {result.invalidCount}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-500/30">
                <XCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Security Score</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                  {result.securityReport?.securityScore ?? 100} / 100
                </div>
              </div>
              <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Module 1 & 2: Invalid Headers Table */}
          {result.invalidHeaders && result.invalidHeaders.length > 0 && (
            <div className="bg-[#0b1222] border border-rose-900/40 rounded-xl overflow-hidden">
              <div className="p-4 bg-rose-950/30 border-b border-rose-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-semibold text-rose-300">
                    Malformed / Invalid Headers Detected ({result.invalidHeaders.length})
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-rose-400 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/40">
                  RFC Syntax Violation
                </span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {result.invalidHeaders.map((hdr, idx) => (
                  <div key={idx} className="p-4 bg-[#0a0f1d] hover:bg-[#0e162a] transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          Line {hdr.lineNumber}
                        </span>
                        <code className="text-xs font-mono font-bold text-rose-400">
                          {hdr.name || '(unparseable-token)'}
                        </code>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-rose-400 font-mono font-semibold">
                        INVALID
                      </span>
                    </div>

                    <div className="text-xs font-mono bg-[#060a14] p-2 rounded border border-slate-800 text-slate-300">
                      {hdr.raw}
                    </div>

                    {hdr.issues && hdr.issues.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-rose-400">Identified Error:</div>
                        <ul className="list-disc list-inside text-xs text-rose-300/90 space-y-0.5 pl-1">
                          {hdr.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {hdr.suggestions && hdr.suggestions.length > 0 && (
                      <div className="p-2.5 rounded bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 space-y-0.5">
                        <span className="font-semibold text-amber-400">Suggested Correction:</span>
                        {hdr.suggestions.map((sug, i) => (
                          <div key={i} className="font-mono text-[11px] text-amber-200 mt-0.5">↳ {sug}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module 1 & 2: Valid Headers Table */}
          <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Valid RFC Compliant Headers ({result.validHeaders?.length || 0})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                RFC 7230 / 9110 Pass
              </span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {result.validHeaders && result.validHeaders.length > 0 ? (
                result.validHeaders.map((hdr, idx) => (
                  <div key={idx} className="p-3.5 hover:bg-slate-800/30 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                        L{hdr.lineNumber}
                      </span>
                      <span className="font-semibold text-cyan-300 shrink-0">{hdr.name}:</span>
                      <span className="text-slate-300 truncate">{hdr.value}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                        VALID TOKEN
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No valid headers identified in input.
                </div>
              )}
            </div>
          </div>

          {/* Extracted Cookies Action Ribbon */}
          {result.extractedCookies && result.extractedCookies.length > 0 && (
            <div className="bg-[#0b1222] border border-blue-900/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/50">
                  <Cookie className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Detected {result.extractedCookies.length} Set-Cookie Header(s)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ready to track cookie lifecycle with the Deterministic Finite Automata engine.
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateToCookie && onNavigateToCookie(result.extractedCookies[0])}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                Inspect Cookie in DFA Machine <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Inline Security Findings */}
          {result.securityReport && result.securityReport.findings && result.securityReport.findings.length > 0 && (
            <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Cybersecurity Findings & Vulnerabilities ({result.securityReport.findings.length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {result.securityReport.findings.map((f, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#0f172a]/70 border border-slate-800 flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <SecurityBadge severity={f.severity} />
                        <span className="text-xs font-semibold text-slate-200">{f.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{f.description}</div>
                      <div className="text-[11px] font-mono text-cyan-400">↳ Fix: {f.recommendation}</div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {f.cwe ? f.cwe.split(':')[0] : 'CWE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
