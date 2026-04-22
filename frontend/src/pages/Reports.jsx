import React, { useState, useEffect } from 'react';
import { getScans, getDashboardStats, downloadReportPdf } from '../services/api';

const Reports = () => {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scansData, statsData] = await Promise.all([
          getScans(),
          getDashboardStats()
        ]);
        setScans(scansData);
        setStats(statsData);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownload = async (scanId) => {
    try {
      setDownloadingId(scanId);
      const blob = await downloadReportPdf(scanId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_scan_${scanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Error generating PDF report. Make sure the scan is completed and AI is configured.");
    } finally {
      setDownloadingId(null);
    }
  };

  const completedScans = scans.filter(s => s.status === 'completed');
  const latestScan = completedScans.length > 0 ? completedScans[0] : null;

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
              <span className="text-5xl font-headline font-extrabold text-primary">{stats?.security_score || 'N/A'}</span>
            </div>
            <div className="h-12 w-[1px] bg-outline-variant/30"></div>
            <div className="flex flex-col">
              <span className="text-xs text-on-surface font-medium">Project: {latestScan?.target?.url_or_ip || 'No scans'}</span>
              <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-tighter">
                {latestScan ? new Date(latestScan.start_time).toLocaleString() : '--'}
              </span>
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
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest mb-3 inline-block">
                {latestScan ? 'Draft Ready' : 'No Data'}
              </span>
              <h3 className="text-2xl font-headline font-bold">Executive Summary</h3>
            </div>
            <div className="flex gap-2">
              {latestScan && (
                <button 
                  onClick={() => handleDownload(latestScan.id)}
                  disabled={downloadingId === latestScan.id}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest hover:bg-surface-bright transition-colors rounded-lg text-sm text-on-surface disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">
                    {downloadingId === latestScan.id ? 'sync' : 'picture_as_pdf'}
                  </span> 
                  {downloadingId === latestScan.id ? 'Generating...' : 'PDF'}
                </button>
              )}
            </div>
          </div>
          {/* Preview Canvas */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 font-serif italic text-on-surface-variant/80 space-y-4">
            <p className="text-lg text-on-surface not-italic font-headline font-semibold">1. OVERVIEW</p>
            <p>
              {latestScan 
                ? `The security assessment conducted on the ${latestScan.target.url_or_ip} environment identified several findings. This report provides a comprehensive analysis of the vulnerabilities detected and strategic recommendations for remediation.`
                : "No completed scans found. Start a scan to generate an AI-powered executive summary."
              }
            </p>
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="h-2 bg-error/20 rounded-full overflow-hidden"><div className="h-full bg-error" style={{width: stats?.severity_distribution?.critical ? '100%' : '0%'}}></div></div>
              <div className="h-2 bg-secondary/20 rounded-full overflow-hidden"><div className="h-full bg-secondary" style={{width: stats?.severity_distribution?.high ? '100%' : '0%'}}></div></div>
              <div className="h-2 bg-primary/20 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{width: stats?.severity_distribution?.medium ? '100%' : '0%'}}></div></div>
            </div>
          </div>
        </div>

        {/* Previous Reports Archive */}
        <div className="bg-surface-container-high p-6 rounded-xl">
          <h3 className="text-lg font-headline font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            Archive
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-sm text-on-surface-variant italic">Loading reports...</p>
            ) : completedScans.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">No completed reports yet.</p>
            ) : (
              completedScans.map(scan => (
                <div key={scan.id} className="group p-4 bg-surface-container-low rounded-lg hover:bg-surface-container-highest transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-on-surface-variant uppercase tracking-tighter">
                      REP_{new Date(scan.start_time).toISOString().split('T')[0].replace(/-/g, '_')}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter ${
                      scan.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-error-container/20 text-on-error-container'
                    }`}>
                      {scan.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-3 truncate">{scan.target?.url_or_ip}</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleDownload(scan.id)}
                      disabled={downloadingId === scan.id}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold uppercase tracking-widest disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {downloadingId === scan.id ? 'sync' : 'download'}
                      </span> 
                      PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-6 py-3 border border-outline-variant/20 rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-surface-container-highest transition-colors">
            View Full History
          </button>
        </div>

        {/* Technical Report Preview */}
        <div className="lg:col-span-2 bg-surface-container-low p-8 rounded-xl border-l-4 border-secondary">
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest mb-3 inline-block ${
                latestScan?.findings?.length > 0 
                  ? 'bg-secondary/10 text-secondary' 
                  : 'bg-outline-variant/10 text-on-surface-variant'
              }`}>
                {latestScan?.findings?.length > 0 ? 'Findings Detected' : 'No Findings'}
              </span>
              <h3 className="text-2xl font-headline font-bold">Technical Report</h3>
            </div>
            <div className="flex gap-2">
              {latestScan && (
                <button 
                  onClick={() => handleDownload(latestScan.id)}
                  disabled={downloadingId === latestScan.id}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest hover:bg-surface-bright transition-colors rounded-lg text-sm text-on-surface disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">
                    {downloadingId === latestScan.id ? 'sync' : 'picture_as_pdf'}
                  </span> 
                  PDF
                </button>
              )}
            </div>
          </div>
          {/* Code Block Preview */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 font-mono text-xs text-on-surface-variant leading-relaxed">
            {latestScan?.findings?.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4 text-secondary">
                  <span className="material-symbols-outlined text-sm">bug_report</span>
                  <span>Latest Finding: {latestScan.findings[0].title}</span>
                </div>
                <p className="text-on-surface mb-2 font-bold">TOOL SOURCE:</p>
                <p className="pl-4 border-l-2 border-outline-variant/30 mb-4 italic">
                  {latestScan.findings[0].tool}
                </p>
                <p className="text-on-surface mb-2 font-bold">EVIDENCE:</p>
                <p className="whitespace-pre-wrap line-clamp-4">
                  {latestScan.findings[0].evidence || "No evidence snippet available."}
                </p>
              </>
            ) : (
              <div className="text-center py-8 opacity-50 italic">
                No technical details to preview. Complete a scan to see findings here.
              </div>
            )}
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
