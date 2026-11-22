import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Terminal,
  ExternalLink,
  Code,
  Play,
  RotateCcw,
  Check,
  RefreshCw,
  Copy
} from 'lucide-react';
import api from '../services/api';

export default function Settings() {
  const [dbStatus, setDbStatus] = useState(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [newUri, setNewUri] = useState('');
  const [updatingUri, setUpdatingUri] = useState(false);
  const [uriFeedback, setUriFeedback] = useState(null);

  // API Tester State
  const [selectedEndpoint, setSelectedEndpoint] = useState('/api/health');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiRequestBody, setApiRequestBody] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [runningApi, setRunningApi] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const fetchDbDiagnostics = async () => {
    try {
      setLoadingDb(true);
      const res = await api.getDbStatus();
      if (res.success) {
        setDbStatus(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch DB status:', err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbDiagnostics();
  }, []);

  const handleUpdateUri = async () => {
    if (!newUri.trim()) {
      setUriFeedback({ success: false, error: 'Please enter a valid MongoDB connection string.' });
      return;
    }

    try {
      setUpdatingUri(true);
      setUriFeedback(null);
      const res = await api.configureDb(newUri);
      if (res.success) {
        setUriFeedback({ success: true, message: 'Successfully connected to MongoDB cluster!' });
        await fetchDbDiagnostics();
        setNewUri('');
      } else {
        setUriFeedback({ success: false, error: res.error || 'Connection failed' });
      }
    } catch (err) {
      setUriFeedback({ success: false, error: err.message });
    } finally {
      setUpdatingUri(false);
    }
  };

  const API_CATALOG = [
    { method: 'GET', path: '/api/health', desc: 'System health check & process telemetry' },
    { method: 'GET', path: '/api/db/status', desc: 'Live MongoDB Atlas connection status & metrics' },
    { method: 'GET', path: '/api/dfa/definition', desc: 'Formal DFA 5-tuple M = (Q, Σ, δ, q₀, F) & matrix' },
    {
      method: 'POST',
      path: '/api/headers/validate',
      desc: 'RFC 7230/9110 regex header parser & CRLF detector',
      body: JSON.stringify({
        rawHeaders: 'Host: api.example.com\nUser-Agent: Mozilla/5.0\nSet-Cookie: session_id=123; Secure; HttpOnly; SameSite=Strict'
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/api/cookies/validate',
      desc: 'RFC 6265 token & prefix regex validator',
      body: JSON.stringify({
        name: '__Host-session',
        value: 'secure_auth_token_99',
        attributes: { path: '/', secure: true, httpOnly: true, sameSite: 'Strict' }
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/api/cookies/create',
      desc: 'Create cookie in MongoDB and execute DFA START → ISSUED',
      body: JSON.stringify({
        name: 'client_session',
        value: 'xyz456auth',
        attributes: { path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }
      }, null, 2)
    },
    {
      method: 'POST',
      path: '/api/dfa/simulate',
      desc: 'Simulate theoretical input sequence trace on DFA',
      body: JSON.stringify({
        actions: ['CREATE', 'ACTIVATE', 'EXPIRE']
      }, null, 2)
    },
    { method: 'GET', path: '/api/dashboard/stats', desc: 'Aggregate platform metrics & security warnings' }
  ];

  const handleSelectEndpoint = (ep) => {
    setSelectedEndpoint(ep.path);
    setApiMethod(ep.method);
    setApiRequestBody(ep.body || '');
    setApiResponse(null);
  };

  const handleExecuteApi = async () => {
    try {
      setRunningApi(true);
      setApiResponse(null);

      const options = {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' }
      };

      if (apiMethod === 'POST' || apiMethod === 'PUT') {
        options.body = apiRequestBody || '{}';
      }

      const res = await fetch(selectedEndpoint, options);
      const data = await res.json().catch(() => null);

      setApiResponse({
        status: res.status,
        ok: res.ok,
        statusText: res.statusText,
        data
      });
    } catch (err) {
      setApiResponse({
        status: 0,
        ok: false,
        error: err.message
      });
    } finally {
      setRunningApi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          Platform Settings, Database Connection & REST API Docs
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Verify live MongoDB Atlas connectivity, test REST endpoints, and prepare for Vercel/Render deployment.
        </p>
      </div>

      {/* Database Connection Status Card */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              MongoDB Database Connectivity & Diagnostics
            </h3>
          </div>
          <button
            onClick={fetchDbDiagnostics}
            disabled={loadingDb}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh Diagnostics
          </button>
        </div>

        {/* Live Diagnostics Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#080d19] border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Connection Mode:</span>
            <span className={`text-xs font-bold font-mono mt-1 block ${
              dbStatus?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {dbStatus?.connectionType || 'In-Memory Engine'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#080d19] border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Cluster Host:</span>
            <span className="text-xs font-mono text-slate-200 truncate mt-1 block" title={dbStatus?.host || 'localhost'}>
              {dbStatus?.host || 'embedded-memory'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#080d19] border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Active Database:</span>
            <span className="text-xs font-mono text-cyan-300 mt-1 block">
              {dbStatus?.databaseName || 'validation_engine'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#080d19] border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Ping Latency:</span>
            <span className="text-xs font-mono text-amber-400 mt-1 flex items-center gap-1 font-bold">
              <Zap className="w-3.5 h-3.5" />
              {dbStatus?.pingLatencyMs !== null && dbStatus?.pingLatencyMs !== undefined
                ? `${dbStatus.pingLatencyMs} ms`
                : '1 ms (local)'}
            </span>
          </div>
        </div>

        {/* Dynamic MongoDB Atlas URI Connect Form */}
        <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800/80 space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Connect to Custom MongoDB Atlas URI
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newUri}
              onChange={(e) => setNewUri(e.target.value)}
              placeholder="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/validation_engine"
              className="flex-1 min-w-[280px] bg-[#060a14] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
            />
            <button
              onClick={handleUpdateUri}
              disabled={updatingUri}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shrink-0"
            >
              {updatingUri ? 'Testing Connection...' : 'Connect to Atlas'}
            </button>
          </div>

          {uriFeedback && (
            <div className={`p-2.5 rounded text-xs ${
              uriFeedback.success
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
            }`}>
              {uriFeedback.success ? uriFeedback.message : uriFeedback.error}
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            Enter your cloud MongoDB Atlas connection URI. The backend dynamically tests authentication and switches storage without server restarts.
          </p>
        </div>
      </div>

      {/* Interactive REST API Documentation & Live Tester */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Interactive REST API Documentation & Console
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Base URL: /api</span>
        </div>

        {/* Endpoint Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {API_CATALOG.map((ep) => (
            <button
              key={ep.path}
              onClick={() => handleSelectEndpoint(ep)}
              className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
                selectedEndpoint === ep.path
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'bg-[#080d19] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <span className={ep.method === 'GET' ? 'text-blue-400' : 'text-emerald-400'}>
                  {ep.method}
                </span>
                <span className="truncate">{ep.path}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-1 line-clamp-1">
                {ep.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Live Runner Console */}
        <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={`px-2 py-0.5 rounded font-bold ${
                apiMethod === 'GET' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}>
                {apiMethod}
              </span>
              <span className="text-white font-bold">{selectedEndpoint}</span>
            </div>

            <button
              onClick={handleExecuteApi}
              disabled={runningApi}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {runningApi ? 'Sending...' : 'Send Live Request'}
            </button>
          </div>

          {(apiMethod === 'POST' || apiMethod === 'PUT') && (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Request Body (JSON):</label>
              <textarea
                value={apiRequestBody}
                onChange={(e) => setApiRequestBody(e.target.value)}
                rows={4}
                className="w-full bg-[#060a14] border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none"
              />
            </div>
          )}

          {/* Response Output */}
          {apiResponse && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Response Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  apiResponse.ok ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                }`}>
                  {apiResponse.status} {apiResponse.statusText}
                </span>
              </div>
              <pre className="p-3 rounded bg-[#060a14] border border-slate-800 text-xs font-mono text-cyan-300 max-h-56 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(apiResponse.data || apiResponse.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Production Deployment Architecture Guide */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Cloud className="w-4 h-4 text-cyan-400" />
          Production Deployment Architecture (Vercel + Render + MongoDB Atlas)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-2">
            <span className="font-semibold text-cyan-300 block">1. Frontend on Vercel</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Vite + React single-page app deployed on Vercel. Set build command to <code className="text-slate-300">npm run build</code> and output directory to <code className="text-slate-300">dist</code>.
            </p>
            <div className="p-2 rounded bg-[#060a14] font-mono text-[10px] text-slate-300">
              vercel.json rewrite rules proxy /api/* to Render backend.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-2">
            <span className="font-semibold text-emerald-300 block">2. Backend on Render</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Express.js REST API service deployed on Render Web Service. Configure environment variables in dashboard:
            </p>
            <div className="p-2 rounded bg-[#060a14] font-mono text-[10px] text-slate-300">
              PORT=5000<br/>
              NODE_ENV=production<br/>
              MONGODB_URI=&lt;atlas_connection_string&gt;
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-2">
            <span className="font-semibold text-amber-300 block">3. MongoDB Atlas Database</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Free-tier or dedicated MongoDB cluster. Whitelist IP access (0.0.0.0/0 for serverless) and create database user.
            </p>
            <div className="p-2 rounded bg-[#060a14] font-mono text-[10px] text-slate-300 truncate">
              mongodb+srv://user:pass@cluster.mongodb.net
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
