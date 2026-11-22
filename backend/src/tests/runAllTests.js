/**
 * Comprehensive Test Suite for HTTP Header and Cookie Validation Platform
 * Tests: Regex Engine, DFA State Machine, Security Analyzer, and REST API Endpoints.
 */

const {
  validateHeaderName,
  validateHeaderValue,
  validateCookieName,
  validateCookieValue,
  validateCookieAttributes
} = require('../engine/regexValidator');

const {
  transition,
  simulateSequence,
  DFA_STATES,
  DFA_ALPHABET,
  getDfaDefinition
} = require('../engine/dfaStateMachine');

const { parseRawHeaders, parseSetCookieString } = require('../engine/headerParser');
const { analyzeSecurity } = require('../engine/securityAnalyzer');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
  }
}

console.log('========================================================');
console.log(' RUNNING VALIDATION ENGINE AUTOMATED TEST SUITE');
console.log('========================================================\n');

// ----------------------------------------------------
// TEST GROUP 1: REGULAR EXPRESSION VALIDATION ENGINE
// ----------------------------------------------------
console.log('[TEST GROUP 1] Regular Expression Engine Validation:');

// 1.1 Header Names
assert(validateHeaderName('Content-Type').isValid === true, 'Valid header name "Content-Type" accepted');
assert(validateHeaderName('X-Custom-Header_123').isValid === true, 'Valid custom header token accepted');
assert(validateHeaderName('User Agent').isValid === false, 'Header name with space rejected');
assert(validateHeaderName('Content:Type').isValid === false, 'Header name with colon rejected');
assert(validateHeaderName('').isValid === false, 'Empty header name rejected');
assert(validateHeaderName('Injected\r\nHeader').isValid === false, 'CRLF injection in header name rejected');

// 1.2 Header Values
assert(validateHeaderValue('application/json; charset=utf-8').isValid === true, 'Valid header value accepted');
assert(validateHeaderValue('Bearer eyJhbGciOi...').isValid === true, 'Valid authorization token header value accepted');
assert(validateHeaderValue('value\r\nInjected-Header: evil').isValid === false, 'CRLF injection in header value rejected');
assert(validateHeaderValue('value%0d%0aInjected: evil').isValid === false, 'URL-encoded CRLF in header value rejected');
assert(validateHeaderValue('test\x00null').isValid === false, 'Null byte in header value rejected');

// 1.3 Cookie Names
assert(validateCookieName('session_id').isValid === true, 'Valid cookie name "session_id" accepted');
assert(validateCookieName('authToken123').isValid === true, 'Valid cookie name "authToken123" accepted');
assert(validateCookieName('bad cookie').isValid === false, 'Cookie name with space rejected');
assert(validateCookieName('bad=cookie').isValid === false, 'Cookie name with equals rejected');
assert(validateCookieName('bad;cookie').isValid === false, 'Cookie name with semicolon rejected');

// 1.4 Cookie Values
assert(validateCookieValue('xyz123ABC-._~').isValid === true, 'Valid cookie octets accepted');
assert(validateCookieValue('"quoted value with spaces"').isValid === true, 'Valid quoted cookie value accepted');
assert(validateCookieValue('unquoted with spaces').isValid === false, 'Unquoted cookie value with spaces rejected');
assert(validateCookieValue('val\r\nbreak').isValid === false, 'CRLF in cookie value rejected');

// 1.5 Cookie Attributes
const validAttrs = validateCookieAttributes({
  expires: 'Wed, 09 Jun 2027 10:18:14 GMT',
  maxAge: '3600',
  domain: 'example.com',
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'Strict'
}, 'session_id');
assert(validAttrs.isValid === true, 'Fully valid cookie attributes accepted');

const badExpires = validateCookieAttributes({ expires: '2027-06-09' });
assert(badExpires.attributes.expires.isValid === false, 'Non-RFC 1123 expires date rejected');

const badMaxAge = validateCookieAttributes({ maxAge: 'not-a-number' });
assert(badMaxAge.attributes.maxAge.isValid === false, 'Non-integer Max-Age rejected');

const badSameSiteNoneInsecure = validateCookieAttributes({ sameSite: 'None', secure: false });
assert(badSameSiteNoneInsecure.attributes.sameSite.isValid === false, 'SameSite=None without Secure flag rejected');

// 1.6 Cookie Prefixes (RFC 6265bis)
const badSecurePrefix = validateCookieAttributes({ secure: false }, '__Secure-id');
assert(badSecurePrefix.isValid === false, '__Secure- prefix missing Secure flag rejected');

const validSecurePrefix = validateCookieAttributes({ secure: true }, '__Secure-id');
assert(validSecurePrefix.isValid === true, '__Secure- prefix with Secure flag accepted');

const badHostPrefixDomain = validateCookieAttributes({ secure: true, domain: 'example.com', path: '/' }, '__Host-id');
assert(badHostPrefixDomain.isValid === false, '__Host- prefix with Domain rejected');

const badHostPrefixPath = validateCookieAttributes({ secure: true, path: '/api' }, '__Host-id');
assert(badHostPrefixPath.isValid === false, '__Host- prefix with non-root Path rejected');

const validHostPrefix = validateCookieAttributes({ secure: true, path: '/' }, '__Host-id');
assert(validHostPrefix.isValid === true, '__Host- prefix with Secure, Path=/, and no Domain accepted');

