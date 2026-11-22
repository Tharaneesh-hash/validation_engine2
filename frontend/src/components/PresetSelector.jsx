import React from 'react';
import { Sparkles, ShieldAlert, CheckCircle2, Bug, AlertTriangle, FileCode } from 'lucide-react';

export const PRESETS = [
  {
    id: 'secure-response',
    title: 'Secure Response (__Host- Cookie & Full Headers)',
    category: 'Hardened Production',
    icon: CheckCircle2,
    badgeColor: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
    description: 'Compliant HTTP response with Strict-Transport-Security, Content-Security-Policy, and RFC 6265bis __Host- cookie.',
    rawHeaders: [
      'HTTP/1.1 200 OK',
      'Date: Sun, 22 Nov 2026 08:30:00 GMT',
      'Content-Type: application/json; charset=utf-8',
      'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy: default-src \'self\'; script-src \'self\'; frame-ancestors \'none\'',
      'X-Content-Type-Options: nosniff',
      'X-Frame-Options: DENY',
      'Set-Cookie: __Host-session=a9f8e4b7c2d1e0f3; Path=/; Secure; HttpOnly; SameSite=Strict'
    ].join('\n')
  },
  {
    id: 'crlf-injection',
    title: 'CRLF Response Splitting Attack (CWE-113)',
    category: 'Vulnerability Test',
    icon: ShieldAlert,
    badgeColor: 'text-rose-400 bg-rose-950/50 border-rose-500/30',
    description: 'Malicious payload attempting HTTP Response Splitting and cookie injection via carriage-return line-feed sequences.',
    rawHeaders: [
      'HTTP/1.1 200 OK',
      'Content-Type: text/html',
      'X-User-Input: alice%0d%0aSet-Cookie: admin_session=injected_privileged_token; Path=/; SameSite=None',
      'X-Trace-Id: trace-77291%0d%0aInjected-Header: malicious_value',
      'Set-Cookie: guest_id=48291; Path=/;'
    ].join('\n')
  },
  {
    id: 'insecure-cookie',
    title: 'Insecure Session Cookie (Missing Flags)',
    category: 'Security Warning',
    icon: AlertTriangle,
    badgeColor: 'text-amber-400 bg-amber-950/50 border-amber-500/30',
    description: 'Session cookie lacking HttpOnly and Secure flags, vulnerable to XSS exfiltration and plain-text interception.',
    rawHeaders: [
      'HTTP/1.1 200 OK',
      'Server: Apache/2.4.41 (Ubuntu)',
      'X-Powered-By: PHP/7.4.3',
      'Set-Cookie: user_auth=jwt_secret_token_unprotected_9988; Path=/; Domain=.example.com',
      'Set-Cookie: tracking_id=track_abc_123; SameSite=None'
    ].join('\n')
  },
  {
    id: 'malformed-rfc',
    title: 'Malformed Headers & Token Violations',
    category: 'RFC Syntax Test',
    icon: Bug,
    badgeColor: 'text-purple-400 bg-purple-950/50 border-purple-500/30',
    description: 'Demonstrates missing colon delimiters, deprecated leading whitespace (obs-fold), and illegal characters in tokens.',
    rawHeaders: [
      'Host: api.example.com',
      'User Agent: Mozilla/5.0 (Windows NT 10.0)',
      'Missing-Colon-Delimiter-Error',
      '  Deprecated-Obs-Fold-Continuation: illegal leading space',
      'Authorization: Bearer valid_token_123',
      'Invalid@Name: token-error',
      'Set-Cookie: bad cookie name=12345; Path=/'
    ].join('\n')
  },
  {
    id: 'standard-client-request',
    title: 'Standard Client Request Headers',
    category: 'Standard Client',
    icon: FileCode,
    badgeColor: 'text-cyan-400 bg-cyan-950/50 border-cyan-500/30',
    description: 'Typical browser HTTP request headers containing Accept, Authorization, Host, and User-Agent.',
    rawHeaders: [
      'GET /api/v2/secure/dashboard HTTP/1.1',
      'Host: enterprise.validator.io',
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept: application/json, text/plain, */*',
      'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'Accept-Language: en-US,en;q=0.9',
      'Cookie: session_id=s8291df72a9c1; preferences=theme_dark'
    ].join('\n')
  }
];

export default function PresetSelector({ onSelectPreset }) {
  return (
    <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Load Test Suites & RFC Presets</h3>
        </div>
        <span className="text-xs text-slate-400">Click any preset to instantly populate headers</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.rawHeaders)}
              className="text-left p-3 rounded-lg bg-[#0f172a]/70 hover:bg-[#1e293b]/70 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-150 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${preset.badgeColor}`}>
                    {preset.category}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {preset.title}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
