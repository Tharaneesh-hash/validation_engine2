/**
 * HTTP Header Parsing & Inspection Engine
 * Parses raw HTTP header strings or key-value pairs according to RFC 7230/9110.
 */

const { validateHeaderName, validateHeaderValue, CRLF_INJECTION_REGEX, NULL_BYTE_REGEX } = require('./regexValidator');

/**
 * Parses a raw multiline HTTP headers string into structured header tokens.
 * @param {string} rawText - Multiline string of HTTP headers
 * @returns {Object} Inspection result with parsed, valid, and invalid headers
 */
function parseRawHeaders(rawText = '') {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return {
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      headers: [],
      validHeaders: [],
      invalidHeaders: [],
      rawText: '',
      detectedIssues: ['No header data provided to inspect.']
    };
  }

  // Normalize line endings (\r\n -> \n)
  const lines = rawText.split(/\r?\n/);
  const parsedHeaders = [];
  const globalIssues = [];
  const headerNameOccurrences = {};

  let lineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    lineNumber++;

    // Skip empty trailing lines
    if (rawLine.trim().length === 0) {
      continue;
    }

    // Check for HTTP Request/Status line (e.g. GET / HTTP/1.1 or HTTP/1.1 200 OK)
    if (/^(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\s+\S+\s+HTTP\/\d\.\d$/i.test(rawLine.trim())) {
      parsedHeaders.push({
        lineNumber,
        raw: rawLine,
        isControlLine: true,
        type: 'REQUEST_LINE',
        name: 'Request-Line',
        value: rawLine.trim(),
        isValid: true,
        issues: [],
        suggestions: []
      });
      continue;
    }

    if (/^HTTP\/\d\.\d\s+\d{3}(?:\s+.*)?$/i.test(rawLine.trim())) {
      parsedHeaders.push({
        lineNumber,
        raw: rawLine,
        isControlLine: true,
        type: 'STATUS_LINE',
        name: 'Status-Line',
        value: rawLine.trim(),
        isValid: true,
        issues: [],
        suggestions: []
      });
      continue;
    }

    // RFC 7230 §3.2.4: A field line must NOT start with whitespace (obs-fold is deprecated)
    if (/^[ \t]/.test(rawLine)) {
      parsedHeaders.push({
        lineNumber,
        raw: rawLine,
        name: '(malformed-leading-whitespace)',
        value: rawLine.trim(),
        isValid: false,
        issues: ['Obsolete line folding (obs-fold) / leading whitespace detected at start of header line (RFC 7230 §3.2.4 violation).'],
        suggestions: ['Remove leading tab or space from header line.'],
        nameValidation: { isValid: false, error: 'Illegal leading whitespace' },
        valueValidation: { isValid: false, error: 'Malformed continuation line' }
      });
      continue;
    }

    // Find first colon
    const colonIndex = rawLine.indexOf(':');

    if (colonIndex === -1) {
      // Malformed header without colon
      parsedHeaders.push({
        lineNumber,
        raw: rawLine,
        name: rawLine.trim(),
        value: '',
        isValid: false,
        issues: ['Missing colon delimiter ":" separating field name and field value.'],
        suggestions: ['Format as "Header-Name: Header-Value" (e.g., Content-Type: application/json)'],
        nameValidation: { isValid: false, error: 'No colon delimiter found' },
        valueValidation: { isValid: false, error: 'Missing value' }
      });
      continue;
    }

    const rawName = rawLine.substring(0, colonIndex);
    const rawValue = rawLine.substring(colonIndex + 1);

    // Validate Name
    const nameVal = validateHeaderName(rawName);

    // Validate Value (trim leading OWS)
    const trimmedValue = rawValue.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
    const valueVal = validateHeaderValue(trimmedValue);

    const issues = [];
    const suggestions = [];

    if (!nameVal.isValid) {
      issues.push(`Header name error: ${nameVal.error}`);
      if (nameVal.suggestion) suggestions.push(nameVal.suggestion);
    }

    if (!valueVal.isValid) {
      issues.push(`Header value error: ${valueVal.error}`);
      if (valueVal.suggestion) suggestions.push(valueVal.suggestion);
    }

    // Check for CRLF injection specifically in rawLine
    if (CRLF_INJECTION_REGEX.test(rawLine)) {
      issues.push('CRLF sequence / HTTP response splitting attack vector detected.');
      suggestions.push('Eliminate carriage return and line feed control characters.');
    }

    // Track duplicate headers
    const lowerName = rawName.trim().toLowerCase();
    headerNameOccurrences[lowerName] = (headerNameOccurrences[lowerName] || 0) + 1;
    if (headerNameOccurrences[lowerName] > 1) {
      if (['host', 'content-length', 'transfer-encoding'].includes(lowerName)) {
        issues.push(`Duplicate critical header "${rawName.trim()}". Multiple occurrences can trigger HTTP Request Smuggling.`);
        suggestions.push(`Ensure only one single "${rawName.trim()}" header is sent.`);
      }
    }

    const isValid = issues.length === 0;

    parsedHeaders.push({
      lineNumber,
      raw: rawLine,
      name: rawName.trim(),
      value: trimmedValue,
      rawValue,
      isValid,
      issues,
      suggestions,
      nameValidation: nameVal,
      valueValidation: valueVal,
      isCookieHeader: ['cookie', 'set-cookie'].includes(lowerName)
    });
  }

  const validHeaders = parsedHeaders.filter((h) => h.isValid && !h.isControlLine);
  const invalidHeaders = parsedHeaders.filter((h) => !h.isValid);

  return {
    totalCount: parsedHeaders.length,
    validCount: validHeaders.length,
    invalidCount: invalidHeaders.length,
    headers: parsedHeaders,
    validHeaders,
    invalidHeaders,
    rawText,
    detectedIssues: globalIssues
  };
}

