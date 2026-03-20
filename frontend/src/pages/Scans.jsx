import React, { useEffect, useState } from 'react';
import { getScans } from '../services/api';

const Scans = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const data = await getScans();
        setScans(data);
      } catch (error) {
        console.error('Error fetching scans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, []);

  return (
    <div className="pt-8 pb-24 min-h-screen px-4 lg:px-8 max-w-7xl mx-auto">
      {/* Dashboard Hero Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pipeline Stepper */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-xl">
            <h2 className="font-headline text-lg font-bold text-primary mb-6 tracking-tight">Pipeline Status</h2>
            <div className="relative space-y-8">
              {/* Connector Line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-outline-variant/30"></div>
              
              <div className="relative flex items-center gap-4 group opacity-40">
                <div className="z-10 w-6 h-6 rounded-full bg-outline-variant flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-sm">lock</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold font-headline">No Active Pipeline</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Start a scan to begin</p>
                </div>
              </div>
            </div>
          </div>

          {/* Global Progress Card */}
          <div className="bg-surface-container-high p-6 rounded-xl text-center">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Overall Progress</span>
              <span className="text-2xl font-headline font-bold text-primary">0%</span>
            </div>
            <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary-container h-full w-[0%]"></div>
            </div>
          </div>
        </aside>

        {/* Right Column: Terminal & Findings */}
        <div className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="bg-surface-container-low rounded-xl p-20 text-center">
              <p className="text-on-surface-variant animate-pulse">Loading scan data...</p>
            </div>
          ) : scans.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-20 text-center border-2 border-dashed border-outline-variant/20">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">radar</span>
              <h2 className="text-xl font-headline font-semibold text-on-surface">No scans history</h2>
              <p className="text-on-surface-variant mt-2">Historical and active scans will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Terminal Log Window (Dummy for now) */}
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl flex flex-col h-[400px]">
                <div className="bg-surface-container-high px-4 py-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-error-dim/40"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary-dim/40"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-fixed-dim/40"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-on-surface-variant">terminal</span>
                    <span className="text-[10px] font-mono text-on-surface-variant tracking-tight uppercase">System Console</span>
                  </div>
                  <div className="w-10"></div>
                </div>
                <div className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-1 bg-[#000000]/90">
                  <p className="text-primary-fixed opacity-70">SecTest VK v0.1.0 ready.</p>
                  <p className="text-on-surface-variant">Waiting for scan tasks...</p>
                  <p className="text-primary animate-pulse">_</p>
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
