import React, { useEffect, useState } from 'react';
import { healthCheck } from '../services/api';

const Dashboard = () => {
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await healthCheck();
        setBackendStatus(data.status === 'healthy' ? 'Online' : 'Error');
      } catch (error) {
        console.error('Backend connection error:', error);
        setBackendStatus('Offline');
      }
    };
    checkStatus();
  }, []);

  return (
    <div className="pt-8 pb-32 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-3xl font-bold text-on-background tracking-tight">Security Overview</h2>
          <p className="text-on-surface-variant font-label text-sm uppercase tracking-wider mt-1">
            Status: <span className={backendStatus === 'Online' ? 'text-primary' : 'text-error'}>{backendStatus}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-container-high text-on-surface px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors">
            Export Reports
          </button>
          <button className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
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
            <h3 className="font-headline text-4xl font-bold mt-2">1,284</h3>
            <p className="text-primary text-xs mt-2 font-mono">+12% from last week</p>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-primary/5 text-8xl">radar</span>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-error/40 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Vulnerabilities Found</p>
            <h3 className="font-headline text-4xl font-bold mt-2">42</h3>
            <p className="text-error text-xs mt-2 font-mono">12 Critical / 30 High</p>
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-error/5 text-8xl">security</span>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl border-l-4 border-secondary/40 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Average Security Score</p>
            <h3 className="font-headline text-4xl font-bold mt-2">B+</h3>
            <p className="text-secondary text-xs mt-2 font-mono">78 / 100 Baseline</p>
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
            <div className="flex-1 bg-error/20 hover:bg-error/40 transition-colors h-[25%] rounded-t-lg relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-error font-mono text-xs opacity-0 group-hover:opacity-100">12%</div>
            </div>
            <div className="flex-1 bg-secondary/20 hover:bg-secondary/40 transition-colors h-[50%] rounded-t-lg relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-secondary font-mono text-xs opacity-0 group-hover:opacity-100">28%</div>
            </div>
            <div className="flex-1 bg-tertiary/20 hover:bg-tertiary/40 transition-colors h-[85%] rounded-t-lg relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-tertiary font-mono text-xs opacity-0 group-hover:opacity-100">45%</div>
            </div>
            <div className="flex-1 bg-primary-fixed/20 hover:bg-primary-fixed/40 transition-colors h-[40%] rounded-t-lg relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-primary-fixed font-mono text-xs opacity-0 group-hover:opacity-100">15%</div>
            </div>
            <div className="flex-1 bg-primary/10 h-[60%] rounded-t-lg"></div>
            <div className="flex-1 bg-primary/10 h-[30%] rounded-t-lg"></div>
            <div className="flex-1 bg-primary/10 h-[75%] rounded-t-lg"></div>
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/20 grid grid-cols-4 text-center">
            <div>
              <p className="text-xs font-mono text-on-surface-variant">INFRA</p>
              <p className="font-bold text-error">Critical</p>
            </div>
            <div>
              <p className="text-xs font-mono text-on-surface-variant">API</p>
              <p className="font-bold text-secondary">High</p>
            </div>
            <div>
              <p className="text-xs font-mono text-on-surface-variant">AUTH</p>
              <p className="font-bold text-tertiary">Medium</p>
            </div>
            <div>
              <p className="text-xs font-mono text-on-surface-variant">UI</p>
              <p className="font-bold text-primary-fixed">Low</p>
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
            <div className="space-y-2 group">
              <div className="flex justify-between items-start">
                <div className="font-mono text-xs text-on-surface space-y-1">
                  <p className="font-bold text-primary">local-app-v1.com</p>
                  <p className="text-on-surface-variant opacity-70">Running: <span className="text-on-surface">Gobuster</span></p>
                </div>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">65%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
              </div>
            </div>
            <div className="space-y-2 group">
              <div className="flex justify-between items-start">
                <div className="font-mono text-xs text-on-surface space-y-1">
                  <p className="font-bold text-primary">192.168.1.105</p>
                  <p className="text-on-surface-variant opacity-70">Running: <span className="text-on-surface">Nmap TCP Full</span></p>
                </div>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">32%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '32%' }}></div>
              </div>
            </div>
            <div className="space-y-2 group">
              <div className="flex justify-between items-start">
                <div className="font-mono text-xs text-on-surface space-y-1">
                  <p className="font-bold text-primary">staging-auth.vk.io</p>
                  <p className="text-on-surface-variant opacity-70">Running: <span className="text-on-surface">Burp Intruder</span></p>
                </div>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">89%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '89%' }}></div>
              </div>
            </div>
          </div>
          <button className="w-full mt-8 py-3 rounded-lg border border-primary/20 text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            View All Tasks
          </button>
        </div>
      </section>

      {/* Asymmetric Detail Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start pb-12">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-surface-container-low p-4 rounded-xl">
            <h5 className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-4">Latest Finding</h5>
            <div className="p-3 bg-error-container/10 border-l-2 border-error rounded-r-lg">
              <p className="font-mono text-xs text-error font-bold">CVE-2023-XXXX</p>
              <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">Broken access control detected on <code className="bg-surface-container-highest px-1 rounded text-on-surface">/api/admin/config</code></p>
            </div>
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
