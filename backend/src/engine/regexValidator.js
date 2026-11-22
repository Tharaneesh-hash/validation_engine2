/**
 * Regular Expression Validation Engine
 * Implements RFC 7230, RFC 9110, RFC 6265, and RFC 6265bis specifications.
 */

// RFC 7230 / RFC 9110 token characters for HTTP header names and cookie names:
// token = 1*tchar
// tchar = "!" / "#" / "$" / "%" / "&" / "'" / "*" / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~" / DIGIT / ALPHA
const HEADER_NAME_REGEX = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;

// RFC 7230 field-content: printable ASCII and obs-text, excluding CTLs except HTAB and SP.
// Detects unescaped control characters.
const HEADER_VALUE_SAFE_REGEX = /^[\t\x20-\x7E\x80-\xFF]*$/;

// CRLF Injection (CWE-113) Detection: \r, \n, or URL-encoded equivalents %0d, %0a
const CRLF_INJECTION_REGEX = /[\r\n]|%0[dDaA]/;

// Null byte injection pattern
const NULL_BYTE_REGEX = /\x00|%00/;

// RFC 6265 cookie-name (token)
const COOKIE_NAME_REGEX = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;

// RFC 6265 cookie-octet: any US-ASCII except CTLs, whitespace, DQUOTE, comma, semicolon, backslash
// cookie-value = *cookie-octet / ( DQUOTE *cookie-octet DQUOTE )
// Quoted strings allow spaces and printable ASCII within the quotes (excluding semicolons and CTLs)
const COOKIE_OCTET_PATTERN = "^[a-zA-Z0-9!#$%&'()*+\\-./:<=>?@\\[\\]^_`{|}~]*$";
const COOKIE_VALUE_UNQUOTED_REGEX = new RegExp(COOKIE_OCTET_PATTERN);
const COOKIE_VALUE_QUOTED_REGEX = /^"[\t\x20-\x21\x23-\x3A\x3C-\x7E]*"$/;

// RFC 6265 / RFC 1123 sane-cookie-date: e.g. "Wed, 09 Jun 2027 10:18:14 GMT"
const EXPIRES_DATE_REGEX = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}\s\d{2}:\d{2}:\d{2}\sGMT$/i;

// RFC 6265 Max-Age: non-negative or signed integer delta-seconds
const MAX_AGE_REGEX = /^-?\d+$/;

// RFC 6265 Domain: RFC 1034 / 1123 domain syntax, optionally leading with '.'
const DOMAIN_REGEX = /^\.?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost$/i;

// RFC 6265 Path: must begin with '/'
const PATH_REGEX = /^\/[^\x00-\x1F\x7F;]*$/;

// RFC 6265bis SameSite: Strict, Lax, or None (case-insensitive)
const SAMESITE_REGEX = /^(?:Strict|Lax|None)$/i;

/**
 * Validates an HTTP Header Name against RFC 7230/9110 token rules.
 */
function validateHeaderName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return {
      isValid: false,
      pattern: HEADER_NAME_REGEX.toString(),
      error: 'Header name cannot be empty',
      suggestion: 'Provide a valid RFC 7230 token (e.g., Content-Type, Authorization)'
    };
  }

  if (CRLF_INJECTION_REGEX.test(name)) {
    return {
      isValid: false,
      pattern: CRLF_INJECTION_REGEX.toString(),
      error: 'CRLF injection sequence detected in header name',
      suggestion: 'Remove carriage return (\\r) and line feed (\\n) characters'
    };
  }

  if (/^\s|\s$/.test(name)) {
    return {
      isValid: false,
      pattern: '^\\S.*\\S$',
      error: 'Header name must not contain leading or trailing whitespace',
      suggestion: `Trim whitespace: "${name.trim()}"`
    };
  }

  if (/\s/.test(name)) {
    return {
      isValid: false,
      pattern: HEADER_NAME_REGEX.toString(),
      error: 'Header name contains spaces which is forbidden by RFC 7230',
      suggestion: `Replace spaces with hyphens: "${name.replace(/\s+/g, '-')}"`
    };
  }

  const matches = HEADER_NAME_REGEX.test(name);
  if (!matches) {
    return {
      isValid: false,
      pattern: HEADER_NAME_REGEX.toString(),
      error: 'Header name contains invalid token characters (e.g. delimiters, brackets, colons)',
      suggestion: `Sanitize to alphanumeric and valid token chars: "${name.replace(/[^a-zA-Z0-9!#$%&'*+\-.^_`|~]/g, '')}"`
    };
  }

  return {
    isValid: true,
    pattern: HEADER_NAME_REGEX.toString(),
    error: null,
    suggestion: null
  };
}

