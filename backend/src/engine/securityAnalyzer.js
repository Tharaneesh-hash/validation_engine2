/**
 * Security Analysis Engine
 * Evaluates HTTP headers and cookies for cybersecurity vulnerabilities,
 * misconfigurations, and RFC compliance issues. Assigns severity ratings and remediation guidance.
 */

const SEVERITY_LEVELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFORMATIONAL: 'INFORMATIONAL'
};

const SEVERITY_WEIGHTS = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 40,
  LOW: 15,
  INFORMATIONAL: 5
};

/**
 * Analyzes a list of parsed headers and cookies for security weaknesses.
 * @param {Array<Object>} headers - Parsed headers array
 * @param {Array<Object>} cookies - Extracted cookies array
 * @returns {Object} Security report with findings, metrics, and overall score
 */
function analyzeSecurity(headers = [], cookies = []) {
  const findings = [];
  const headerMap = new Map();

  headers.forEach((h) => {
    if (h.name && !h.isControlLine) {
      headerMap.set(h.name.toLowerCase(), h);
    }
  });

  // 1. CRLF Injection (CWE-113) Detection in any header
  headers.forEach((h) => {
    const rawToCheck = `${h.name || ''}: ${h.value || ''}`;
    if (/[\r\n]|%0[dDaA]/.test(rawToCheck)) {
      findings.push({
        id: `SEC-CRLF-${h.lineNumber || 'UNK'}`,
        category: 'Injection',
        cwe: 'CWE-113: Improper Neutralization of CRLF Sequences in HTTP Headers',
        title: 'CRLF Header Injection / HTTP Response Splitting',
        target: h.name || 'Header',
        lineNumber: h.lineNumber,
        severity: SEVERITY_LEVELS.CRITICAL,
        evidence: h.raw || rawToCheck,
        description: 'Carriage Return (\\r) or Line Feed (\\n) characters detected. Attackers can split the HTTP response to inject arbitrary response headers, inject cookies, or deliver malicious XSS payloads.',
        recommendation: 'Filter or sanitize all user-controllable input to strip CR and LF characters before setting HTTP headers.'
      });
    }
    if (/\x00|%00/.test(rawToCheck)) {
      findings.push({
        id: `SEC-NULL-${h.lineNumber || 'UNK'}`,
        category: 'Injection',
        cwe: 'CWE-626: Null Byte Interaction',
        title: 'Null Byte Injection Detected',
        target: h.name || 'Header',
        lineNumber: h.lineNumber,
        severity: SEVERITY_LEVELS.HIGH,
        evidence: h.raw || rawToCheck,
        description: 'Null byte (%00 or \\0) in header content can bypass security filters and cause memory corruption or truncation.',
        recommendation: 'Reject or strip null bytes from incoming header parameters.'
      });
    }
  });

  // 2. Cookie Security Analysis
  cookies.forEach((c) => {
    const cookieName = c.name || 'unnamed_cookie';
    const attrs = c.attributes || {};

    // 2.1 Missing HttpOnly (CWE-1004)
    if (!attrs.httpOnly) {
      findings.push({
        id: `SEC-COOKIE-HTTPONLY-${cookieName}`,
        category: 'Cookie Security',
        cwe: 'CWE-1004: Sensitive Cookie Without \'HttpOnly\' Flag',
        title: `Cookie "${cookieName}" lacks "HttpOnly" attribute`,
        target: `Set-Cookie: ${cookieName}`,
        severity: SEVERITY_LEVELS.HIGH,
        evidence: c.rawCookie || `${cookieName}=${c.value || ''}`,
        description: 'Without HttpOnly, the cookie can be accessed via client-side scripts (document.cookie). In the event of a Cross-Site Scripting (XSS) flaw, session tokens can be exfiltrated.',
        recommendation: 'Append the "HttpOnly" flag to prevent client-side JavaScript access to sensitive authentication tokens.'
      });
    }

    // 2.2 Missing Secure Flag (CWE-614)
    if (!attrs.secure) {
      findings.push({
        id: `SEC-COOKIE-SECURE-${cookieName}`,
        category: 'Cookie Security',
        cwe: 'CWE-614: Sensitive Cookie in HTTPS Session Without \'Secure\' Attribute',
        title: `Cookie "${cookieName}" lacks "Secure" attribute`,
        target: `Set-Cookie: ${cookieName}`,
        severity: SEVERITY_LEVELS.HIGH,
        evidence: c.rawCookie || `${cookieName}=${c.value || ''}`,
        description: 'Cookies lacking the Secure flag will be transmitted across unencrypted HTTP channels in plaintext, making them susceptible to Man-in-the-Middle (MitM) packet sniffing.',
        recommendation: 'Append the "Secure" directive to ensure the cookie is exclusively transmitted over encrypted TLS/HTTPS connections.'
      });
    }

    // 2.3 Unsafe SameSite Configuration (CWE-1275)
    if (!attrs.sameSite) {
      findings.push({
        id: `SEC-COOKIE-SAMESITE-MISSING-${cookieName}`,
        category: 'Cookie Security',
        cwe: 'CWE-1275: Sensitive Cookie with Improper SameSite Attribute',
        title: `Cookie "${cookieName}" does not specify "SameSite"`,
        target: `Set-Cookie: ${cookieName}`,
        severity: SEVERITY_LEVELS.MEDIUM,
        evidence: c.rawCookie || `${cookieName}=${c.value || ''}`,
        description: 'When SameSite is omitted, legacy browsers send cookies in cross-origin requests, leaving the application vulnerable to Cross-Site Request Forgery (CSRF).',
        recommendation: 'Explicitly configure "SameSite=Lax" for standard browsing or "SameSite=Strict" for high-security transactional state.'
      });
    } else if (attrs.sameSite.toLowerCase() === 'none') {
      if (!attrs.secure) {
        findings.push({
          id: `SEC-COOKIE-SAMESITE-NONE-INSECURE-${cookieName}`,
          category: 'Cookie Security',
          cwe: 'CWE-1275: Sensitive Cookie with Improper SameSite Attribute',
          title: `Cookie "${cookieName}" sets SameSite=None without Secure`,
          target: `Set-Cookie: ${cookieName}`,
          severity: SEVERITY_LEVELS.HIGH,
          evidence: c.rawCookie || `${cookieName}=${c.value || ''}`,
          description: 'SameSite=None instructs browsers to attach this cookie in all third-party contexts. Modern browsers reject SameSite=None unless the Secure attribute is also present.',
          recommendation: 'Always pair "SameSite=None" with the "Secure" attribute over HTTPS, or switch to SameSite=Lax/Strict.'
        });
      } else {
        findings.push({
          id: `SEC-COOKIE-SAMESITE-NONE-${cookieName}`,
          category: 'Cookie Security',
          cwe: 'CWE-1275: Sensitive Cookie with Improper SameSite Attribute',
          title: `Cookie "${cookieName}" uses permissive SameSite=None`,
          target: `Set-Cookie: ${cookieName}`,
          severity: SEVERITY_LEVELS.LOW,
          evidence: c.rawCookie || `${cookieName}=${c.value || ''}`,
          description: 'SameSite=None exposes the cookie to cross-site requests. Ensure CSRF anti-forgery tokens (e.g. synchronizer tokens) are rigorously enforced.',
          recommendation: 'Review whether cross-origin sharing is mandatory; prefer SameSite=Lax where possible.'
        });
      }
    }

    // 2.4 Prefix Violations (RFC 6265bis)
    if (cookieName.startsWith('__Secure-') && !attrs.secure) {
      findings.push({
        id: `SEC-PREFIX-SECURE-${cookieName}`,
        category: 'RFC Compliance',
        cwe: 'CWE-614: Sensitive Cookie in HTTPS Session Without \'Secure\' Attribute',
        title: `Prefix Violation: "__Secure-" cookie missing Secure flag`,
        target: `Set-Cookie: ${cookieName}`,
        severity: SEVERITY_LEVELS.HIGH,
        evidence: c.rawCookie || cookieName,
        description: 'RFC 6265bis mandates that any cookie prefixed with "__Secure-" must be sent with the Secure attribute from a secure origin.',
        recommendation: 'Add the "Secure" attribute to satisfy RFC 6265bis cookie prefix constraints.'
      });
    }

    if (cookieName.startsWith('__Host-')) {
      const violations = [];
      if (!attrs.secure) violations.push('missing "Secure" attribute');
      if (attrs.domain) violations.push(`specifies Domain="${attrs.domain}" (must NOT specify Domain)`);
      if (attrs.path !== '/') violations.push(`Path="${attrs.path || 'none'}" (must be Path=/)`);

      if (violations.length > 0) {
        findings.push({
          id: `SEC-PREFIX-HOST-${cookieName}`,
          category: 'RFC Compliance',
          cwe: 'CWE-1275: Sensitive Cookie with Improper Configuration',
          title: `Prefix Violation: "__Host-" cookie invalid configuration`,
          target: `Set-Cookie: ${cookieName}`,
          severity: SEVERITY_LEVELS.HIGH,
          evidence: c.rawCookie || cookieName,
          description: `RFC 6265bis requires "__Host-" cookies to be locked to the host origin: ${violations.join(', ')}.`,
          recommendation: 'Ensure __Host- cookies have Secure, Path=/, and omit the Domain attribute completely.'
        });
      }
    }

    // 2.5 Excessive or Negative Expiration
    if (attrs.maxAge !== null && attrs.maxAge !== undefined) {
      const maxAgeSec = parseInt(attrs.maxAge, 10);
      if (maxAgeSec > 31536000) { // > 1 year
        findings.push({
          id: `SEC-COOKIE-MAXAGE-EXCESSIVE-${cookieName}`,
          category: 'Cookie Lifecycle',
          cwe: 'CWE-613: Insufficient Session Expiration',
          title: `Excessive cookie duration for "${cookieName}"`,
          target: `Set-Cookie: ${cookieName}`,
          severity: SEVERITY_LEVELS.LOW,
          evidence: `Max-Age=${maxAgeSec} (${Math.round(maxAgeSec / 86400)} days)`,
          description: 'Long-lived session cookies increase the window of opportunity for attackers if a token is stolen or leaked in server logs.',
          recommendation: 'Limit session cookie lifespan to short operational windows (e.g., 8-24 hours) with rolling refresh tokens.'
        });
      } else if (maxAgeSec <= 0) {
        findings.push({
          id: `SEC-COOKIE-MAXAGE-EXPIRED-${cookieName}`,
          category: 'Cookie Lifecycle',
          cwe: 'CWE-613: Insufficient Session Expiration',
          title: `Cookie "${cookieName}" specifies immediate deletion (Max-Age <= 0)`,
          target: `Set-Cookie: ${cookieName}`,
          severity: SEVERITY_LEVELS.INFORMATIONAL,
          evidence: `Max-Age=${maxAgeSec}`,
          description: 'This cookie directive immediately invalidates/removes the cookie from the client storage.',
          recommendation: 'Intended behavior for session logout or revocation.'
        });
      }
    }
  });

  // 3. Essential Security Response Headers (Missing Protection Checks)
  // Check only if inspection looks like a response (or general security analysis)
  const isLikelyResponse = headerMap.has('set-cookie') || headerMap.has('content-type') || headerMap.has('server') || headerMap.has('status-line');

  if (isLikelyResponse) {
    // 3.1 Strict-Transport-Security (HSTS)
    if (!headerMap.has('strict-transport-security')) {
      findings.push({
        id: 'SEC-HEADER-HSTS-MISSING',
        category: 'Transport Security',
        cwe: 'CWE-319: Cleartext Transmission of Sensitive Information',
        title: 'Missing "Strict-Transport-Security" (HSTS) Header',
        target: 'Strict-Transport-Security',
        severity: SEVERITY_LEVELS.MEDIUM,
        evidence: 'Header absent from HTTP response',
        description: 'HTTP Strict Transport Security enforces encrypted HTTPS connections and protects against SSL-stripping and downgrade attacks.',
        recommendation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload".'
      });
    }

    // 3.2 Content-Security-Policy (CSP)
    if (!headerMap.has('content-security-policy')) {
      findings.push({
        id: 'SEC-HEADER-CSP-MISSING',
        category: 'Client Protection',
        cwe: 'CWE-1021: Improper Restriction of Rendered UI Layers or Frames',
        title: 'Missing "Content-Security-Policy" (CSP) Header',
        target: 'Content-Security-Policy',
        severity: SEVERITY_LEVELS.MEDIUM,
        evidence: 'Header absent from HTTP response',
        description: 'Content Security Policy mitigates Cross-Site Scripting (XSS) and data injection by restricting resource origins.',
        recommendation: 'Deploy a robust Content-Security-Policy, defining default-src, script-src, object-src, and frame-ancestors.'
      });
    }

    // 3.3 X-Content-Type-Options
    const xcto = headerMap.get('x-content-type-options');
    if (!xcto || xcto.value.toLowerCase() !== 'nosniff') {
      findings.push({
        id: 'SEC-HEADER-XCTO-MISSING',
        category: 'MIME Protection',
        cwe: 'CWE-79: Improper Neutralization of Input During Web Page Generation',
        title: 'Missing or Invalid "X-Content-Type-Options: nosniff"',
        target: 'X-Content-Type-Options',
        severity: SEVERITY_LEVELS.LOW,
        evidence: xcto ? xcto.value : 'Header absent',
        description: 'Prevents browsers from MIME-sniffing a response away from the declared content-type, stopping executable script execution from image/text uploads.',
        recommendation: 'Set "X-Content-Type-Options: nosniff" on all responses.'
      });
    }

    // 3.4 X-Frame-Options
    if (!headerMap.has('x-frame-options') && !headerMap.has('content-security-policy')) {
      findings.push({
        id: 'SEC-HEADER-XFO-MISSING',
        category: 'Clickjacking Protection',
        cwe: 'CWE-1021: Improper Restriction of Rendered UI Layers or Frames',
        title: 'Missing "X-Frame-Options" Header (Clickjacking Risk)',
        target: 'X-Frame-Options',
        severity: SEVERITY_LEVELS.MEDIUM,
        evidence: 'Header absent from HTTP response',
        description: 'Without X-Frame-Options or CSP frame-ancestors, web pages can be framed within an attacker\'s iframe for Clickjacking attacks.',
        recommendation: 'Add "X-Frame-Options: DENY" or "X-Frame-Options: SAMEORIGIN".'
      });
    }

    // 3.5 Server / X-Powered-By Information Leakage
    if (headerMap.has('server')) {
      findings.push({
        id: 'SEC-HEADER-SERVER-LEAK',
        category: 'Information Disclosure',
        cwe: 'CWE-200: Exposure of Sensitive Information to an Unauthorized Actor',
        title: 'Server Banner Information Disclosure',
        target: 'Server',
        severity: SEVERITY_LEVELS.LOW,
        evidence: `Server: ${headerMap.get('server').value}`,
        description: 'The "Server" header reveals backend software stack and version numbers, assisting adversaries in targeting known vulnerabilities.',
        recommendation: 'Suppress or obscure the "Server" response header.'
      });
    }

    if (headerMap.has('x-powered-by')) {
      findings.push({
        id: 'SEC-HEADER-XPOWERED-LEAK',
        category: 'Information Disclosure',
        cwe: 'CWE-200: Exposure of Sensitive Information to an Unauthorized Actor',
        title: 'Technology Fingerprinting via "X-Powered-By"',
        target: 'X-Powered-By',
        severity: SEVERITY_LEVELS.LOW,
        evidence: `X-Powered-By: ${headerMap.get('x-powered-by').value}`,
        description: 'Identifies framework technology (e.g. Express, PHP, ASP.NET), providing attackers with reconnaissance intelligence.',
        recommendation: 'Disable X-Powered-By via middleware (e.g. app.disable("x-powered-by")).'
      });
    }
  }

  // Calculate Severity Summary & Risk Score
  const counts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFORMATIONAL: 0
  };

  let totalPenalty = 0;
  findings.forEach((f) => {
    if (counts[f.severity] !== undefined) {
      counts[f.severity]++;
      totalPenalty += (SEVERITY_WEIGHTS[f.severity] || 10);
    }
  });

  // Security posture score (0 - 100)
  const securityScore = Math.max(0, Math.min(100, Math.round(100 - (totalPenalty / 3))));

  return {
    findings,
    totalFindings: findings.length,
    counts,
    securityScore,
    posture: securityScore >= 80 ? 'SECURE' : securityScore >= 50 ? 'MODERATE RISK' : 'VULNERABLE'
  };
}

module.exports = {
  SEVERITY_LEVELS,
  SEVERITY_WEIGHTS,
  analyzeSecurity
};
