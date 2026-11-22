import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Server, Zap } from 'lucide-react';
import api from '../services/api';

export default function DatabaseStatusIndicator({ onOpenSettings }) {
  const [dbState, setDbState] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getDbStatus();
      if (res.success) {
        setDbState(res.data);
      }
    } catch (err) {
      setDbState({
        status: 'error',
        connectionType: 'Disconnected',
        lastError: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const isConnected = dbState?.status === 'connected';
  const isAtlas = dbState?.isAtlas;
  const isInMemory = dbState?.connectionType?.includes('In-Memory');

  return (
    <div className="flex items-center gap-3">
      <div 
        onClick={onOpenSettings}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all duration-200 ${
          isConnected
            ? isAtlas
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/50'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:border-cyan-500/50'
            : isInMemory
            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:border-amber-500/50'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:border-rose-500/50'
        }`}
        title="Click to view database configuration and latency"
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isConnected ? (isAtlas ? 'bg-emerald-400' : 'bg-cyan-400') : isInMemory ? 'bg-amber-400' : 'bg-rose-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isConnected ? (isAtlas ? 'bg-emerald-500' : 'bg-cyan-500') : isInMemory ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
        </span>

        <Database className="w-3.5 h-3.5 opacity-80" />

        <div className="flex items-center gap-1.5">
          <span className="font-semibold">
            {isConnected
              ? isAtlas ? 'MongoDB Atlas' : 'Local MongoDB'
              : isInMemory ? 'Memory Fallback' : 'DB Disconnected'}
          </span>
          {dbState?.pingLatencyMs !== null && dbState?.pingLatencyMs !== undefined && (
            <span className="opacity-75 flex items-center text-[10px]">
              <Zap className="w-2.5 h-2.5 mr-0.5 text-amber-400" />
              {dbState.pingLatencyMs}ms
            </span>
          )}
        </div>
      </div>

      <button
        onClick={fetchStatus}
        disabled={loading}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        title="Refresh DB connection state"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
      </button>
    </div>
  );
}