/**
 * Validates an HTTP Header Value against RFC 7230 field-content specifications.
 */
function validateHeaderValue(value) {
  if (value === undefined || value === null) {
    return {
      isValid: false,
      pattern: HEADER_VALUE_SAFE_REGEX.toString(),
      error: 'Header value is undefined or null',
      suggestion: 'Provide a valid header value or remove header if empty'
    };
  }

  const strValue = String(value);

  if (CRLF_INJECTION_REGEX.test(strValue)) {
    return {
      isValid: false,
      pattern: CRLF_INJECTION_REGEX.toString(),
      error: 'Potential HTTP response splitting / CRLF injection detected',
      suggestion: 'Strip \\r, \\n, %0d, %0a from the header value'
    };
  }

  if (NULL_BYTE_REGEX.test(strValue)) {
    return {
      isValid: false,
      pattern: NULL_BYTE_REGEX.toString(),
      error: 'Null byte injection detected in header value',
      suggestion: 'Remove null byte characters (\\0, %00)'
    };
  }

  const matches = HEADER_VALUE_SAFE_REGEX.test(strValue);
  if (!matches) {
    return {
      isValid: false,
      pattern: HEADER_VALUE_SAFE_REGEX.toString(),
      error: 'Header value contains forbidden control characters',
      suggestion: 'Ensure header value contains only printable ASCII (\\x20-\\x7E) or obs-text'
    };
  }

  return {
    isValid: true,
    pattern: HEADER_VALUE_SAFE_REGEX.toString(),
    error: null,
    suggestion: null
  };
}

/**
 * Validates a Cookie Name against RFC 6265 token rules.
 */
function validateCookieName(name) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return {
      isValid: false,
      pattern: COOKIE_NAME_REGEX.toString(),
      error: 'Cookie name cannot be empty',
      suggestion: 'Specify a valid cookie name (e.g., session_id, auth_token)'
    };
  }

  if (CRLF_INJECTION_REGEX.test(name)) {
    return {
      isValid: false,
      pattern: CRLF_INJECTION_REGEX.toString(),
      error: 'CRLF injection sequence in cookie name',
      suggestion: 'Remove \\r, \\n, %0d, %0a from cookie name'
    };
  }

  if (/[=;\s,]/.test(name)) {
    return {
      isValid: false,
      pattern: COOKIE_NAME_REGEX.toString(),
      error: 'Cookie name contains disallowed separators (=, ;, comma, whitespace)',
      suggestion: `Sanitize name to: "${name.replace(/[=;\s,]/g, '_')}"`
    };
  }

  const matches = COOKIE_NAME_REGEX.test(name);
  if (!matches) {
    return {
      isValid: false,
      pattern: COOKIE_NAME_REGEX.toString(),
      error: 'Cookie name violates RFC 6265 token syntax',
      suggestion: 'Use only alphanumeric characters and allowed punctuation (!#$%&\'*+-.^_`|~)'
    };
  }

  return {
    isValid: true,
    pattern: COOKIE_NAME_REGEX.toString(),
    error: null,
    suggestion: null
  };
}

/**
 * Validates a Cookie Value against RFC 6265 cookie-octet rules.
 */
