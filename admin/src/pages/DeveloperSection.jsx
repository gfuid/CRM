import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Server,
  Database,
  Cpu,
  Activity,
  HardDrive,
  RefreshCw,
  Terminal,
  Zap,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Download,
  Trash2,
  Gauge,
  Wifi,
  Sparkles,
  BarChart2,
  FileText,
  Play,
  Pause,
  Box,
  TrendingUp,
} from 'lucide-react';

export default function DeveloperSection({ apiBase, getHeaders, showToast }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Auto-refresh controls
  const [refreshInterval, setRefreshInterval] = useState(5); // 0 (off), 3, 5, 10 seconds
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'database' | 'memory' | 'api'

  // Search & filter in User Consumption
  const [userSearch, setUserSearch] = useState('');
  const [expandedOwner, setExpandedOwner] = useState(null);
  const [savingLimitFor, setSavingLimitFor] = useState(null);

  // Live Ping state
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  // Sync / Reset action states
  const [syncingDb, setSyncingDb] = useState(false);
  const [clearingMetrics, setClearingMetrics] = useState(false);

  // Fetch telemetry from backend
  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const headers = getHeaders();
      const endpoints = [
        `${apiBase}/developer-metrics`,
        `${apiBase.includes('localhost') ? 'https://crm-ep4i.onrender.com/api/v1/admin' : 'http://localhost:5000/api/v1/admin'}/developer-metrics`,
      ];
      const failures = [];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, { headers });
          if (!res.ok) {
            failures.push(`${endpoint} returned HTTP ${res.status}`);
            continue;
          }

          const json = await res.json();
          if (json.success && json.data) {
            setMetrics(json.data);
            setError(null);
            setLastRefreshedAt(new Date());
            if (isManual) {
              showToast('Developer & infrastructure telemetry updated');
            }
            return;
          }
          failures.push(`${endpoint}: ${json.message || 'no telemetry data returned'}`);
        } catch (err) {
          failures.push(`${endpoint}: ${err.message}`);
        }
      }
      throw new Error(failures.join('; ') || 'Unable to connect to telemetry API');
    } catch (err) {
      console.warn('Developer metrics fetch warning:', err.message);
      setError(err.message);
      if (isManual) {
        showToast('Connecting to telemetry server...', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, []);

  // Polling loop for real-time observation
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      fetchMetrics(false);
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  // Ping test action
  const handleTestPing = async () => {
    setPingTesting(true);
    const start = performance.now();
    try {
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/health`, { headers });
      const roundtrip = Math.round(performance.now() - start);
      if (res.ok) {
        setPingResult({ success: true, ms: roundtrip, time: new Date().toLocaleTimeString() });
        showToast(`Backend Heartbeat: ${roundtrip}ms response time`);
      } else {
        setPingResult({ success: false, ms: roundtrip, time: new Date().toLocaleTimeString() });
        showToast(`Heartbeat returned HTTP ${res.status}`, 'error');
      }
    } catch (err) {
      setPingResult({ success: false, error: err.message, time: new Date().toLocaleTimeString() });
      showToast('Heartbeat failed: Backend offline or unreachable', 'error');
    } finally {
      setPingTesting(false);
    }
  };

  // Sync DB action
  const handleSyncDb = async () => {
    setSyncingDb(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/developer/sync-db`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Database snapshot synchronized!');
        fetchMetrics(false);
      } else {
        showToast(data.message || 'Database sync failed', 'error');
      }
    } catch (err) {
      showToast('Failed to trigger database sync: ' + err.message, 'error');
    } finally {
      setSyncingDb(false);
    }
  };

  // Set a company's storage limit (MB)
  const handleSetStorageLimit = async (owner) => {
    const input = window.prompt(`Storage limit for ${owner.companyName} (${owner.name}) in MB:`, String(owner.storageLimitMb || 50));
    if (input === null) return;
    const mb = Number(input);
    if (!Number.isFinite(mb) || mb < 1 || mb > 10240) {
      showToast('Enter a number between 1 and 10240 MB', 'error');
      return;
    }
    setSavingLimitFor(owner.id);
    try {
      const res = await fetch(`${apiBase}/users/${owner.id}/storage-limit`, {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_limit_mb: mb }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Storage limit set to ${mb} MB`);
        fetchMetrics(false);
      } else {
        showToast(data.message || 'Could not change the storage limit', 'error');
      }
    } catch (err) {
      showToast('Could not change the storage limit: ' + err.message, 'error');
    } finally {
      setSavingLimitFor(null);
    }
  };

  // Clear metrics action
  const handleClearMetrics = async () => {
    if (!window.confirm('Reset request counters and latency statistics back to 0?')) return;
    setClearingMetrics(true);
    try {
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/developer/clear-metrics`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        showToast('API metrics & latency history cleared');
        fetchMetrics(false);
      } else {
        showToast(data.message || 'Failed to clear metrics', 'error');
      }
    } catch (err) {
      showToast('Error resetting metrics: ' + err.message, 'error');
    } finally {
      setClearingMetrics(false);
    }
  };

  // Export JSON diagnostics report
  const handleExportDiagnostics = () => {
    if (!metrics) return;
    const report = {
      exportTimestamp: new Date().toISOString(),
      reportType: 'OneRoot CRM Infrastructure & Server Diagnostics',
      telemetry: metrics,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crm-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Diagnostics JSON report downloaded');
  };

  // Filtered User consumption
  const filteredUserFootprint = useMemo(() => {
    if (!metrics?.userResourceConsumption) return [];
    if (!userSearch.trim()) return metrics.userResourceConsumption;
    const q = userSearch.toLowerCase();
    return metrics.userResourceConsumption.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.companyName.toLowerCase().includes(q)
    );
  }, [metrics, userSearch]);

  if (loading && !metrics) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw size={32} className="animate-spin text-emerald-500" />
        <div className="text-sm font-semibold">Connecting to Server Runtime & MongoDB Atlas Telemetry...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="max-w-3xl mx-auto rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-900">Server metrics are unavailable</h2>
            <p className="mt-2 text-sm text-slate-700">
              The dashboard could not get data from the backend. No live values are available to show.
            </p>
            <p className="mt-2 text-xs font-mono text-slate-500">
              Primary API: {apiBase}/developer-metrics
            </p>
            {error && <p className="mt-1 break-all text-xs font-mono text-rose-700">{error}</p>}
            <button
              type="button"
              onClick={() => fetchMetrics(true)}
              disabled={refreshing}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Trying again…' : 'Retry connection'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { server, processMemory, systemMemory, database, apiPerformance } = metrics || {};
  const dbUsagePercent = parseFloat(database?.percentUsed || '0');
  const heapUsagePercent = parseFloat(processMemory?.heapUsagePercent || '0');
  const osUsagePercent = parseFloat(systemMemory?.usagePercent || '0');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. TOP HERO / STATUS BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Subtle background ambient grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>BACKEND ACTIVE · {server?.status}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Node {server?.nodeVersion} · PID {server?.pid} · {server?.platform} ({server?.arch})
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">·</span>
              <span className="text-xs text-slate-400 font-medium">
                Env: <span className="text-slate-200 font-bold uppercase">{server?.environment}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Terminal className="text-emerald-400" size={28} />
              <span>Developer & Server Management</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time infrastructure observability: monitor MongoDB Atlas M0 (512 MB) cluster storage, Node.js process heap memory, per-user resource consumption, and live API throughput & latency.
            </p>
          </div>

          {/* Action Bar & Refresh Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* Auto-Refresh Pills */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-1 flex items-center gap-1 text-[11px] font-bold">
              <span className="px-2 text-slate-400 flex items-center gap-1 text-[10px] uppercase">
                <Clock size={11} /> Auto:
              </span>
              {[
                { label: '3s', val: 3 },
                { label: '5s', val: 5 },
                { label: '10s', val: 10 },
                { label: 'Off', val: 0 },
              ].map((pill) => (
                <button
                  key={pill.val}
                  type="button"
                  onClick={() => setRefreshInterval(pill.val)}
                  className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    refreshInterval === pill.val
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => fetchMetrics(true)}
              disabled={refreshing}
              className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Fetch fresh real-time metrics"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
              <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
            </button>

            {/* Export Diagnostics */}
            <button
              type="button"
              onClick={handleExportDiagnostics}
              className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download full diagnostics JSON"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Live Sub-Status Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Uptime: <strong className="text-emerald-400 font-bold">{server?.uptimeHuman}</strong>
            </span>
            <span>·</span>
            <span>
              Server Time: <strong className="text-slate-200">{server?.serverTime ? new Date(server.serverTime).toLocaleTimeString() : '—'}</strong>
            </span>
            <span>·</span>
            <span>
              CPUs: <strong className="text-slate-200">{server?.cpuCount} Cores</strong> ({server?.cpuModel?.substring(0, 24)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestPing}
              disabled={pingTesting}
              className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Wifi size={11} className={pingTesting ? 'animate-ping text-emerald-400' : 'text-emerald-400'} />
              <span>{pingTesting ? 'Pinging…' : 'Ping Backend'}</span>
              {pingResult && (
                <span className={`ml-1 text-[10px] font-extrabold ${pingResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({pingResult.ms}ms)
                </span>
              )}
            </button>

            {lastRefreshedAt && (
              <span className="text-[11px] text-slate-400 hidden md:inline">
                Synced at {lastRefreshedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. FOUR CORE METRIC GAUGES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: MongoDB Atlas Free Tier Quota */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                MongoDB Atlas Storage
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                <span>{database?.totalUsedMb ?? '—'}</span>
                <span className="text-xs font-bold text-slate-400">/ 512 MB</span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
              dbUsagePercent > 80 ? 'bg-rose-100 text-rose-700' : dbUsagePercent > 50 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Database size={20} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Free M0 Capacity Used</span>
              <span className={`font-black ${dbUsagePercent > 80 ? 'text-rose-600' : 'text-slate-900'}`}>
                {database?.percentUsed ?? '—'}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  dbUsagePercent > 80 ? 'bg-rose-500' : dbUsagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(2, Math.min(100, dbUsagePercent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>Remaining Free: <strong className="text-emerald-700 font-bold">{database?.freeMb ?? '—'} MB</strong></span>
              <span className="font-mono">{database?.objectsCount ?? '—'} docs</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Node.js Process Heap */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Node.js Heap Memory
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                <span>{processMemory?.heapUsedMb ?? '—'}</span>
                <span className="text-xs font-bold text-slate-400">/ {processMemory?.heapTotalMb ?? '—'} MB</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
              <Cpu size={20} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Heap Utilization</span>
              <span className="font-black text-indigo-900">{processMemory?.heapUsagePercent ?? '—'}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${Math.max(2, Math.min(100, heapUsagePercent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>RSS: <strong className="text-slate-800 font-bold">{processMemory?.rssMb ?? '—'} MB</strong></span>
              <span>Ext: {processMemory?.externalMb ?? '—'} MB</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Host OS System RAM */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Host System RAM
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                <span>{systemMemory?.freeMb ?? '—'}</span>
                <span className="text-xs font-bold text-slate-400">MB Free</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0">
              <HardDrive size={20} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Total System RAM</span>
              <span className="font-black text-slate-900">{systemMemory?.totalMb ?? '—'} MB</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-cyan-600 transition-all duration-500"
                style={{ width: `${Math.max(2, Math.min(100, osUsagePercent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>Used: <strong className="text-slate-800 font-bold">{systemMemory?.usedMb ?? '—'} MB</strong></span>
              <span>{systemMemory?.usagePercent ?? '—'}% load</span>
            </div>
          </div>
        </div>

        {/* Metric 4: API Response & Latency */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                API Avg Latency
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                <span>{apiPerformance?.avgLatencyMs ?? '—'}</span>
                <span className="text-xs font-bold text-slate-400">ms</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Activity size={20} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Total Hits</span>
              <span className="font-extrabold text-amber-900">{apiPerformance?.totalRequests ?? '—'} requests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                2xx: {apiPerformance?.statusCodes?.['2xx'] || 0}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
                4xx: {apiPerformance?.statusCodes?.['4xx'] || 0}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold border border-rose-200">
                5xx: {apiPerformance?.statusCodes?.['5xx'] || 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span>Peak: <strong className="text-rose-600 font-bold">{apiPerformance?.peakLatencyMs} ms</strong></span>
              <span>Last: {apiPerformance?.lastLatencyMs} ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Panoramic Dashboard', icon: Gauge },
          { id: 'database', label: 'MongoDB Atlas & Collections', icon: Database },
          { id: 'memory', label: 'User Memory Consumption', icon: Users },
          { id: 'api', label: 'API Performance & Live Traffic', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW / PANORAMIC */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Actions & Maintenance Toolbar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold shrink-0">
                <Zap size={20} className="text-amber-500" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900">
                  Infrastructure & Database Maintenance Tools
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Trigger active snapshot sync, flush metrics or download live telemetry reports.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSyncDb}
                disabled={syncingDb}
                className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={syncingDb ? 'animate-spin' : ''} />
                <span>{syncingDb ? 'Syncing…' : 'Sync DB & Snapshot'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearMetrics}
                disabled={clearingMetrics}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Reset API Stats</span>
              </button>
            </div>
          </div>

          {/* Side by side: Atlas storage gauge & Top endpoints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Atlas 512MB Quota breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Database size={17} className="text-emerald-600" />
                    <span>MongoDB Atlas M0 Free Cluster Breakdown</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Storage status: {database?.mode} (Database: {database?.databaseName})
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  database?.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {database?.connected ? 'Atlas Online' : database ? 'Snapshot Mode' : 'Unavailable'}
                </span>
              </div>

              {/* Visual gauge */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">Cluster Capacity (512 MB Free Tier)</span>
                  <span className="text-slate-900">{database?.totalUsedMb} MB / 512 MB ({database?.percentUsed}%)</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${Math.max(2, Math.min(100, dbUsagePercent))}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400">DATA SIZE</div>
                    <div className="font-extrabold text-slate-900 text-sm mt-0.5">{database?.dataSizeMb} MB</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400">STORAGE ON DISK</div>
                    <div className="font-extrabold text-slate-900 text-sm mt-0.5">{database?.storageSizeMb} MB</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400">INDEX SIZE</div>
                    <div className="font-extrabold text-slate-900 text-sm mt-0.5">{database?.indexSizeMb} MB</div>
                  </div>
                </div>
              </div>

              {/* Collections compact list */}
              <div>
                <div className="text-xs font-extrabold text-slate-700 mb-2">
                  Top Database Collections ({database?.collectionsCount || 0} total):
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {(database?.collections || []).slice(0, 5).map((col) => (
                    <div key={col.name} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Box size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-800 font-mono">{col.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="text-slate-500 font-semibold">{col.count} documents</span>
                        <span className="font-extrabold text-slate-900 font-mono">{col.sizeKb} KB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: API Top Endpoints & Real-time latency */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Activity size={17} className="text-amber-600" />
                    <span>Top Active API Endpoints</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Traffic distribution and response latency
                  </p>
                </div>
                <span className="text-xs font-extrabold text-slate-700">
                  {apiPerformance?.totalRequests} Total Calls
                </span>
              </div>

              {(!apiPerformance?.topEndpoints || apiPerformance.topEndpoints.length === 0) ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No endpoint traffic recorded yet in this session.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {apiPerformance.topEndpoints.slice(0, 6).map((ep) => {
                    const [method, route] = ep.endpoint.split(' ');
                    const methodColor =
                      method === 'GET'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : method === 'POST'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : method === 'PATCH'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200';

                    return (
                      <div key={ep.endpoint} className="p-3 bg-white flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase shrink-0 ${methodColor}`}>
                            {method}
                          </span>
                          <span className="font-bold text-slate-800 font-mono text-[11px] truncate">{route}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-[11px]">
                          <span className="text-slate-500 font-bold">{ep.hits} hits</span>
                          <span className={`font-mono font-extrabold px-2 py-0.5 rounded-full ${
                            ep.avgMs > 200 ? 'bg-rose-50 text-rose-700' : ep.avgMs > 50 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {ep.avgMs} ms
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONGODB ATLAS & STORAGE */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Main Atlas Cluster Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Database size={20} className="text-emerald-600" />
                  <span>MongoDB Atlas Storage Allocation (M0 Free Tier)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Cluster: <strong>{database?.mode || 'MongoDB Atlas (Cluster)'}</strong> · Target DB: <strong>{database?.databaseName || 'crm'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncDb}
                  disabled={syncingDb}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={syncingDb ? 'animate-spin' : ''} />
                  <span>{syncingDb ? 'Syncing…' : 'Sync to Cloud DB'}</span>
                </button>
              </div>
            </div>

            {/* Storage Progress Meter */}
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">Cluster Space Utilization</span>
                <span className="text-slate-900">
                  {database?.totalUsedMb ?? '—'} MB used of 512 MB ({database?.percentUsed ?? '—'}%)
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden p-0.5">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    dbUsagePercent > 80 ? 'bg-rose-500' : dbUsagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(2, Math.min(100, dbUsagePercent))}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Available Free Space</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{database?.freeMb ?? '—'} MB</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Safe margin remaining</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Data Size</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{database?.dataSizeMb ?? '—'} MB</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{database?.dataSizeBytes ?? '—'} bytes</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Storage on Disk</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{database?.storageSizeMb ?? '—'} MB</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Pre-allocated blocks</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Total Documents</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{database?.objectsCount ?? 18}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Across {database?.collectionsCount ?? 6} collections</div>
                </div>
              </div>
            </div>

            {/* Collections Table */}
            <div>
              <div className="text-xs font-extrabold text-slate-800 mb-3 flex items-center justify-between">
                <span>Collections Storage Footprint</span>
                <span className="text-slate-400 text-[11px] font-medium">{database?.collections?.length || database?.collectionsCount || 6} collections detected</span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Collection Name</th>
                      <th className="py-3 px-4">Document Count</th>
                      <th className="py-3 px-4">Data Size</th>
                      <th className="py-3 px-4">Storage Size</th>
                      <th className="py-3 px-4">Avg Object Size</th>
                      <th className="py-3 px-4 text-right">Cluster Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(database?.collections || []).map((col) => {
                      const share = database?.dataSizeBytes > 0
                        ? ((col.sizeBytes / database.dataSizeBytes) * 100).toFixed(1)
                        : '0.0';

                      return (
                        <tr key={col.name} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center gap-2">
                            <Box size={14} className="text-emerald-600" />
                            <span>{col.name}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700">{col.count}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">{col.sizeKb} KB</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{col.storageSizeKb} KB</td>
                          <td className="py-3 px-4 text-slate-500 font-mono">{col.avgObjSize} B</td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-extrabold text-slate-900">{share}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER MEMORY CONSUMPTION ("Memory used per user") */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users size={20} className="text-indigo-600" />
                  <span>Tenant & User Memory Profiler</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Storage is an estimate from workspace records, not an exact disk measurement. API counts cover authenticated requests since this server started or metrics were reset.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by owner or company..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Business Owner & Company</th>
                    <th className="py-3 px-4">Staff Count</th>
                    <th className="py-3 px-4">Leads Count</th>
                    <th className="py-3 px-4">Storage Used / Limit</th>
                    <th className="py-3 px-4">DB Share (est.)</th>
                    <th className="py-3 px-4">API Requests</th>
                    <th className="py-3 px-4">API Usage Share</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUserFootprint.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                        No tenant matching search query.
                      </td>
                    </tr>
                  ) : (
                    filteredUserFootprint.map((u) => (
                      <React.Fragment key={u.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-400">{u.email} · <span className="text-slate-600 font-semibold">{u.companyName}</span></div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">{u.staffCount} seats</td>
                        <td className="py-3 px-4 font-bold text-slate-700">{u.leadsCount} leads</td>
                        <td className="py-3 px-4 min-w-[170px]">
                          <div className="font-mono font-extrabold text-indigo-700">
                            {u.storageUsedMb ?? (u.estimatedKb / 1024).toFixed(2)} MB
                            <span className="text-slate-400 font-sans font-semibold"> / {u.storageLimitMb ?? 50} MB</span>
                          </div>
                          <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                            <div
                              className={`h-1.5 rounded-full ${Number(u.storagePercent) >= 90 ? 'bg-rose-500' : Number(u.storagePercent) >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.max(3, Math.min(100, Number(u.storagePercent) || 0))}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleSetStorageLimit(u)}
                              disabled={savingLimitFor === u.id}
                              className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              {savingLimitFor === u.id ? 'Saving…' : 'Change limit'}
                            </button>
                            {Array.isArray(u.members) && (
                              <button
                                type="button"
                                onClick={() => setExpandedOwner(expandedOwner === u.id ? null : u.id)}
                                className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                              >
                                {expandedOwner === u.id ? 'Hide members' : `Per member (${u.members.length})`}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full bg-indigo-500"
                                style={{ width: `${Math.max(4, Math.min(100, parseFloat(u.sharePercent) || 0))}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-slate-700 text-[11px]">{u.sharePercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {u.apiRequests}
                          <span className="block text-[10px] text-slate-400 font-sans">requests, not billed cost</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">{u.apiUsageSharePercent}%</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-slate-400 font-mono">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                      {expandedOwner === u.id && Array.isArray(u.members) && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={10} className="px-4 py-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead className="text-slate-500 uppercase text-[9px] font-bold">
                                  <tr>
                                    <th className="py-1.5 pr-3 text-left">Member</th>
                                    <th className="py-1.5 pr-3 text-left">Role</th>
                                    <th className="py-1.5 pr-3 text-right">Storage</th>
                                    <th className="py-1.5 pr-3 text-right">Leads</th>
                                    <th className="py-1.5 pr-3 text-right">Tasks</th>
                                    <th className="py-1.5 pr-3 text-right">Follow-ups</th>
                                    <th className="py-1.5 pr-3 text-right">Remarks</th>
                                    <th className="py-1.5 pr-3 text-right">API requests</th>
                                    <th className="py-1.5 text-right">Last login</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/70">
                                  {u.members.map((m) => (
                                    <tr key={m.id}>
                                      <td className="py-1.5 pr-3">
                                        <span className="font-bold text-slate-800">{m.name}</span>
                                        <span className="text-slate-400"> · {m.email}</span>
                                        {!m.isActive && <span className="ml-1 text-rose-500 font-bold">(inactive)</span>}
                                      </td>
                                      <td className="py-1.5 pr-3 text-slate-600">{m.role}</td>
                                      <td className="py-1.5 pr-3 text-right font-mono font-bold text-indigo-700">{m.kb} KB</td>
                                      <td className="py-1.5 pr-3 text-right">{m.leads}</td>
                                      <td className="py-1.5 pr-3 text-right">{m.tasks}</td>
                                      <td className="py-1.5 pr-3 text-right">{m.followUps}</td>
                                      <td className="py-1.5 pr-3 text-right">{m.remarks}</td>
                                      <td className="py-1.5 pr-3 text-right font-mono">{m.apiRequests}</td>
                                      <td className="py-1.5 text-right text-slate-400">{m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : 'Never'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">
                              The limit is for the whole company (owner + staff). When it is full, new entries are refused with a clear message; reading and deleting keep working.
                            </p>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: API TRAFFIC & PERFORMANCE */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* Real-time Request Stream */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity size={20} className="text-amber-600" />
                  <span>Real-Time API Traffic Stream</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Live feed of the latest requests hitting the backend server.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearMetrics}
                disabled={clearingMetrics}
                className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Trash2 size={12} />
                <span>Clear History</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Endpoint Path</th>
                    <th className="py-3 px-4">Status Code</th>
                    <th className="py-3 px-4 text-right">Response Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(!apiPerformance?.recentRequests || apiPerformance.recentRequests.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-sans">
                        No requests recorded yet. Make some actions in the app to see live traffic!
                      </td>
                    </tr>
                  ) : (
                    apiPerformance.recentRequests.map((req, idx) => {
                      const methodColor =
                        req.method === 'GET'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : req.method === 'POST'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : req.method === 'PATCH'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200';

                      const statusColor =
                        req.status < 300
                          ? 'bg-emerald-50 text-emerald-700'
                          : req.status < 500
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700';

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                            {new Date(req.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${methodColor}`}>
                              {req.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{req.path}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${statusColor}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-extrabold text-slate-900">
                            {req.durationMs} ms
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
