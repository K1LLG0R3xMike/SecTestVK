import React, { useEffect, useState, useCallback } from 'react';
import { healthCheck, createTarget, startScan, cancelScan, getDashboardStats, getScans } from '../services/api';

const Dashboard = () => {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [targets, setTargets] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [scanConfig, setScanConfig] = useState({
    nmap: true,
    gobuster: true,
    nuclei: true,
    whatweb: true,
    nikto: false,
    sslscan: true
  });
  const [stats, setStats] = useState({
    total_scans: 0,
    vulnerabilities_found: 0,
    active_scans_count: 0,
    security_score: 'N/A',
    severity_distribution: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    recent_findings: [],
    active_scans: []
  });

  const fetchData = useCallback(async () => {
    try {
      const [health, dashboardStats, targetsData] = await Promise.all([
        healthCheck(),
        getDashboardStats(selectedTargetId ? { targetId: Number(selectedTargetId) } : undefined),
        getScans(),
      ]);
      setBackendStatus(health.status === 'healthy' ? 'Online' : 'Error');
      setStats(dashboardStats);
      const byTargetId = new Map();
      for (const scan of targetsData) {
        if (!scan?.target_id || !scan?.target?.url_or_ip) continue;
        if (!byTargetId.has(scan.target_id)) {
          byTargetId.set(scan.target_id, scan.target.url_or_ip);
        }
      }
      const options = Array.from(byTargetId.entries())
        .map(([id, url_or_ip]) => ({ id, url_or_ip }))
        .sort((a, b) => a.url_or_ip.localeCompare(b.url_or_ip));
      setTargets(options);
    } catch (error) {
      console.error('Data fetch error:', error);
      setBackendStatus('Offline');
    }
  }, [selectedTargetId]);

  useEffect(() => {
    fetchData();
    // Refresh cada 5 segundos
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStartScan = async (e, force = false) => {
    if (e) e.preventDefault();
    if (!targetUrl) return;

    setIsScanning(true);
    try {
      const target = await createTarget({ url_or_ip: targetUrl, name: targetUrl });
      await startScan(target.id, scanConfig, force);
      
      setIsModalOpen(false);
      setTargetUrl('');
      fetchData(); // Refrescar inmediatamente
    } catch (error) {
      console.error('Error starting scan:', error);
      const errorMessage = error.response?.data?.detail || error.message;
      
      if (errorMessage.includes("override")) {
        if (window.confirm("A scan is already pending/running for this host. Do you want to cancel the old one and start a new one?")) {
          handleStartScan(null, true);
          return;
        }
      } else {
        alert('Error al iniciar el escaneo: ' + errorMessage);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleCancelScan = async (scanId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar este escaneo?')) return;
    
    try {
      await cancelScan(scanId);
      fetchData(); // Refrescar para ver el cambio de estado
    } catch (error) {
      console.error('Error cancelling scan:', error);
      alert('Error al cancelar el escaneo: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="pt-8 pb-32 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      {/* Modal para Nuevo Escaneo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-high p-8 rounded-2xl w-full max-w-lg border border-outline-variant/20 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-headline">New Security Scan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleStartScan} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Target URL or IP</label>
                <input 
                  type="text" 
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com o 192.168.1.1"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              {/* Scan Tools Checklist */}
              <div className="space-y-3">
                <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Scan Configuration</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(scanConfig).map((tool) => (
                    <label key={tool} className="flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl cursor-pointer hover:border-primary/40 transition-all">
                      <input 
                        type="checkbox" 
                        checked={scanConfig[tool]}
                        onChange={() => setScanConfig(prev => ({ ...prev, [tool]: !prev[tool] }))}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm font-bold uppercase tracking-tight opacity-80">{tool}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isScanning}
                className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isScanning ? 'Queuing Parallel Pipeline...' : 'Launch Automated Scan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-headline text-3xl font-bold text-on-background tracking-tight">Security Overview</h2>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/30 rounded-lg px-3 py-2 text-xs font-mono text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
              aria-label="Seleccionar host"
            >
              <option value="">All Hosts</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.url_or_ip}
                </option>
              ))}
            </select>
          </div>
          <p className="text-on-surface-variant font-label text-sm uppercase tracking-wider mt-1">
            Status: <span className={backendStatus === 'Online' ? 'text-primary' : 'text-error'}>{backendStatus}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-container-high text-on-surface px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors">
            Export Reports
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Start New Scan
          </button>
        </div>
      </section>

      {/* KPI Cards Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-primary/40 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Total Scans</p>
            <h3 className="font-headline text-4xl font-bold mt-2">{stats.total_scans}</h3>
            <p className="text-primary text-xs mt-2 font-mono">Real-time infrastructure analysis</p>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-primary/5 text-8xl">radar</span>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-error/40 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Vulnerabilities Found</p>
            <h3 className="font-headline text-4xl font-bold mt-2">{stats.vulnerabilities_found}</h3>
            <p className="text-error text-xs mt-2 font-mono">
              {stats.severity_distribution.critical} Critical / {stats.severity_distribution.high} High
            </p>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-error/5 text-8xl">security</span>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-secondary/40 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Security Rating</p>
            <h3 className="font-headline text-4xl font-bold mt-2">{stats.security_score}</h3>
            <p className="text-secondary text-xs mt-2 font-mono">Global project health</p>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-secondary/5 text-8xl">assessment</span>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Large Chart Placeholder */}
        <div className="lg:col-span-2 bg-surface-container-high rounded-xl p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h4 className="font-headline text-xl font-bold">Severity Distribution</h4>
              <p className="text-on-surface-variant text-sm">Visualizing the threat landscape across all project nodes</p>
            </div>
            <div className="flex gap-4 font-mono text-[10px] text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-error rounded-full"></span> Critical</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-secondary rounded-full"></span> High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-tertiary rounded-full"></span> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary-fixed rounded-full"></span> Low</span>
            </div>
          </div>
          <div className="h-48 flex items-end gap-2 md:gap-4 px-4">
            {/* Real data-driven bars */}
            {(() => {
              const maxVal = Math.max(
                stats.severity_distribution.critical,
                stats.severity_distribution.high,
                stats.severity_distribution.medium,
                stats.severity_distribution.low,
                1 // Avoid division by zero
              );
              return (
                <>
                  <div className="flex-1 bg-error/20 hover:bg-error/40 transition-all rounded-t-lg relative group" style={{ height: `${(stats.severity_distribution.critical / maxVal) * 100}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-error font-mono text-xs opacity-0 group-hover:opacity-100">{stats.severity_distribution.critical}</div>
                  </div>
                  <div className="flex-1 bg-secondary/20 hover:bg-secondary/40 transition-all rounded-t-lg relative group" style={{ height: `${(stats.severity_distribution.high / maxVal) * 100}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-secondary font-mono text-xs opacity-0 group-hover:opacity-100">{stats.severity_distribution.high}</div>
                  </div>
                  <div className="flex-1 bg-tertiary/20 hover:bg-tertiary/40 transition-all rounded-t-lg relative group" style={{ height: `${(stats.severity_distribution.medium / maxVal) * 100}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-tertiary font-mono text-xs opacity-0 group-hover:opacity-100">{stats.severity_distribution.medium}</div>
                  </div>
                  <div className="flex-1 bg-primary-fixed/20 hover:bg-primary-fixed/40 transition-all rounded-t-lg relative group" style={{ height: `${(stats.severity_distribution.low / maxVal) * 100}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-primary-fixed font-mono text-xs opacity-0 group-hover:opacity-100">{stats.severity_distribution.low}</div>
                  </div>
                </>
              );
            })()}
            <div className="flex-1 bg-primary/10 h-[30%] rounded-t-lg"></div>
            <div className="flex-1 bg-primary/10 h-[10%] rounded-t-lg"></div>
            <div className="flex-1 bg-primary/10 h-[20%] rounded-t-lg"></div>
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/20 grid grid-cols-4 text-center">
            <div>
              <p className="text-xs font-mono text-on-surface-variant">CRITICAL</p>
              <p className="font-bold text-error">{stats.severity_distribution.critical}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-on-surface-variant">HIGH</p>
              <p className="font-bold text-secondary">{stats.severity_distribution.high}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-on-surface-variant">MEDIUM</p>
              <p className="font-bold text-tertiary">{stats.severity_distribution.medium}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-on-surface-variant">LOW</p>
              <p className="font-bold text-primary-fixed">{stats.severity_distribution.low}</p>
            </div>
          </div>
        </div>

        {/* Recent Active Scans */}
        <div className="bg-surface-container-high rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-headline text-lg font-bold">Active Scans</h4>
            <span className="text-primary font-mono text-[10px] animate-pulse">● LIVE</span>
          </div>
          <div className="space-y-6">
            {stats.active_scans.length === 0 ? (
              <div className="text-center py-8 space-y-2 opacity-50">
                <span className="material-symbols-outlined text-4xl">inventory_2</span>
                <p className="text-on-surface-variant text-sm italic">No scans running</p>
              </div>
            ) : (
              stats.active_scans.map((scan) => (
                <div key={scan.id} className="space-y-2 group">
                  <div className="flex justify-between items-start">
                    <div className="font-mono text-xs text-on-surface space-y-1 overflow-hidden">
                      <p className="font-bold text-primary truncate w-32" title={scan.target?.url_or_ip}>{scan.target?.url_or_ip || scan.target_id}</p>
                      <p className="text-on-surface-variant opacity-70">Progress: <span className="text-on-surface">{scan.progress}%</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${scan.status === 'running' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}`}>
                        {scan.status.toUpperCase()}
                      </span>
                      <button 
                        onClick={() => handleCancelScan(scan.id)}
                        className="text-[10px] text-error hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                        Stop
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-primary transition-all duration-1000 ${scan.status === 'running' ? 'animate-pulse' : ''}`} 
                      style={{ width: `${scan.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-8 py-3 rounded-lg border border-primary/20 text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            System Log Terminal
          </button>
        </div>
      </section>

      {/* Asymmetric Detail Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start pb-12">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-surface-container-low p-4 rounded-xl">
            <h5 className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-4">Latest Finding</h5>
            {stats.recent_findings.length > 0 ? (
              <div className={`p-3 border-l-2 rounded-r-lg ${
                stats.recent_findings[0].severity === 'critical' ? 'bg-error-container/10 border-error' :
                stats.recent_findings[0].severity === 'high' ? 'bg-secondary/10 border-secondary' :
                'bg-tertiary/10 border-tertiary'
              }`}>
                <p className={`font-mono text-xs font-bold ${
                  stats.recent_findings[0].severity === 'critical' ? 'text-error' :
                  stats.recent_findings[0].severity === 'high' ? 'text-secondary' :
                  'text-tertiary'
                }`}>{stats.recent_findings[0].title}</p>
                <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                  {stats.recent_findings[0].description}
                </p>
                <p className="text-[9px] font-mono text-on-surface-variant/50 mt-2 uppercase">
                  TOOL: {stats.recent_findings[0].tool}
                </p>
              </div>
            ) : (
              <p className="text-xs italic text-on-surface-variant">No findings yet</p>
            )}
          </div>
          <div className="bg-surface-container-low p-4 rounded-xl">
            <h5 className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Team Activity</h5>
            <div className="flex -space-x-2">
              <img className="w-8 h-8 rounded-full border-2 border-surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA194C7IoRqYeBBicALUeM27d43pV7HX7-jnkwlAD72FG6Bwi0DYHuQNjVRazXzaQJxkEsahPjQvF9bL7sW2F8zMy4Qpskzh_UxSDMBh3T7bgxh7BNkZvEoo6brr_-QtxVeibMp154V-hF5EYxHk-ur9BeTWWF3bOg0OdV3teEL4pS3v9qAeoiFe3Gx2FrK2w9r021VHObicCy-nwZzhbkUddCP6O50LH2wra1Ow-6X9-TlXdHPW_bYHiknyxCzMd01W6JlYY5UuQA" alt="User" />
              <img className="w-8 h-8 rounded-full border-2 border-surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyBTjdldHyjQQyXXRG8Ru4JKcGRFK-k3cnrJ8veuFvmuGmEk5s24ZNhqyEE5C3kGhzs_hXOGYdBBXZnu1ogY7E-uMWbicEhMNWDQIDe8zkHyqNhVoK_fePUOMzFNarPs4xOlyyqmU_QsFmM7YJItUsg1WlPvD2Er2cPrZ8rDDr4FZgZ9nOKv19VJwBPhNizyt-ufinSjZKucOmnItMaQ5b4Yo3z38_C5tRFvJd4fp2cycy-spttGQL2YuXUV0TCof_ThDT7nenHIw" alt="User" />
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border-2 border-surface flex items-center justify-center text-[10px] font-bold">+2</div>
            </div>
          </div>
        </div>
        <div className="md:col-span-3 bg-surface-container-lowest p-1 rounded-xl">
          <div className="bg-surface-container p-6 rounded-lg">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-headline text-xl font-bold">Node Vulnerability Map</h4>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-error shadow-[0_0_8px_rgba(255,110,132,0.5)]"></span>
                <span className="w-3 h-3 rounded-full bg-secondary"></span>
                <span className="w-3 h-3 rounded-full bg-tertiary"></span>
              </div>
            </div>
            <div className="relative h-64 w-full bg-[#080a10] rounded-lg overflow-hidden flex items-center justify-center group">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-10 left-10 w-24 h-24 bg-primary/20 blur-3xl"></div>
                <div className="absolute bottom-10 right-20 w-32 h-32 bg-error/10 blur-3xl"></div>
              </div>
              <div className="relative grid grid-cols-4 md:grid-cols-6 gap-8 opacity-60">
                <span className="material-symbols-outlined text-4xl text-outline-variant">hub</span>
                <span className="material-symbols-outlined text-4xl text-error">dns</span>
                <span className="material-symbols-outlined text-4xl text-outline-variant">cloud_queue</span>
                <span className="material-symbols-outlined text-4xl text-secondary">router</span>
                <span className="material-symbols-outlined text-4xl text-outline-variant">storage</span>
                <span className="material-symbols-outlined text-4xl text-tertiary">laptop_chromebook</span>
              </div>
              <div className="absolute bottom-4 left-4 font-mono text-[10px] text-on-surface-variant uppercase">
                COORD: 32.7157° N, 117.1611° W | SYSTEM_OK
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
