/**
 * REST API Integration Test Suite
 * Tests actual HTTP calls against the Express application instance
 */

process.env.NODE_ENV = 'test';
const { app } = require('../server');
const http = require('http');

let server;
let baseUrl;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runApiTests() {
  console.log('========================================================');
  console.log(' RUNNING REST API INTEGRATION TESTS');
  console.log('========================================================\n');

  // Start temporary test server on random port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  let tests = 0;
  let passed = 0;

  function assert(cond, name, details = '') {
    tests++;
    if (cond) {
      passed++;
      console.log(`  ✓ API PASS: ${name}`);
    } else {
      console.error(`  ✗ API FAIL: ${name} - ${details}`);
    }
  }

  try {
    // 1. Health check
    const healthRes = await request('GET', '/api/health');
    assert(healthRes.status === 200 && healthRes.body.status === 'healthy', 'GET /api/health returns 200 healthy');

    // 2. DB Status
    const dbRes = await request('GET', '/api/db/status');
    assert(dbRes.status === 200 && dbRes.body.success === true, 'GET /api/db/status reports database status');

    // 3. DFA Definition
    const dfaDefRes = await request('GET', '/api/dfa/definition');
    assert(dffaDefOk = dfaDefRes.status === 200 && dfaDefRes.body.data.matrix.length === 5, 'GET /api/dfa/definition returns 5-state matrix');

    // 4. Header Validation API
    const headerValidateRes = await request('POST', '/api/headers/validate', {
      rawHeaders: 'Host: api.test.com\r\nAuthorization: Bearer secret-token\r\nMalformedHeaderLine\r\nSet-Cookie: session=123; Secure; HttpOnly; SameSite=Strict'
    });
    assert(headerValidateRes.status === 200, 'POST /api/headers/validate returns 200');
    assert(headerValidateRes.body.data.validCount === 3, 'POST /api/headers/validate identifies 3 valid headers');
    assert(headerValidateRes.body.data.invalidCount === 1, 'POST /api/headers/validate identifies 1 invalid header');

    // 5. Header History API
    const historyRes = await request('GET', '/api/headers/history');
    assert(historyRes.status === 200 && historyRes.body.data.length > 0, 'GET /api/headers/history returns recorded history');

    // 6. Cookie Validation API
    const cookieValRes = await request('POST', '/api/cookies/validate', {
      rawCookie: 'session_token=abcdef12345; Path=/; Secure; HttpOnly; SameSite=Strict'
    });
    assert(cookieValRes.status === 200 && cookieValRes.body.data.validation.isValid === true, 'POST /api/cookies/validate confirms valid cookie');

    // 7. Cookie Creation (DFA: START -> CREATE -> ISSUED)
    const cookieCreateRes = await request('POST', '/api/cookies/create', {
      name: 'auth_session_test',
      value: 'xyz789token',
      attributes: {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict'
      }
    });
    assert(cookieCreateRes.status === 201, 'POST /api/cookies/create returns 201');
    assert(cookieCreateRes.body.data.currentState === 'ISSUED', 'Created cookie enters DFA state "ISSUED"');
    const createdCookieId = cookieCreateRes.body.data._id;

    // 8. Cookie Transition Valid: ISSUED -> ACTIVATE -> ACTIVE
    const transActivateRes = await request('PUT', `/api/cookies/${createdCookieId}/transition`, {
      action: 'ACTIVATE'
    });
    assert(transActivateRes.status === 200 && transActivateRes.body.data.currentState === 'ACTIVE', 'PUT /api/cookies/:id/transition δ(ISSUED, ACTIVATE) -> ACTIVE');

    // 9. Cookie Transition Invalid / Rejected: ACTIVE -> ACTIVATE (Illegal!)
    const transIllegalRes = await request('PUT', `/api/cookies/${createdCookieId}/transition`, {
      action: 'ACTIVATE'
    });
    assert(transIllegalRes.status === 422, 'PUT /api/cookies/:id/transition δ(ACTIVE, ACTIVATE) rejected with 422');
    assert(transIllegalRes.body.isAccepted === false, 'Transition response marks isAccepted: false');

    // 10. Cookie Transition Valid: ACTIVE -> EXPIRE -> EXPIRED
    const transExpireRes = await request('PUT', `/api/cookies/${createdCookieId}/transition`, {
      action: 'EXPIRE'
    });
    assert(transExpireRes.status === 200 && transExpireRes.body.data.currentState === 'EXPIRED', 'PUT /api/cookies/:id/transition δ(ACTIVE, EXPIRE) -> EXPIRED');

    // 11. Cookie Transition Terminal Rejection: EXPIRED -> REVOKE (Terminal Trap State!)
    const transTrapRes = await request('PUT', `/api/cookies/${createdCookieId}/transition`, {
      action: 'REVOKE'
    });
    assert(transTrapRes.status === 422, 'PUT /api/cookies/:id/transition δ(EXPIRED, REVOKE) rejected as terminal trap state');

    // 12. DFA Simulation API
    const simRes = await request('POST', '/api/dfa/simulate', {
      actions: ['CREATE', 'ACTIVATE', 'REVOKE']
    });
    assert(simRes.status === 200 && simRes.body.data.isAccepted === true && simRes.body.data.finalState === 'REVOKED', 'POST /api/dfa/simulate simulates sequence successfully');

    // 13. Dashboard Stats API
    const statsRes = await request('GET', '/api/dashboard/stats');
    assert(statsRes.status === 200 && statsRes.body.data.totalHeaders > 0, 'GET /api/dashboard/stats returns populated statistics');

    console.log('\n========================================================');
    console.log(` API TEST SUMMARY: Total: ${tests} | Passed: ${passed} | Failed: ${tests - passed}`);
    console.log('========================================================\n');

  } catch (err) {
    console.error('API Test Error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runApiTests();