/**
 * Parses a Set-Cookie header value into its name, value, and attributes
 * Format: name=value; Path=/; Domain=...; Secure; HttpOnly; SameSite=Strict
 */
function parseSetCookieString(cookieString = '') {
  if (typeof cookieString !== 'string' || cookieString.trim().length === 0) {
    return null;
  }

  // Split on semicolons
  const parts = cookieString.split(';').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  // The first part is the cookie pair: name=value
  const firstPart = parts[0];
  const eqIdx = firstPart.indexOf('=');

  let name = '';
  let value = '';

  if (eqIdx === -1) {
    name = firstPart;
    value = '';
  } else {
    name = firstPart.substring(0, eqIdx);
    value = firstPart.substring(eqIdx + 1);
  }

  const attributes = {
    expires: null,
    maxAge: null,
    domain: null,
    path: null,
    secure: false,
    httpOnly: false,
    sameSite: null
  };

  const rawAttributes = [];

  for (let i = 1; i < parts.length; i++) {
    const attrPart = parts[i];
    rawAttributes.push(attrPart);
    const attrEq = attrPart.indexOf('=');

    if (attrEq === -1) {
      const lower = attrPart.toLowerCase();
      if (lower === 'secure') attributes.secure = true;
      else if (lower === 'httponly') attributes.httpOnly = true;
    } else {
      const attrKey = attrPart.substring(0, attrEq).trim().toLowerCase();
      const attrVal = attrPart.substring(attrEq + 1).trim();

      if (attrKey === 'expires') attributes.expires = attrVal;
      else if (attrKey === 'max-age') attributes.maxAge = attrVal;
      else if (attrKey === 'domain') attributes.domain = attrVal;
      else if (attrKey === 'path') attributes.path = attrVal;
      else if (attrKey === 'samesite') attributes.sameSite = attrVal;
    }
  }

  return {
    rawCookie: cookieString,
    name,
    value,
    attributes,
    rawAttributes
  };
}

module.exports = {
  parseRawHeaders,
  parseSetCookieString
};
