import React from 'react';

const Reports = () => {
  return (
    <div className="pt-8 p-6 lg:p-10 max-w-7xl mx-auto w-full pb-32">
      {/* Hero Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-headline font-bold text-on-surface tracking-tight mb-4">Security Reporting Engine</h2>
          <p className="text-on-surface-variant leading-relaxed">Translate raw technical vulnerabilities into actionable business intelligence. Generate, preview, and archive comprehensive penetration testing reports.</p>
        </div>
        {/* Latest Grade Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-inverse-primary rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-surface-container-high p-6 rounded-xl flex items-center gap-6 min-w-[240px]">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-bold mb-1">Latest Scan Grade</span>
              <span className="text-5xl font-headline font-extrabold text-primary">B+</span>
            </div>
            <div className="h-12 w-[1px] bg-outline-variant/30"></div>
            <div className="flex flex-col">
              <span className="text-xs text-on-surface font-medium">Project: VK_Core_01</span>
              <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-tighter">2023-11-24 14:22</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* Executive Summary Preview */}
        <div className="lg:col-span-2 bg-surface-container-low p-8 rounded-xl border-l-4 border-primary">
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest mb-3 inline-block">Draft Ready</span>
              <h3 className="text-2xl font-headline font-bold">Executive Summary</h3>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest hover:bg-surface-bright transition-colors rounded-lg text-sm text-on-surface">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest hover:bg-surface-bright transition-colors rounded-lg text-sm text-on-surface">
                <span className="material-symbols-outlined text-sm">html</span> HTML
              </button>
            </div>
          </div>
          {/* Preview Canvas */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 font-serif italic text-on-surface-variant/80 space-y-4">
            <p className="text-lg text-on-surface not-italic font-headline font-semibold">1. OVERVIEW</p>
            <p>The security assessment conducted on the VK_Core environment identified several critical attack vectors. While perimeter defenses remain robust, internal lateral movement possibilities exist through legacy API endpoints...</p>
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="h-2 bg-error/20 rounded-full overflow-hidden"><div className="h-full bg-error w-1/3"></div></div>
              <div className="h-2 bg-secondary/20 rounded-full overflow-hidden"><div className="h-full bg-secondary w-2/3"></div></div>
              <div className="h-2 bg-primary/20 rounded-full overflow-hidden"><div className="h-full bg-primary w-1/2"></div></div>
            </div>
          </div>
        </div>

        {/* Previous Reports */}
        <div className="bg-surface-container-high p-6 rounded-xl">
          <h3 className="text-lg font-headline font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            Archive
          </h3>
          <div className="space-y-4">
            <div className="group p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-highest transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-on-surface-variant uppercase tracking-tighter">REP_2023_11_20</span>
                <span className="text-[10px] bg-error-container/20 text-on-error-container px-2 py-0.5 rounded font-bold uppercase tracking-tighter">CRITICAL</span>
              </div>
              <p className="text-sm font-medium mb-3">Infrastructure Audit - Q4</p>
              <div className="flex gap-4">
                <a className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold uppercase tracking-widest" href="#">
                  <span className="material-symbols-outlined text-sm">download</span> PDF
                </a>
                <a className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold uppercase tracking-widest" href="#">
                  <span className="material-symbols-outlined text-sm">link</span> LINK
                </a>
              </div>
            </div>
            <div className="group p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-highest transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-on-surface-variant uppercase tracking-tighter">REP_2023_11_15</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-tighter">STABLE</span>
              </div>
              <p className="text-sm font-medium mb-3">Auth Flow Pentest</p>
              <div className="flex gap-4">
                <a className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold uppercase tracking-widest" href="#">
                  <span className="material-symbols-outlined text-sm">download</span> PDF
                </a>
              </div>
            </div>
          </div>
          <button className="w-full mt-6 py-3 border border-outline-variant/20 rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-surface-container-highest transition-colors">
            View Full History
          </button>
        </div>

        {/* Technical Report Preview */}
        <div className="lg:col-span-2 bg-surface-container-low p-8 rounded-xl border-l-4 border-secondary">
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest mb-3 inline-block">Analysis Pending</span>
              <h3 className="text-2xl font-headline font-bold">Technical Report</h3>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest hover:bg-surface-bright transition-colors rounded-lg text-sm text-on-surface">
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest hover:bg-surface-bright transition-colors rounded-lg text-sm text-on-surface">
                <span className="material-symbols-outlined text-sm">html</span> HTML
              </button>
            </div>
          </div>
          {/* Code Block Preview */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 font-mono text-xs text-on-surface-variant leading-relaxed">
            <div className="flex items-center gap-2 mb-4 text-secondary">
              <span className="material-symbols-outlined text-sm">bug_report</span>
              <span>Vulnerability ID: CVE-2023-XXXXX</span>
            </div>
            <p className="text-on-surface mb-2 font-bold">REPRODUCTION STEPS:</p>
            <p className="pl-4 border-l-2 border-outline-variant/30 mb-4">
              $ curl -X POST https://api.vksys.io/v1/auth/reset <br/>
              -H "Authorization: Bearer [REDACTED]" <br/>
              -d '&#123;"email": "admin@vksys.io", "debug": true&#125;'
            </p>
            <p className="text-on-surface mb-2 font-bold">IMPACT:</p>
            <p>Potential for unauthenticated password resets due to verbose debugging flags left active in production...</p>
          </div>
        </div>

        {/* Educational Section */}
        <div className="bg-primary/5 p-8 rounded-xl relative overflow-hidden flex flex-col justify-center border border-primary/10">
          <div className="absolute -right-10 -bottom-10 opacity-5 rotate-12">
            <span className="material-symbols-outlined text-[180px]">school</span>
          </div>
          <h4 className="text-xl font-headline font-bold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">lightbulb</span>
            Pro-Tip: Reporting
          </h4>
          <p className="text-sm text-on-surface-variant leading-loose mb-6">
            In the pentesting lifecycle, the <span className="text-on-surface font-semibold">Report</span> is the only tangible product the client receives. It transforms deep-level exploits into a roadmap for remediation. Without clear documentation, even the most sophisticated hack provides zero defensive value.
          </p>
          <a className="text-xs font-bold text-primary flex items-center gap-2 hover:gap-3 transition-all uppercase tracking-widest" href="#">
            LEARN ABOUT REMEDIATION PLANNING <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Reports;
