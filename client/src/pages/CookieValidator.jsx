import React, { useState } from 'react';
import {
  Cookie,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Lock,
  GitFork,
  HelpCircle,
  Check
} from 'lucide-react';
import api from '../services/api';
import SecurityBadge from '../components/SecurityBadge';

export default function CookieValidator({ initialCookie = null, onNavigateToDfa }) {
  const [rawCookieInput, setRawCookieInput] = useState(
    initialCookie?.rawCookie ||
    '__Host-session_auth=d78f2e9a1b0c4d5e; Path=/; Secure; HttpOnly; SameSite=Strict'
  );

  const [cookieName, setCookieName] = useState(initialCookie?.name || '__Host-session_auth');
  const [cookieValue, setCookieValue] = useState(initialCookie?.value || 'd78f2e9a1b0c4d5e');
  const [expires, setExpires] = useState(initialCookie?.attributes?.expires || 'Wed, 09 Jun 2027 10:18:14 GMT');
  const [maxAge, setMaxAge] = useState(initialCookie?.attributes?.maxAge || '86400');
  const [domain, setDomain] = useState(initialCookie?.attributes?.domain || '');
  const [path, setPath] = useState(initialCookie?.attributes?.path || '/');
  const [secure, setSecure] = useState(initialCookie?.attributes?.secure ?? true);
  const [httpOnly, setHttpOnly] = useState(initialCookie?.attributes?.httpOnly ?? true);
  const [sameSite, setSameSite] = useState(initialCookie?.attributes?.sameSite || 'Strict');

  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdCookie, setCreatedCookie] = useState(null);
  const [error, setError] = useState(null);

  const handleValidate = async () => {
    try {
      setLoading(true);
      setError(null);
      setCreatedCookie(null);

      const payload = {
        name: cookieName,
        value: cookieValue,
        attributes: {
          expires: expires || null,
          maxAge: maxAge || null,
          domain: domain || null,
          path: path || null,
          secure: Boolean(secure),
          httpOnly: Boolean(httpOnly),
          sameSite: sameSite || null
        }
      };

      const res = await api.validateCookie(payload);
      if (res.success) {
        setValidationResult(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndTrack = async () => {
    try {
      setCreating(true);
      setError(null);

      const payload = {
        name: cookieName,
        value: cookieValue,
        attributes: {
          expires: expires || null,
          maxAge: maxAge || null,
          domain: domain || null,
          path: path || null,
          secure: Boolean(secure),
          httpOnly: Boolean(httpOnly),
          sameSite: sameSite || null
        }
      };

      const res = await api.createCookie(payload);
      if (res.success) {
        setCreatedCookie(res.data);
        if (onNavigateToDfa) {
          onNavigateToDfa(res.data);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleParseRawString = () => {
    if (!rawCookieInput.trim()) return;

    const parts = rawCookieInput.split(';').map((p) => p.trim());
    if (parts.length === 0) return;

    const first = parts[0];
    const eqIdx = first.indexOf('=');
    if (eqIdx !== -1) {
      setCookieName(first.substring(0, eqIdx).trim());
      setCookieValue(first.substring(eqIdx + 1).trim());
    } else {
      setCookieName(first);
      setCookieValue('');
    }

    let parsedPath = '/';
    let parsedDomain = '';
    let parsedExpires = '';
    let parsedMaxAge = '';
    let parsedSecure = false;
    let parsedHttpOnly = false;
    let parsedSameSite = '';

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const lower = part.toLowerCase();
      if (lower === 'secure') parsedSecure = true;
      else if (lower === 'httponly') parsedHttpOnly = true;
      else {
        const peq = part.indexOf('=');
        if (peq !== -1) {
          const k = part.substring(0, peq).trim().toLowerCase();
          const v = part.substring(peq + 1).trim();
          if (k === 'path') parsedPath = v;
          else if (k === 'domain') parsedDomain = v;
          else if (k === 'expires') parsedExpires = v;
          else if (k === 'max-age') parsedMaxAge = v;
          else if (k === 'samesite') parsedSameSite = v;
        }
      }
    }

    setPath(parsedPath);
    setDomain(parsedDomain);
    setExpires(parsedExpires);
    setMaxAge(parsedMaxAge);
    setSecure(parsedSecure);
    setHttpOnly(parsedHttpOnly);
    setSameSite(parsedSameSite);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Cookie className="w-5 h-5 text-cyan-400" />
          Cookie Format Validator & RFC 6265 Engine
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Validates cookie tokens, octet values, attributes (Expires, Max-Age, Domain, Path, SameSite), and RFC 6265bis prefixes.
        </p>
      </div>

      {/* Raw Set-Cookie Parser Card */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-4">
        <label className="text-xs font-semibold text-slate-300 block mb-2">
          Quick-Parse Raw "Set-Cookie" String
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={rawCookieInput}
            onChange={(e) => setRawCookieInput(e.target.value)}
            placeholder="Set-Cookie: name=value; Path=/; Secure; HttpOnly; SameSite=Strict"
            className="flex-1 bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
          />
          <button
            onClick={handleParseRawString}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors shrink-0"
          >
            Parse Into Form
          </button>
        </div>
      </div>

      {/* Structured Cookie Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Controls */}
        <div className="lg:col-span-2 bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            Cookie Tokens & Attributes Builder
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Cookie Name (RFC 6265 Token) *
              </label>
              <input
                type="text"
                value={cookieName}
                onChange={(e) => setCookieName(e.target.value)}
                placeholder="session_id"
                className="w-full bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Allowed: a-z, A-Z, 0-9, !#$%&'*+-.^_`|~
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Cookie Value (RFC 6265 Cookie-Octet)
              </label>
              <input
                type="text"
                value={cookieValue}
                onChange={(e) => setCookieValue(e.target.value)}
                placeholder="xyz123token"
                className="w-full bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Disallows: whitespace, comma, semicolon, CTLs
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Expires (RFC 1123 Date)
              </label>
              <input
                type="text"
                value={expires}
                onChange={(e) => setExpires(e.target.value)}
                placeholder="Wed, 09 Jun 2027 10:18:14 GMT"
                className="w-full bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Format: Wdy, DD Mon YYYY HH:MM:SS GMT
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Max-Age (Seconds)
              </label>
              <input
                type="text"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="86400 (24 hours)"
                className="w-full bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Integer seconds delta (e.g. 3600 = 1 hour)
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Path Attribute
              </label>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/"
                className="w-full bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Must start with '/' (__Host- requires exactly '/')
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Domain Attribute
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com (omit for host-only)"
                className="w-full bg-[#080d19] border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                __Host- cookies MUST NOT specify a Domain
              </span>
            </div>
          </div>

          {/* Flags & SameSite */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={secure}
                onChange={(e) => setSecure(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-xs font-semibold text-slate-200">Secure</span>
              <span className="text-[10px] text-slate-400">(HTTPS only)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={httpOnly}
                onChange={(e) => setHttpOnly(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-xs font-semibold text-slate-200">HttpOnly</span>
              <span className="text-[10px] text-slate-400">(Mitigates XSS)</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">SameSite:</span>
              <select
                value={sameSite}
                onChange={(e) => setSameSite(e.target.value)}
                className="bg-[#080d19] border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none"
              >
                <option value="Strict">Strict (Highest CSRF protection)</option>
                <option value="Lax">Lax (Standard navigation)</option>
                <option value="None">None (Third-party, requires Secure)</option>
                <option value="">None specified (Legacy)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <button
              onClick={handleValidate}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              {loading ? 'Evaluating...' : 'Verify Regex & Prefix Rules'}
            </button>

            <button
              onClick={handleCreateAndTrack}
              disabled={creating}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <GitFork className="w-3.5 h-3.5" />
              {creating ? 'Minting in DFA...' : 'Create & Track in DFA State Machine (START → ISSUED)'}
            </button>
          </div>
        </div>

        {/* RFC Cookie Rules Cheatsheet */}
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            RFC 6265 & Prefix Specifications
          </h3>

          <div className="space-y-3 text-xs text-slate-400">
            <div className="p-2.5 rounded bg-[#080d19] border border-slate-800">
              <span className="font-semibold text-cyan-300 block mb-1">__Secure- Prefix Rules</span>
              <p className="text-[11px] leading-relaxed">
                Must be set with the <code className="text-emerald-400">Secure</code> attribute and transmitted over an encrypted HTTPS connection.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[#080d19] border border-slate-800">
              <span className="font-semibold text-cyan-300 block mb-1">__Host- Prefix Rules</span>
              <p className="text-[11px] leading-relaxed">
                Must have <code className="text-emerald-400">Secure</code>, MUST NOT have a <code className="text-rose-400">Domain</code> attribute, and must have <code className="text-emerald-400">Path=/</code>.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[#080d19] border border-slate-800">
              <span className="font-semibold text-cyan-300 block mb-1">SameSite=None Constraint</span>
              <p className="text-[11px] leading-relaxed">
                Modern browsers (Chrome 80+) will reject any cookie with <code className="text-amber-400">SameSite=None</code> unless the <code className="text-emerald-400">Secure</code> flag is also present.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Output Card */}
      {validationResult && (
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {validationResult.validation.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
              <h3 className="text-sm font-semibold text-slate-200">
                Regex Format Validation Result: {validationResult.validation.isValid ? (
                  <span className="text-emerald-400 font-mono">PASSED</span>
                ) : (
                  <span className="text-rose-400 font-mono">VIOLATIONS DETECTED</span>
                )}
              </h3>
            </div>
          </div>

          {/* Token Validations Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Name */}
            <div className="p-3 rounded-lg bg-[#080d19] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cookie Name</span>
                {validationResult.validation.nameValidation.isValid ? (
                  <span className="text-emerald-400 font-mono text-[10px]">VALID TOKEN</span>
                ) : (
                  <span className="text-rose-400 font-mono text-[10px]">INVALID</span>
                )}
              </div>
              <div className="font-mono text-xs text-white truncate">{cookieName}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                Regex: {validationResult.validation.nameValidation.pattern}
              </div>
            </div>

            {/* Value */}
            <div className="p-3 rounded-lg bg-[#080d19] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cookie Value</span>
                {validationResult.validation.valueValidation.isValid ? (
                  <span className="text-emerald-400 font-mono text-[10px]">VALID OCTET</span>
                ) : (
                  <span className="text-rose-400 font-mono text-[10px]">INVALID</span>
                )}
              </div>
              <div className="font-mono text-xs text-white truncate">{cookieValue || '(empty)'}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                Regex: {validationResult.validation.valueValidation.pattern}
              </div>
            </div>

            {/* Prefix Check */}
            <div className="p-3 rounded-lg bg-[#080d19] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Prefix Compliance</span>
                {validationResult.validation.attributesValidation.prefixCheck?.isValid ? (
                  <span className="text-emerald-400 font-mono text-[10px]">COMPLIANT</span>
                ) : (
                  <span className="text-rose-400 font-mono text-[10px]">PREFIX VIOLATION</span>
                )}
              </div>
              <div className="font-mono text-xs text-white">
                {validationResult.validation.attributesValidation.prefixCheck?.prefixType || 'Standard (No prefix)'}
              </div>
              <div className="text-[10px] text-slate-500">
                {validationResult.validation.attributesValidation.prefixCheck?.hasPrefix ? 'RFC 6265bis prefix' : 'No prefix constraints'}
              </div>
            </div>
          </div>

          {/* Issues List */}
          {validationResult.validation.issues && validationResult.validation.issues.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 space-y-1">
              <span className="font-semibold text-rose-400">Validation Errors:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {validationResult.validation.issues.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Security Warnings */}
          {validationResult.securityReport && validationResult.securityReport.findings && validationResult.securityReport.findings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/30 space-y-2">
              <span className="font-semibold text-xs text-amber-400">Security Best-Practice Warnings:</span>
              <div className="space-y-1">
                {validationResult.securityReport.findings.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <SecurityBadge severity={f.severity} size="xs" />
                    <span className="text-slate-300">{f.title}:</span>
                    <span className="text-slate-400 text-[11px]">{f.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creation Success Banner */}
      {createdCookie && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs font-semibold text-emerald-300">
                Cookie "{createdCookie.name}" successfully minted in MongoDB!
              </div>
              <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
                DFA Transition: START → CREATE → ISSUED
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateToDfa && onNavigateToDfa(createdCookie)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            Manage State in DFA Machine <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