// ----------------------------------------------------
// TEST GROUP 2: DETERMINISTIC FINITE AUTOMATON (DFA)
// ----------------------------------------------------
console.log('\n[TEST GROUP 2] Deterministic Finite Automaton (DFA) Engine:');

// 2.1 Valid State Transitions
const t1 = transition(DFA_STATES.START, DFA_ALPHABET.CREATE);
assert(t1.success === true && t1.toState === DFA_STATES.ISSUED, 'δ(START, CREATE) → ISSUED');

const t2 = transition(DFA_STATES.ISSUED, DFA_ALPHABET.ACTIVATE);
assert(t2.success === true && t2.toState === DFA_STATES.ACTIVE, 'δ(ISSUED, ACTIVATE) → ACTIVE');

const t3 = transition(DFA_STATES.ACTIVE, DFA_ALPHABET.EXPIRE);
assert(t3.success === true && t3.toState === DFA_STATES.EXPIRED, 'δ(ACTIVE, EXPIRE) → EXPIRED');

const t4 = transition(DFA_STATES.ACTIVE, DFA_ALPHABET.REVOKE);
assert(t4.success === true && t4.toState === DFA_STATES.REVOKED, 'δ(ACTIVE, REVOKE) → REVOKED');

const t5 = transition(DFA_STATES.ISSUED, DFA_ALPHABET.REVOKE);
assert(t5.success === true && t5.toState === DFA_STATES.REVOKED, 'δ(ISSUED, REVOKE) → REVOKED');

// 2.2 Invalid / Rejected State Transitions (Negative Testing)
const rej1 = transition(DFA_STATES.EXPIRED, DFA_ALPHABET.ACTIVATE);
assert(rej1.success === false && rej1.toState === DFA_STATES.EXPIRED, 'δ(EXPIRED, ACTIVATE) → REJECTED (Trap State)');

const rej2 = transition(DFA_STATES.REVOKED, DFA_ALPHABET.ACTIVATE);
assert(rej2.success === false && rej2.toState === DFA_STATES.REVOKED, 'δ(REVOKED, ACTIVATE) → REJECTED (Revoked Cannot Reactivate)');

const rej3 = transition(DFA_STATES.START, DFA_ALPHABET.ACTIVATE);
assert(rej3.success === false, 'δ(START, ACTIVATE) → REJECTED (Uncreated cookie cannot activate)');

const rej4 = transition(DFA_STATES.ISSUED, DFA_ALPHABET.EXPIRE);
assert(rej4.success === false, 'δ(ISSUED, EXPIRE) → REJECTED (Issued cookie must become Active first)');

// 2.3 DFA Simulation Sequences
const validSeq = simulateSequence(['CREATE', 'ACTIVATE', 'EXPIRE']);
assert(validSeq.isAccepted === true && validSeq.finalState === DFA_STATES.EXPIRED, 'DFA accepts valid sequence: CREATE → ACTIVATE → EXPIRE');

const invalidSeq = simulateSequence(['CREATE', 'EXPIRE']);
assert(invalidSeq.isAccepted === false && invalidSeq.haltedAt === 1, 'DFA rejects invalid sequence: CREATE → EXPIRE');

const dfaDef = getDfaDefinition();
assert(dfaDef.formalDefinition.Q.length === 5, 'DFA 5-tuple has 5 states in Q');
assert(dfaDef.matrix.length === 5, 'DFA transition matrix has 5 state rows');

// ----------------------------------------------------
// TEST GROUP 3: HEADER PARSER & SECURITY ANALYZER
// ----------------------------------------------------
console.log('\n[TEST GROUP 3] HTTP Header Parser & Security Analysis:');

const rawHeaderSample = [
  'Host: example.com',
  'User-Agent: Mozilla/5.0',
  'Authorization: Bearer token123',
  'Invalid-Header-No-Colon',
  'Injected-Header: value%0d%0aSet-Cookie: malicious=true',
  'Set-Cookie: session_id=12345; Secure; SameSite=Strict'
].join('\n');

const parsed = parseRawHeaders(rawHeaderSample);
assert(parsed.totalCount === 6, 'Parsed 6 header lines');
assert(parsed.validCount === 4, 'Identified 4 valid headers');
assert(parsed.invalidCount === 2, 'Identified 2 invalid headers (missing colon & CRLF injection)');

const cookieParsed = parseSetCookieString('session_id=abc123xyz; Path=/; Domain=example.com; Secure; HttpOnly; SameSite=Strict');
assert(cookieParsed.name === 'session_id', 'Parsed cookie name correctly');
assert(cookieParsed.attributes.secure === true, 'Parsed Secure flag');
assert(cookieParsed.attributes.httpOnly === true, 'Parsed HttpOnly flag');
assert(cookieParsed.attributes.sameSite === 'Strict', 'Parsed SameSite attribute');

const secReport = analyzeSecurity(parsed.headers, [cookieParsed]);
assert(secReport.totalFindings > 0, 'Security findings generated');
assert(secReport.findings.some(f => f.severity === 'CRITICAL'), 'CRLF attack correctly flagged as CRITICAL severity');

// ----------------------------------------------------
// TEST SUMMARY
// ----------------------------------------------------
console.log('\n========================================================');
console.log(` TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('========================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED WITH 100% SUCCESS RATE!\n');
}