function validateCookieValue(value) {
  if (value === undefined || value === null) {
    return {
      isValid: true,
      pattern: COOKIE_VALUE_UNQUOTED_REGEX.toString(),
      error: null,
      suggestion: null
    };
  }

  const str = String(value);

  if (CRLF_INJECTION_REGEX.test(str)) {
    return {
      isValid: false,
      pattern: CRLF_INJECTION_REGEX.toString(),
      error: 'CRLF characters detected in cookie value',
      suggestion: 'Encode value using Base64 or URL-encode without line breaks'
    };
  }

  if (NULL_BYTE_REGEX.test(str)) {
    return {
      isValid: false,
      pattern: NULL_BYTE_REGEX.toString(),
      error: 'Null byte injection detected in cookie value',
      suggestion: 'Remove %00 / null characters'
    };
  }

  if (/[;\s,]/.test(str) && !(str.startsWith('"') && str.endsWith('"'))) {
    return {
      isValid: false,
      pattern: COOKIE_VALUE_UNQUOTED_REGEX.toString(),
      error: 'Unquoted cookie value contains prohibited characters (spaces, semicolons, commas)',
      suggestion: `Enclose value in double quotes: "${str.replace(/;/g, '')}" or URL-encode`
    };
  }

  const matchesUnquoted = COOKIE_VALUE_UNQUOTED_REGEX.test(str);
  const matchesQuoted = COOKIE_VALUE_QUOTED_REGEX.test(str);

  if (!matchesUnquoted && !matchesQuoted) {
    return {
      isValid: false,
      pattern: `${COOKIE_VALUE_UNQUOTED_REGEX.toString()} or ${COOKIE_VALUE_QUOTED_REGEX.toString()}`,
      error: 'Cookie value violates RFC 6265 cookie-octet restrictions (contains CTLs, invalid chars)',
      suggestion: 'Use Base64 encoding or URL-safe character set'
    };
  }

  return {
    isValid: true,
    pattern: matchesQuoted ? COOKIE_VALUE_QUOTED_REGEX.toString() : COOKIE_VALUE_UNQUOTED_REGEX.toString(),
    error: null,
    suggestion: null
  };
}

/**
 * Validates individual Cookie Attributes.
 */
