import React, { useEffect, useState } from 'react';
import { getScans } from '../services/api';

const Findings = () => {
  const [scansWithFindings, setScansWithFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedScans, setExpandedScans] = useState({});

  useEffect(() => {
    const fetchFindings = async () => {
      try {
        const scans = await getScans();
        // Solo nos interesan los scans que tienen findings y están completados
        const filteredScans = scans
          .filter(scan => scan.findings && scan.findings.length > 0)
          .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        
        setScansWithFindings(filteredScans);
        
        // Expandir el primero por defecto
        if (filteredScans.length > 0) {
          setExpandedScans({ [filteredScans[0].id]: true });
        }
      } catch (error) {
        console.error('Error fetching findings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFindings();
  }, []);

  const toggleScan = (scanId) => {
    setExpandedScans(prev => ({
      ...prev,
      [scanId]: !prev[scanId]
    }));
  };

  const getSeverityStyles = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-error/20 text-error border-error/30';
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      default: return 'bg-surface-container-highest text-on-surface-variant border-outline-variant';
    }
  };

  return (
    <div className="pt-8 p-4 md:p-8 max-w-6xl mx-auto w-full pb-32">
      {/* Header Section */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-on-surface mb-4">Security <span className="text-primary">Registry</span></h2>
          <p className="text-on-surface-variant leading-relaxed">Findings grouped by target and scan session. Review detected vulnerabilities and open ports for each asset.</p>
        </div>
        <div className="bg-surface-container-high px-6 py-4 rounded-2xl border border-outline-variant/10 text-right">
          <p className="text-3xl font-headline font-bold text-primary">{scansWithFindings.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Active Targets</p>
        </div>
      </section>

      {/* Grouped Findings List */}
      <div className="space-y-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-on-surface-variant animate-pulse font-mono text-sm">Organizing findings by asset...</p>
          </div>
        ) : scansWithFindings.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-20 text-center border-2 border-dashed border-outline-variant/20">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">gpp_good</span>
            <h2 className="text-xl font-headline font-semibold text-on-surface">No vulnerabilities found</h2>
            <p className="text-on-surface-variant mt-2">All scanned targets appear secure for now.</p>
          </div>
        ) : (
          scansWithFindings.map((scan) => (
            <div key={scan.id} className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden shadow-sm">
              {/* Scan/Target Header - Collapsible */}
              <div 
                onClick={() => toggleScan(scan.id)}
                className="p-6 bg-surface-container-high cursor-pointer flex items-center justify-between hover:bg-surface-container-highest transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <span className="material-symbols-outlined text-primary">language</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-headline text-on-surface">
                      {scan.target?.url_or_ip || `Scan #${scan.id}`}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant font-mono mt-1">
                      <span>{new Date(scan.start_time).toLocaleString()}</span>
                      <span>•</span>
                      <span className="text-primary font-bold">{scan.findings.length} Findings</span>
                    </div>
                  </div>
                </div>
                <span className={`material-symbols-outlined transition-transform duration-300 ${expandedScans[scan.id] ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>

              {/* Findings Sub-list */}
              {expandedScans[scan.id] && (
                <div className="p-6 space-y-4 border-t border-outline-variant/10">
                  {scan.findings.map((finding) => (
                    <article key={finding.id} className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl overflow-hidden group hover:border-primary/20 transition-all">
                      <div className="p-5">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getSeverityStyles(finding.severity)}`}>
                              {finding.severity}
                            </span>
                            <span className="text-[9px] font-mono text-on-surface-variant uppercase tracking-wider bg-surface-container-highest px-2 py-0.5 rounded">
                              {finding.tool}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold font-headline text-on-surface mb-2">
                          {finding.title}
                        </h4>
                        <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
                          {finding.description}
                        </p>
                        {finding.evidence && (
                          <details className="group/evidence">
                            <summary className="cursor-pointer text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-80 transition-opacity">
                              <span className="material-symbols-outlined text-xs group-open/evidence:rotate-90 transition-transform">chevron_right</span>
                              Technical Evidence
                            </summary>
                            <div className="mt-3 bg-black/95 p-4 rounded-lg font-mono text-[10px] text-green-400 overflow-x-auto border border-white/5">
                              <pre>{finding.evidence}</pre>
                            </div>
                          </details>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Findings;
