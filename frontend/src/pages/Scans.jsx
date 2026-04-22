import React, { useEffect, useState } from 'react';
import { getScans, cancelScan } from '../services/api';

const Scans = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);

  const fetchScans = async () => {
    try {
      const data = await getScans();
      setScans(data);
      if (data.length > 0 && !selectedScan) {
        setSelectedScan(data[0]);
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
    const interval = setInterval(fetchScans, 5000);
    return () => clearInterval(interval);
  }, [selectedScan]);

  const handleCancelScan = async (scanId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar este escaneo?')) return;
    
    try {
      await cancelScan(scanId);
      fetchScans();
    } catch (error) {
      console.error('Error cancelling scan:', error);
      alert('Error al cancelar el escaneo: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-primary bg-primary/10';
      case 'running': return 'text-secondary bg-secondary/10 animate-pulse';
      case 'failed': return 'text-error bg-error/10';
      default: return 'text-on-surface-variant bg-surface-container-highest';
    }
  };

  return (
    <div className="pt-8 pb-24 min-h-screen px-4 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pipeline Stepper & History */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-xl">
            <h2 className="font-headline text-lg font-bold text-primary mb-6 tracking-tight">Scan History</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {scans.map((scan) => (
                <div 
                  key={scan.id} 
                  onClick={() => setSelectedScan(scan)}
                  className={`p-4 rounded-lg cursor-pointer border transition-all ${
                    selectedScan?.id === scan.id 
                      ? 'bg-surface-container-high border-primary' 
                      : 'bg-surface-container-lowest border-outline-variant/10 hover:border-outline-variant/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-mono font-bold truncate max-w-[150px]">{scan.target?.url_or_ip || scan.target_id}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${getStatusColor(scan.status)}`}>
                      {scan.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-surface-container-highest h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-500" style={{ width: `${scan.progress}%` }}></div>
                    </div>
                    <span className="text-[10px] font-mono">{scan.progress}%</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant italic">
                    {scan.start_time ? new Date(scan.start_time).toLocaleString() : 'Pending...'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Details & Console */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <div className="bg-surface-container-low rounded-xl p-20 text-center">
              <p className="text-on-surface-variant animate-pulse">Loading scan data...</p>
            </div>
          ) : !selectedScan ? (
            <div className="bg-surface-container-low rounded-xl p-20 text-center border-2 border-dashed border-outline-variant/20">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">radar</span>
              <h2 className="text-xl font-headline font-semibold text-on-surface">No scans history</h2>
              <p className="text-on-surface-variant mt-2">Historical and active scans will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Scan Info Header */}
              <div className="bg-surface-container-high p-6 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold font-headline mb-1">Scan Details</h3>
                  <p className="text-sm font-mono text-on-surface-variant">{selectedScan.id}</p>
                </div>
                <div className="flex gap-4">
                    {selectedScan.status === 'completed' && (
                      <a 
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/scans/${selectedScan.id}/report/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-on-primary hover:brightness-110 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                      >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        Download AI Report
                      </a>
                    )}
                    {(selectedScan.status === 'running' || selectedScan.status === 'pending') && (
                      <button 
                        onClick={() => handleCancelScan(selectedScan.id)}
                        className="bg-error/10 text-error hover:bg-error/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        Cancel Scan
                      </button>
                    )}
                    <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Tool</p>
                    <p className="text-sm font-bold text-primary">Nmap -sV -F</p>
                  </div>
                  <div className="text-right border-l border-outline-variant/20 pl-4">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Status</p>
                    <p className={`text-sm font-bold uppercase ${getStatusColor(selectedScan.status).split(' ')[0]}`}>
                      {selectedScan.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Console Window */}
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
                <div className="bg-surface-container-high px-4 py-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-error-dim/40"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary-dim/40"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-fixed-dim/40"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-on-surface-variant">terminal</span>
                    <span className="text-[10px] font-mono text-on-surface-variant tracking-tight uppercase">System Console Output</span>
                  </div>
                  <div className="w-10"></div>
                </div>
                <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-[#000000]/95 text-green-400">
                  <p className="text-blue-400 mb-2">[{new Date(selectedScan.start_time).toLocaleTimeString()}] Pipeline Execution for: {selectedScan.target?.url_or_ip || selectedScan.target_id}</p>
                  <pre className="whitespace-pre-wrap leading-relaxed text-xs">
                    {selectedScan.logs || "Initializing system logs..."}
                    {selectedScan.status === 'running' && <span className="animate-pulse">_</span>}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scans;