function validateCookieAttributes(attributes = {}, cookieName = '') {
  const results = {};
  const issues = [];

  // Expires
  if (attributes.expires) {
    const validExpires = EXPIRES_DATE_REGEX.test(attributes.expires);
    const dateParsed = Date.parse(attributes.expires);
    const isPast = !isNaN(dateParsed) && dateParsed < Date.now();
    results.expires = {
      isValid: validExpires && !isNaN(dateParsed),
      pattern: EXPIRES_DATE_REGEX.toString(),
      value: attributes.expires,
      isExpired: isPast,
      error: !validExpires ? 'Expires must match RFC 1123 format (e.g. "Wed, 21 Oct 2026 07:28:00 GMT")' : null,
      suggestion: !validExpires ? 'Format with toUTCString(), e.g., ' + new Date(Date.now() + 86400000).toUTCString() : null
    };
    if (!validExpires) issues.push('Invalid Expires date format');
  }

  // Max-Age
  if (attributes.maxAge !== undefined && attributes.maxAge !== null) {
    const validMaxAge = MAX_AGE_REGEX.test(String(attributes.maxAge));
    const numericVal = parseInt(attributes.maxAge, 10);
    results.maxAge = {
      isValid: validMaxAge,
      pattern: MAX_AGE_REGEX.toString(),
      value: attributes.maxAge,
      isExpired: numericVal <= 0,
      isExcessive: numericVal > 31536000, // > 1 year
      error: !validMaxAge ? 'Max-Age must be a valid integer' : null,
      suggestion: !validMaxAge ? 'Specify integer delta in seconds, e.g. 3600' : null
    };
    if (!validMaxAge) issues.push('Invalid Max-Age format');
  }

  // Domain
  if (attributes.domain) {
    const validDomain = DOMAIN_REGEX.test(attributes.domain);
    results.domain = {
      isValid: validDomain,
      pattern: DOMAIN_REGEX.toString(),
      value: attributes.domain,
      error: !validDomain ? 'Invalid Domain attribute format' : null,
      suggestion: !validDomain ? 'Use a valid fully-qualified domain name (e.g. .example.com)' : null
    };
    if (!validDomain) issues.push('Invalid Domain attribute');
  }

  // Path
  if (attributes.path) {
    const validPath = PATH_REGEX.test(attributes.path);
    results.path = {
      isValid: validPath,
      pattern: PATH_REGEX.toString(),
      value: attributes.path,
      error: !validPath ? 'Path must begin with "/" and contain no control characters or semicolons' : null,
      suggestion: !validPath ? 'Set Path to "/" or a specific subpath like "/api"' : null
    };
    if (!validPath) issues.push('Invalid Path attribute');
  }

  // SameSite
  if (attributes.sameSite) {
    const validSameSite = SAMESITE_REGEX.test(attributes.sameSite);
    const isNone = attributes.sameSite.toLowerCase() === 'none';
    const isSecure = Boolean(attributes.secure);
    let error = null;
    let suggestion = null;

    if (!validSameSite) {
      error = 'SameSite must be Strict, Lax, or None';
      suggestion = 'Set SameSite to "Strict", "Lax", or "None"';
      issues.push('Invalid SameSite value');
    } else if (isNone && !isSecure) {
      error = 'SameSite=None requires the Secure attribute (cross-site cookies must be encrypted)';
      suggestion = 'Add Secure attribute when SameSite is None';
      issues.push('SameSite=None without Secure flag');
    }

    results.sameSite = {
      isValid: validSameSite && !(isNone && !isSecure),
      pattern: SAMESITE_REGEX.toString(),
      value: attributes.sameSite,
      error,
      suggestion
    };
  } else {
    results.sameSite = {
      isValid: true,
      pattern: SAMESITE_REGEX.toString(),
      value: null,
      warning: 'SameSite is missing; default browser behavior varies'
    };
  }

  // Secure & HttpOnly flags
  results.secure = {
    isPresent: Boolean(attributes.secure),
    isValid: true
  };

  results.httpOnly = {
    isPresent: Boolean(attributes.httpOnly),
    isValid: true
  };

  // Cookie Prefixes (RFC 6265bis)
  // __Secure- prefix rules: Must include Secure flag
  // __Host- prefix rules: Must include Secure flag, MUST NOT include Domain, and Path MUST be /
  const prefixCheck = {
    hasPrefix: false,
    prefixType: null,
    isValid: true,
    violations: []
  };

  if (cookieName.startsWith('__Secure-')) {
    prefixCheck.hasPrefix = true;
    prefixCheck.prefixType = '__Secure-';
    if (!attributes.secure) {
      prefixCheck.isValid = false;
      prefixCheck.violations.push('Cookies with "__Secure-" prefix MUST have the Secure attribute.');
    }
  } else if (cookieName.startsWith('__Host-')) {
    prefixCheck.hasPrefix = true;
    prefixCheck.prefixType = '__Host-';
    if (!attributes.secure) {
      prefixCheck.isValid = false;
      prefixCheck.violations.push('Cookies with "__Host-" prefix MUST have the Secure attribute.');
    }
    if (attributes.domain) {
      prefixCheck.isValid = false;
      prefixCheck.violations.push('Cookies with "__Host-" prefix MUST NOT include a Domain attribute.');
    }
    if (attributes.path !== '/') {
      prefixCheck.isValid = false;
      prefixCheck.violations.push('Cookies with "__Host-" prefix MUST set Path=/ (current: ' + (attributes.path || 'none') + ').');
    }
  }

  results.prefixCheck = prefixCheck;

  return {
    attributes: results,
    isValid: issues.length === 0 && prefixCheck.isValid,
    issues
  };
}

module.exports = {
  HEADER_NAME_REGEX,
  HEADER_VALUE_SAFE_REGEX,
  CRLF_INJECTION_REGEX,
  NULL_BYTE_REGEX,
  COOKIE_NAME_REGEX,
  COOKIE_VALUE_UNQUOTED_REGEX,
  COOKIE_VALUE_QUOTED_REGEX,
  EXPIRES_DATE_REGEX,
  MAX_AGE_REGEX,
  DOMAIN_REGEX,
  PATH_REGEX,
  SAMESITE_REGEX,
  validateHeaderName,
  validateHeaderValue,
  validateCookieName,
  validateCookieValue,
  validateCookieAttributes
};
