import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Trash2,
  Download,
  Eye,
  RefreshCw,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  X
} from 'lucide-react';
import api from '../services/api';
import SecurityBadge from '../components/SecurityBadge';

export default function ValidationHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getHeaderHistory(50, 0);
      if (res.success) {
        setRecords(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this inspection record from MongoDB?')) return;

    try {
      setDeletingId(id);
      await api.deleteHeaderInspection(id);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      if (selectedRecord?._id === id) {
        setSelectedRecord(null);
      }
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `validation_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Total', 'Valid', 'Invalid', 'SecurityScore', 'Posture'];
    const rows = records.map((r) => [
      r._id,
      new Date(r.createdAt || Date.now()).toISOString(),
      r.totalCount,
      r.validCount,
      r.invalidCount,
      r.securityReport?.securityScore ?? 100,
      r.securityReport?.posture ?? 'SECURE'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `validation_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r._id?.toLowerCase().includes(term) ||
      r.rawText?.toLowerCase().includes(term) ||
      r.source?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Validation History & MongoDB Audit Log
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full audit persistence stored in MongoDB Atlas, with timestamped records, raw payloads, and security telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1527] hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1527] hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </button>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Search Input */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search records by ID, header token, or payload contents..."
          className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Records Table */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[#0e172a] text-slate-300 border-b border-slate-800">
                <th className="p-3.5 font-semibold">Record ID</th>
                <th className="p-3.5 font-semibold">Timestamp</th>
                <th className="p-3.5 font-semibold">Source</th>
                <th className="p-3.5 font-semibold">Headers Count</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold">Security Posture</th>
                <th className="p-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec._id}
                    onClick={() => setSelectedRecord(rec)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 text-cyan-400 font-bold">
                      #{String(rec._id).substring(18)}
                    </td>
                    <td className="p-3.5 text-slate-300 font-sans">
                      {new Date(rec.createdAt || Date.now()).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                        {rec.source || 'raw_paste'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-200">
                      <span className="text-emerald-400 font-bold">{rec.validCount} valid</span>
                      <span className="text-slate-500"> / </span>
                      <span className="text-rose-400 font-bold">{rec.invalidCount} invalid</span>
                    </td>
                    <td className="p-3.5">
                      {rec.invalidCount === 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          100% VALID
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          MALFORMED
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <SecurityBadge
                        severity={
                          rec.securityReport?.counts?.CRITICAL > 0 ? 'CRITICAL' :
                          rec.securityReport?.counts?.HIGH > 0 ? 'HIGH' :
                          rec.securityReport?.counts?.MEDIUM > 0 ? 'MEDIUM' : 'SECURE'
                        }
                        size="xs"
                      />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(rec);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(rec._id, e)}
                          disabled={deletingId === rec._id}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete from MongoDB"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 text-xs">
                    {loading ? 'Loading validation history...' : 'No validation history records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspector Drawer Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-cyan-400" />
                  Inspection Record #{selectedRecord._id}
                </h3>
                <span className="text-xs text-slate-400 font-sans">
                  Recorded at {new Date(selectedRecord.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Raw Headers Text */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Raw Header Payload:</span>
              <pre className="p-3 rounded-lg bg-[#060a14] border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {selectedRecord.rawText}
              </pre>
            </div>

            {/* Valid vs Invalid Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                <span className="font-semibold block mb-1">Valid Headers ({selectedRecord.validCount}):</span>
                {selectedRecord.validHeaders && selectedRecord.validHeaders.length > 0 ? (
                  <div className="space-y-1 font-mono text-[11px]">
                    {selectedRecord.validHeaders.map((vh, i) => (
                      <div key={i} className="truncate">✓ {vh.name}: {vh.value}</div>
                    ))}
                  </div>
                ) : (
                  <span className="italic text-slate-400">None</span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300">
                <span className="font-semibold block mb-1">Malformed Headers ({selectedRecord.invalidCount}):</span>
                {selectedRecord.invalidHeaders && selectedRecord.invalidHeaders.length > 0 ? (
                  <div className="space-y-1 font-mono text-[11px]">
                    {selectedRecord.invalidHeaders.map((ih, i) => (
                      <div key={i} className="truncate">✗ {ih.name}: {ih.issues?.[0] || 'Invalid'}</div>
                    ))}
                  </div>
                ) : (
                  <span className="italic text-slate-400">None (All headers valid)</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
