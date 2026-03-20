import React, { useEffect, useState } from 'react';
import { getTargets, createTarget, startScan } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Projects = () => {
  const navigate = useNavigate();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [scanningId, setScanningId] = useState(null);
  const [newTarget, setNewTarget] = useState({ name: '', url_or_ip: '', description: '' });

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const data = await getTargets();
      setTargets(data);
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createTarget(newTarget);
      setShowModal(false);
      setNewTarget({ name: '', url_or_ip: '', description: '' });
      fetchTargets();
    } catch (error) {
      console.error('Error creating target:', error);
      alert('Failed to create target. Make sure the URL/IP is unique.');
    }
  };

  const handleStartScan = async (targetId) => {
    setScanningId(targetId);
    try {
      await startScan(targetId);
      // Redirigir a la página de escaneos para ver el progreso
      navigate('/scans');
    } catch (error) {
      console.error('Error starting scan:', error);
      alert('Failed to start scan. Make sure the backend and workers are running.');
    } finally {
      setScanningId(null);
    }
  };

  return (
    <div className="pt-8 px-4 md:px-8 max-w-7xl mx-auto pb-32">
      {/* Header & Search Section */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-on-background">Target Projects</h1>
          <p className="text-on-surface-variant text-lg">Manage and monitor your infrastructure endpoints.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
            <input 
              className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all font-body text-sm placeholder:text-outline-variant" 
              placeholder="Filter targets..." 
              type="text"
            />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary text-on-primary px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Add Target
          </button>
        </div>
      </section>

      {/* Modal para Crear Target */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-container-high w-full max-w-md rounded-2xl p-8 shadow-2xl border border-outline-variant/10">
            <h2 className="text-2xl font-headline font-bold mb-6">Register New Target</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Project Name</label>
                <input 
                  required
                  value={newTarget.name}
                  onChange={(e) => setNewTarget({...newTarget, name: e.target.value})}
                  className="w-full bg-surface-container-low rounded-lg p-3 border-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="e.g. My Awesome API"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">URL or IP</label>
                <input 
                  required
                  value={newTarget.url_or_ip}
                  onChange={(e) => setNewTarget({...newTarget, url_or_ip: e.target.value})}
                  className="w-full bg-surface-container-low rounded-lg p-3 border-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="e.g. 192.168.1.1 or https://myapp.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Description</label>
                <textarea 
                  value={newTarget.description}
                  onChange={(e) => setNewTarget({...newTarget, description: e.target.value})}
                  className="w-full bg-surface-container-low rounded-lg p-3 border-none focus:ring-2 focus:ring-primary transition-all h-24"
                  placeholder="What is this project about?"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-surface-container-highest py-3 rounded-xl font-bold hover:bg-surface-bright transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="text-center py-10">
              <p className="text-on-surface-variant animate-pulse">Loading targets...</p>
            </div>
          ) : targets.length === 0 ? (
            <div className="bg-surface-container-high rounded-xl p-10 text-center border-2 border-dashed border-outline-variant/20">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">folder_off</span>
              <h2 className="text-xl font-headline font-semibold text-on-surface">No targets registered</h2>
              <p className="text-on-surface-variant mt-2">Add your first project to start scanning.</p>
            </div>
          ) : (
            targets.map((target) => (
              <div key={target.id} className="group bg-surface-container-high rounded-xl p-5 hover:bg-surface-container-highest transition-all duration-300 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-headline font-semibold text-primary">{target.name}</h2>
                    <code className="text-xs text-primary-fixed bg-primary/10 px-2 py-0.5 rounded font-mono">{target.url_or_ip}</code>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-widest text-outline-variant font-bold mb-1">Status</span>
                    <span className="flex items-center gap-1.5 text-on-surface-variant text-sm font-medium bg-surface-container-low px-3 py-1 rounded-full">
                      Idle
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <span className="block text-[10px] uppercase tracking-wider text-outline-variant font-bold mb-1">Findings</span>
                    <span className="text-xl font-mono font-bold text-on-surface">0</span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <span className="block text-[10px] uppercase tracking-wider text-outline-variant font-bold mb-1">Last Scan</span>
                    <span className="text-sm font-body text-on-surface">Never</span>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <span className="block text-[10px] uppercase tracking-wider text-outline-variant font-bold mb-1">Risk Score</span>
                    <span className="text-xl font-mono font-bold text-primary">--</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95">
                    <span className="material-symbols-outlined text-lg">bolt</span>
                    Scan Now
                  </button>
                  <button className="bg-surface-container-highest hover:bg-surface-bright p-2.5 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-on-surface">settings</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Educational Section */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-surface-container-high to-surface-container-low rounded-2xl p-6 shadow-xl relative overflow-hidden border-l-4 border-primary">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-primary mb-4">
                <span className="material-symbols-outlined">school</span>
                <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Security Intel</h3>
              </div>
              <h4 className="text-on-background font-semibold mb-3">Verifying Domain Ownership</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                Before performing deep reconnaissance, you must prove authority over the target domain. This prevents unauthorized scanning and ensures ethical compliance.
              </p>
              <div className="space-y-4">
                {[
                  { id: '01', title: 'DNS TXT Record', desc: 'Add a unique hash to your DNS configuration. This is the fastest method for automated verification.' },
                  { id: '02', title: 'Meta Tag Insertion', desc: 'Place a <meta> tag in the head of your homepage for web-based verification.' },
                  { id: '03', title: 'File Upload', desc: 'Upload a generated sectest.txt file to your root directory.' }
                ].map((step) => (
                  <div key={step.id} className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">{step.id}</div>
                    <div>
                      <p className="text-xs font-bold text-on-surface uppercase tracking-wider mb-1">{step.title}</p>
                      <p className="text-xs text-on-surface-variant">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-8 w-full border border-primary/20 hover:bg-primary/5 text-primary-fixed py-2 rounded-lg text-sm transition-colors font-medium uppercase tracking-widest text-[10px] font-bold">
                Read Full Documentation
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-surface-container-highest text-9xl opacity-20 pointer-events-none">verified_user</span>
          </div>

          {/* Quick Stats Bento Item */}
          <div className="bg-surface-container-low rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <p className="text-outline-variant text-xs uppercase font-bold tracking-[0.2em] mb-2">Network Health</p>
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle className="text-surface-container-highest" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                <circle className="text-primary" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeDasharray="364.4" strokeDashoffset="100" strokeWidth="8"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-headline font-bold">82%</span>
                <span className="text-[10px] text-outline-variant">SECURE</span>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant italic">3 targets require immediate patching.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;
