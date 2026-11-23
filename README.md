# HTTP Header and Cookie Validation Platform
**Web Form Input Validation Engine Using Regular Expressions and Deterministic Finite Automata (DFA)**

[![CI Tests](https://img.shields.io/badge/tests-51%2F51%20passing-10b981.svg)](#automated-testing)
[![API Tests](https://img.shields.io/badge/api%20tests-17%2F17%20passing-10b981.svg)](#rest-api-documentation)
[![RFC Compliance](https://img.shields.io/badge/RFC-7230%20%7C%209110%20%7C%206265-06b6d4.svg)](#regular-expression-validation-engine)
[![Theoretical CS](https://img.shields.io/badge/DFA-5--tuple%20automaton-8b5cf6.svg)](#deterministic-finite-automaton-dfa-state-machine)
[![Security Standards](https://img.shields.io/badge/CWE-113%20%7C%201004%20%7C%20614%20%7C%201275-rose.svg)](#cybersecurity-vulnerability-matrix)

---

## Executive Overview
The **HTTP Header and Cookie Validation Platform** is a full-stack cybersecurity and theoretical computer science application designed to inspect, parse, and validate HTTP request and response headers exchanged between web clients and backend services. 

The platform leverages:
1. **Regular Expressions (Regex)** strictly aligned with **RFC 7230**, **RFC 9110**, and **RFC 6265/6265bis** to validate header names, header values, cookie tokens, attribute formats, and special security prefixes (`__Secure-` and `__Host-`).
2. **Deterministic Finite Automata (DFA)** to formally govern session cookie state transitions (`START`, `ISSUED`, `ACTIVE`, `EXPIRED`, `REVOKED`), preventing session resurrection and replay attacks through terminal trap states.
3. **Cybersecurity Risk Engine** to detect and report vulnerabilities including HTTP Response Splitting / CRLF Injection (CWE-113), missing `HttpOnly` (CWE-1004), missing `Secure` flags (CWE-614), and unsafe `SameSite` configurations (CWE-1275).
4. **MongoDB Atlas Database** for persistent storage of audit trails, header inspection logs, cookie records, and DFA transition histories.

---

## 1. Theoretical Computer Science Foundations

### Deterministic Finite Automaton (DFA) Model
Session cookie lifecycles are modeled as a formal 5-tuple:
$$\mathcal{M} = (Q, \Sigma, \delta, q_0, F)$$

Where:
- **$Q$ (Finite Set of States)**:
  $$Q = \{\text{START}, \text{ISSUED}, \text{ACTIVE}, \text{EXPIRED}, \text{REVOKED}\}$$
- **$\Sigma$ (Input Alphabet / Events)**:
  $$\Sigma = \{\text{CREATE}, \text{ACTIVATE}, \text{EXPIRE}, \text{REVOKE}\}$$
- **$q_0$ (Initial State)**:
  $$q_0 = \text{START}$$
- **$F$ (Set of Accepting States)**:
  $$F = \{\text{ISSUED}, \text{ACTIVE}, \text{EXPIRED}, \text{REVOKED}\}$$
- **$\delta$ (State Transition Function)**:
  $$\delta: Q \times \Sigma \to Q \cup \{\emptyset\}$$

#### Formal Transition Table $\delta(q, \sigma)$
| Current State ($q \in Q$) | `CREATE` | `ACTIVATE` | `EXPIRE` | `REVOKE` | Semantics |
|---|---|---|---|---|---|
| **`START`** | **`ISSUED`** (Accept) | $\emptyset$ (Reject) | $\emptyset$ (Reject) | $\emptyset$ (Reject) | Uninitialized pre-creation state |
| **`ISSUED`** | $\emptyset$ (Reject) | **`ACTIVE`** (Accept) | $\emptyset$ (Reject) | **`REVOKED`** (Accept) | Minted by server; awaiting activation or early revocation |
| **`ACTIVE`** | $\emptyset$ (Reject) | $\emptyset$ (Reject) | **`EXPIRED`** (Accept) | **`REVOKED`** (Accept) | Valid active authenticated session |
| **`EXPIRED`** *(Trap State)* | $\emptyset$ (Reject) | $\emptyset$ (Reject) | $\emptyset$ (Reject) | $\emptyset$ (Reject) | Terminal trap state: Expired cookies cannot be resurrected |
| **`REVOKED`** *(Trap State)* | $\emptyset$ (Reject) | $\emptyset$ (Reject) | $\emptyset$ (Reject) | $\emptyset$ (Reject) | Terminal trap state: Replay prevention |

#### State Diagram Representation
```
           CREATE              ACTIVATE
 [START] ----------> [ISSUED] ----------> [ACTIVE]
                       |                     |   \
                       | REVOKE       EXPIRE |    \ REVOKE
                       |                     v     v
                       +---------------> [EXPIRED] [REVOKED]
                                         (Trap ∅)   (Trap ∅)
```

---

## 2. Regular Expression Validation Engine

### RFC 7230 / 9110 HTTP Header Token Rules
According to RFC 7230 Section 3.2, a header field name is a `token`:
```
token = 1*tchar
tchar = "!" / "#" / "$" / "%" / "&" / "'" / "*" / "+" / "-" / "." /
        "^" / "_" / "`" / "|" / "~" / DIGIT / ALPHA
```
- **Header Name Pattern**: `^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$`
- **Header Value Pattern**: `^[\t\x20-\x7E\x80-\xFF]*$` (disallows unescaped control characters)
- **CRLF Injection Detection**: `[\r\n]|%0[dDaA]` (CWE-113 detection)
- **Null Byte Interaction**: `\x00|%00` (CWE-626 detection)

### RFC 6265 Cookie Specification
- **Cookie Name**: `^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$`
- **Cookie Value (Unquoted)**: `^[a-zA-Z0-9!#$%&'()*+\-./:<=>?@\[\]^_`{|}~]*$`
- **Cookie Value (Quoted)**: `^"[\t\x20-\x21\x23-\x3A\x3C-\x7E]*"$`
- **Expires Attribute (RFC 1123)**:
  `^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}\s\d{2}:\d{2}:\d{2}\sGMT$`
- **Max-Age Attribute**: `^-?\d+$` (warns if $> 31,536,000$ seconds / 1 year)
- **Domain Attribute**: `^\.?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost$`
- **Path Attribute**: `^\/[^\x00-\x1F\x7F;]*$`
- **SameSite Attribute**: `^(?:Strict|Lax|None)$` *(Case-insensitive; `SameSite=None` mandates the `Secure` flag)*

### RFC 6265bis Cookie Prefixes
1. `__Secure-` prefix: Must have the `Secure` attribute.
2. `__Host-` prefix: Must have the `Secure` attribute, MUST NOT contain a `Domain` attribute, and MUST specify `Path=/`.

---

## 3. Cybersecurity Vulnerability Matrix

| Vulnerability | Category | CWE ID | Severity | Threat Impact & Mitigation |
|---|---|---|---|---|
| **CRLF Injection / Splitting** | Injection | CWE-113 | **CRITICAL** | Attacker injects `\r\n` or `%0d%0a` to split HTTP response, inject malicious cookies, or deliver XSS payloads. Strips control characters. |
| **Missing `HttpOnly` Flag** | Cookie Security | CWE-1004 | **HIGH** | JavaScript (`document.cookie`) can read session tokens during XSS attacks. Must append `HttpOnly`. |
| **Missing `Secure` Flag** | Cookie Security | CWE-614 | **HIGH** | Cookie transmitted over plain HTTP in plaintext, exposing it to MitM eavesdropping. Must append `Secure`. |
| **`SameSite=None` without Secure** | Cookie Security | CWE-1275 | **HIGH** | Modern browsers drop `SameSite=None` cookies lacking `Secure`. Leaves application open to CSRF. |
| **`__Host-` Prefix Violation** | RFC Compliance | CWE-1275 | **HIGH** | Scope expansion or domain-wide cookie leakage if Domain is specified or Path is not `/`. |
| **Missing `Strict-Transport-Security`** | Transport | CWE-319 | **MEDIUM** | Allows SSL-stripping attacks. Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`. |
| **Missing `Content-Security-Policy`** | Client Defense | CWE-1021 | **MEDIUM** | Lack of origin execution boundaries for scripts and frames. Add robust CSP. |
| **Missing `X-Frame-Options`** | Clickjacking | CWE-1021 | **MEDIUM** | Vulnerable to UI redressing / clickjacking within malicious iframes. Set `DENY` or `SAMEORIGIN`. |
| **Missing `X-Content-Type-Options`** | MIME Sniffing | CWE-79 | **LOW** | Prevents browsers from sniffing executable MIME types from images/text. Set `nosniff`. |
| **Server / X-Powered-By Banner Leak** | Information Leak | CWE-200 | **LOW** | Leaks infrastructure software stack and version numbers to reconnaissance scanners. |

---

## 4. Technology Stack

- **Frontend**: React.js 18, HTML5, CSS3, JavaScript (ES6+), Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js v20+, Express.js 4, REST API Architecture
- **Database**: MongoDB Atlas (with Mongoose ORM and graceful embedded memory fallback)
- **Deployment**: Vercel (Frontend), Render (Backend), MongoDB Atlas (Cloud Database)

---

## 5. System Architecture & Project Structure

```
Validation_engine_cookie/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB Atlas connector & latency ping diagnostics
│   │   ├── engine/
│   │   │   ├── regexValidator.js     # RFC 7230/9110 & RFC 6265 Regex validation engines
│   │   │   ├── dfaStateMachine.js    # Formal 5-tuple DFA implementation & sequence simulator
│   │   │   ├── headerParser.js       # Multiline HTTP header parser & token classifier
│   │   │   └── securityAnalyzer.js   # Vulnerability heuristics & severity scoring
│   │   ├── models/
│   │   │   ├── HeaderInspection.js   # Mongoose inspection schema
│   │   │   ├── CookieRecord.js       # Mongoose cookie state schema
│   │   │   ├── DfaTransitionLog.js   # Mongoose DFA transition audit log
│   │   │   └── dataStore.js          # Unified persistence layer with in-memory fallback
│   │   ├── routes/
│   │   │   ├── headerRoutes.js       # POST /api/headers/validate, GET /api/headers/history
│   │   │   ├── cookieRoutes.js       # POST /api/cookies/validate, PUT /api/cookies/:id/transition
│   │   │   ├── dfaRoutes.js          # GET /api/dfa/definition, POST /api/dfa/simulate
│   │   │   ├── dashboardRoutes.js    # GET /api/dashboard/stats, GET /api/dashboard/recent-activity
│   │   │   ├── securityRoutes.js     # POST /api/security/scan
│   │   │   └── healthRoutes.js       # GET /api/health, GET /api/db/status, POST /api/db/configure
│   │   ├── tests/
│   │   │   ├── runAllTests.js        # Unit test suite (Regex, DFA, Parser, Security)
│   │   │   ├── apiIntegration.test.js# Integration test suite (Live HTTP endpoints)
│   │   │   └── validateFrontendStructure.js # Component integrity validator
│   │   └── server.js                 # Express server bootstrap
│   ├── .env.example
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top navigation & live database status pill
│   │   │   ├── Sidebar.jsx           # 7-module sidebar navigation
│   │   │   ├── DatabaseStatusIndicator.jsx # Real-time Atlas ping indicator
│   │   │   ├── DfaVisualizer.jsx     # Interactive SVG DFA graph with active glow
│   │   │   ├── StateTransitionMatrix.jsx # Formal transition table with accepted/rejected marks
│   │   │   ├── PresetSelector.jsx    # Pre-loaded attack & compliance test suites
│   │   │   └── SecurityBadge.jsx     # Color-coded severity indicators
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx         # KPI cards, DFA preview, telemetry charts
│   │   │   ├── HeaderInspector.jsx   # Multiline raw parser, valid/invalid breakdown
│   │   │   ├── CookieValidator.jsx   # Set-Cookie attribute builder & prefix validator
│   │   │   ├── DfaStateMachine.jsx   # State controller, step trigger, trace simulator
│   │   │   ├── SecurityAnalysis.jsx  # Deep vulnerability auditor & remediation snippets
│   │   │   ├── ValidationHistory.jsx # MongoDB audit records, search, filter, export
│   │   │   └── Settings.jsx          # Live DB config, REST API console, deployment guide
│   │   ├── services/
│   │   │   └── api.js                # Frontend REST API client
│   │   ├── App.jsx                   # Central layout router
│   │   ├── main.jsx                  # React DOM mount point
│   │   └── index.css                 # Cyber-themed styling & glow animations
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
├── render.yaml                       # Render backend deployment configuration
├── vercel.json                       # Vercel frontend deployment configuration
├── package.json                      # Root workspace scripts
└── README.md
```

---

## 6. REST API Documentation

### Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Production health check & memory diagnostics | `200` |
| `GET` | `/api/db/status` | Live MongoDB Atlas connection state & ping latency | `200` |
| `POST` | `/api/db/configure` | Dynamically update MongoDB Atlas URI and reconnect | `200`, `400` |
| `POST` | `/api/headers/validate` | Inspect raw HTTP headers with Regex & Security analyzer | `200`, `400`, `500` |
| `GET` | `/api/headers/history` | Retrieve inspection history records | `200` |
| `GET` | `/api/headers/history/:id` | Retrieve single inspection record | `200`, `404` |
| `DELETE` | `/api/headers/history/:id` | Delete inspection record from MongoDB | `200`, `404` |
| `POST` | `/api/cookies/validate` | Validate cookie format, attributes, and prefixes | `200`, `400` |
| `POST` | `/api/cookies/create` | Mint new cookie in MongoDB & execute DFA `START → ISSUED` | `201`, `400` |
| `PUT` | `/api/cookies/:id/transition` | Execute DFA transition `δ(q, σ)` (Rejects illegal transitions) | `200`, `404`, `422` |
| `GET` | `/api/cookies` | List tracked cookies with current DFA states | `200` |
| `GET` | `/api/cookies/:id` | Get single cookie with its transition history | `200`, `404` |
| `DELETE` | `/api/cookies/:id` | Delete cookie from database | `200`, `404` |
| `GET` | `/api/dfa/definition` | Get formal 5-tuple, state metadata, and matrix | `200` |
| `POST` | `/api/dfa/simulate` | Simulate string sequence on DFA and return step trace | `200`, `400` |
| `GET` | `/api/dfa/logs` | Audit log of all DFA transition attempts | `200` |
| `POST` | `/api/security/scan` | Execute standalone vulnerability scanner | `200` |
| `GET` | `/api/dashboard/stats` | Telemetry statistics for dashboard counters & charts | `200` |

---

## 7. Installation & Local Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- MongoDB Atlas account (or local MongoDB instance)

### Step 1: Clone Repository
```bash
git clone https://github.com/validation-engine/validation-engine-cookie.git
cd validation-engine-cookie
```

### Step 2: Install Backend Dependencies
```bash
npm install --prefix backend
```

### Step 3: Configure Environment Variables
Create `backend/.env` based on `backend/.env.example`:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/validation_engine?retryWrites=true&w=majority
ALLOWED_ORIGIN=*
```
*(Note: If no Atlas URI is provided initially, the backend operates in In-Memory Persistence mode so testing works immediately without crashing).*

### Step 4: Install Frontend Dependencies
```bash
npm install --prefix frontend
```

### Step 5: Start the Platform
To run both backend and frontend:
```bash
# Terminal 1: Start Backend Server (Port 5000)
npm run server

# Terminal 2: Start Frontend Application (Port 3000)
npm run client
```

Open your browser at `http://localhost:3000`.

---

## 8. Automated Testing

The platform features an automated test harness covering the Regex engine, DFA state transitions, security heuristics, and REST APIs.

### Run Unit Tests
```bash
node backend/src/tests/runAllTests.js
```
**Results: 51 / 51 Passed (100% Success Rate)**
- Header Name Token Regex: Valid names, spaces rejected, empty rejected, CRLF rejected.
- Header Value Regex: Printable ASCII accepted, CRLF splitting rejected, null bytes rejected.
- Cookie Name Regex: Token characters accepted, whitespace and separators rejected.
- Cookie Value Regex: RFC cookie-octets accepted, quoted strings accepted, control chars rejected.
- Attributes: RFC 1123 date matching, integer Max-Age, Domain matching, SameSite=None requirements.
- Prefixes: `__Secure-` flag rules, `__Host-` domain and path `/` rules.
- DFA Transitions: Valid paths ($\text{START}\to\text{ISSUED}\to\text{ACTIVE}\to\text{EXPIRED}$), rejected illegal actions, trap state immutability.
- Header Parser: Line folding detection, missing colon separators, cookie extraction.
- Security Analyzer: CRLF Critical severity flag, HttpOnly/Secure High severity flags.

### Run REST API Integration Tests
```bash
node backend/src/tests/apiIntegration.test.js
```
**Results: 17 / 17 Passed (100% Success Rate)**
- Health check `200 OK`.
- Database status reporting.
- DFA definition matrix.
- Header validation and persistence.
- Cookie creation enters state `ISSUED`.
- Transition `δ(ISSUED, ACTIVATE) → ACTIVE` accepted (200).
- Transition `δ(ACTIVE, ACTIVATE)` rejected (422 Unprocessable Entity).
- Transition `δ(ACTIVE, EXPIRE) → EXPIRED` accepted (200).
- Transition `δ(EXPIRED, REVOKE)` rejected as terminal trap state (422).
- Sequence simulator accepts valid strings and halts on invalid inputs.

---

## 9. Deployment Instructions

### Deploy Frontend on Vercel
1. Push repository to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select this repository.
4. Keep **Root Directory** at the repository root; the root `vercel.json` builds `client`.
5. Add the `VITE_API_URL` environment variable with the Render backend URL ending in `/api` (for example, `https://<render-service>.onrender.com/api`).
6. Click **Deploy**.

### Deploy Backend on Render
1. Log in to [Render](https://render.com) and create a **"New Web Service"**.
2. Connect your GitHub repository.
3. Use the settings in `render.yaml` (Oregon, Free plan, and `backend` as the root directory).
4. Add `MONGODB_URI` in Render's environment settings using your Atlas connection string; keep it out of the repository.
5. Leave `NODE_ENV` set to `production` as configured.
6. Click **Create Web Service**.
7. After deployment, set Vercel's `VITE_API_URL` to the Render service URL with `/api` appended, then redeploy the frontend.

### Configure MongoDB Atlas Database
1. Create a free M0 cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with read/write permissions to `validation_engine`.
3. Under **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) to permit Render/Vercel connections.
4. Click **Connect** → **Drivers (Node.js)** to copy the connection string.
5. Paste it in your Render environment variables or into the **Settings** page within the application UI!

---

## 10. License
This project is licensed under the MIT License.
