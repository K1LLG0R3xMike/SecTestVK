import React, { useEffect, useState } from 'react';
import { getTargets, createTarget, startScan, getScans } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Projects = () => {
  const navigate = useNavigate();
  const [targets, setTargets] = useState([]);
  const [activeScans, setActiveScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [scanningId, setScanningId] = useState(null);
  const [newTarget, setNewTarget] = useState({ name: '', url_or_ip: '', description: '' });
  const [scanConfig, setScanConfig] = useState({
    nmap: true,
    gobuster: true,
    nuclei: true,
    whatweb: true,
    nikto: false,
    sslscan: true,
    zap: false
  });

  const fetchData = async () => {
    try {
      const [targetsData, scansData] = await Promise.all([
        getTargets(),
        getScans()
      ]);
      setTargets(targetsData);
      setActiveScans(scansData.filter(s => s.status === 'running' || s.status === 'pending'));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createTarget(newTarget);
      setShowModal(false);
      setNewTarget({ name: '', url_or_ip: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating target:', error);
      alert('Failed to create target.');
    }
  };

  const handleStartScan = async (targetId, config = null, force = false) => {
    setScanningId(targetId);
    try {
      await startScan(targetId, config || scanConfig, force);
      navigate('/scans');
    } catch (error) {
      console.error('Error starting scan:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to start scan.';
      
      if (errorMessage.includes("override")) {
        if (window.confirm("A scan is already pending/running for this host. Do you want to cancel the old one and start a new one?")) {
          handleStartScan(targetId, config || scanConfig, true);
          return;
        }
      } else {
        alert('Error: ' + errorMessage);
      }
    } finally {
      setScanningId(null);
    }
  };

  const getTargetStatus = (targetId) => {
    const scan = activeScans.find(s => s.target_id === targetId);
    if (scan) return scan.status;
    return 'idle';
  };

  return (
    <div className="pt-8 px-4 md:px-8 max-w-7xl mx-auto pb-32">
      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-container-high w-full max-w-md rounded-2xl p-8 shadow-2xl border border-outline-variant/10">
            <h2 className="text-2xl font-headline font-bold mb-6">Register New Target</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Project Name</label>
                <input required value={newTarget.name} onChange={(e) => setNewTarget({...newTarget, name: e.target.value})} className="w-full bg-surface-container-low rounded-lg p-3 border-none focus:ring-2 focus:ring-primary transition-all" placeholder="e.g. My Awesome API" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">URL or IP</label>
                <input required value={newTarget.url_or_ip} onChange={(e) => setNewTarget({...newTarget, url_or_ip: e.target.value})} className="w-full bg-surface-container-low rounded-lg p-3 border-none focus:ring-2 focus:ring-primary transition-all" placeholder="e.g. 192.168.1.1 or https://myapp.com" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-surface-container-highest py-3 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-bold shadow-lg">Save Target</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-container-high w-full max-w-lg rounded-2xl p-8 shadow-2xl border border-outline-variant/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-headline font-bold">Scan Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
            </div>
            <p className="text-sm text-on-surface-variant mb-6 font-mono text-primary font-bold">{selectedTarget?.url_or_ip}</p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {Object.keys(scanConfig).map((tool) => (
                <label key={tool} className="flex items-center gap-3 p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl cursor-pointer hover:border-primary/40 transition-all">
                  <input type="checkbox" checked={scanConfig[tool]} onChange={() => setScanConfig(prev => ({ ...prev, [tool]: !prev[tool] }))} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-bold uppercase opacity-80">{tool}</span>
                </label>
              ))}
            </div>
            
            <button 
              onClick={() => { setShowSettingsModal(false); handleStartScan(selectedTarget.id); }}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">bolt</span>
              Launch Optimized Pipeline
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-on-background">Target Projects</h1>
          <p className="text-on-surface-variant text-lg">Manage and monitor your infrastructure endpoints.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary text-on-primary px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><span className="material-symbols-outlined">add_circle</span>Add Target</button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <p className="text-center py-10 animate-pulse">Loading...</p>
          ) : (
            targets.map((target) => {
              const status = getTargetStatus(target.id);
              return (
                <div key={target.id} className="bg-surface-container-high rounded-xl p-5 hover:bg-surface-container-highest transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-headline font-semibold text-primary">{target.name}</h2>
                      <code className="text-xs text-primary-fixed bg-primary/10 px-2 py-0.5 rounded font-mono">{target.url_or_ip}</code>
                    </div>
                    <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${
                      status === 'running' ? 'bg-primary text-on-primary animate-pulse' : 
                      status === 'pending' ? 'bg-tertiary text-on-tertiary' : 
                      'bg-surface-container-low text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-xs">
                        {status === 'running' ? 'sync' : status === 'pending' ? 'schedule' : 'check_circle'}
                      </span>
                      {status === 'idle' ? 'Ready' : status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      disabled={(status !== 'idle' && status !== 'completed' && status !== 'failed') || scanningId === target.id}
                      onClick={() => handleStartScan(target.id)}
                      className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-md active:scale-95"
                    >
                      <span className="material-symbols-outlined text-lg">{scanningId === target.id ? 'sync' : 'bolt'}</span>
                      {scanningId === target.id ? 'Queuing...' : (status === 'running' || status === 'pending' ? 'Scan in Progress' : 'Start Scan')}
                    </button>
                    <button 
                      onClick={() => { setSelectedTarget(target); setShowSettingsModal(true); }}
                      className="bg-surface-container-highest hover:bg-surface-bright p-2.5 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-on-surface">settings</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;
