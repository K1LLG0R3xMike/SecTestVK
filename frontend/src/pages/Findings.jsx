import React, { useEffect, useState } from 'react';
import {
  getScans,
  getAttackVectorAnalysis,
  requestAttackVectorAnalysis,
  getAttackVectorAnalysisStatus,
} from '../services/api';

const Findings = () => {
  const [scansWithFindings, setScansWithFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedScans, setExpandedScans] = useState({});
  const [analysisByScan, setAnalysisByScan] = useState({});
  const [analysisLoadingByScan, setAnalysisLoadingByScan] = useState({});
  const [analysisErrorByScan, setAnalysisErrorByScan] = useState({});

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

  const pollAnalysis = async (scanId, taskId) => {
    const maxAttempts = 40;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const status = await getAttackVectorAnalysisStatus(scanId, taskId);

        if (status.status === 'completed' && status.analysis) {
          setAnalysisByScan(prev => ({ ...prev, [scanId]: status.analysis }));
          setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: false }));
          return;
        }

        if (status.status === 'failed') {
          setAnalysisErrorByScan(prev => ({
            ...prev,
            [scanId]: status.error || 'Analysis failed',
          }));
          setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: false }));
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setAnalysisErrorByScan(prev => ({
            ...prev,
            [scanId]: 'Analysis timeout. Try again.',
          }));
          setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: false }));
        }
      } catch (error) {
        setAnalysisErrorByScan(prev => ({
          ...prev,
          [scanId]: error?.response?.data?.detail || error.message || 'Error polling analysis',
        }));
        setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: false }));
      }
    };

    poll();
  };

  const handleAnalyzeVectors = async (scanId) => {
    setAnalysisErrorByScan(prev => ({ ...prev, [scanId]: null }));
    setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: true }));

    try {
      const cached = await getAttackVectorAnalysis(scanId);
      if (cached.status === 'available' && cached.analysis) {
        setAnalysisByScan(prev => ({ ...prev, [scanId]: cached.analysis }));
        setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: false }));
        return;
      }
    } catch (_) {
      // Continue with fresh analysis request.
    }

    try {
      const result = await requestAttackVectorAnalysis(scanId, 'claude');
      if (result.status === 'cached' && result.analysis) {
        setAnalysisByScan(prev => ({ ...prev, [scanId]: result.analysis }));
        setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: false }));
        return;
      }

      if (result.status === 'queued' && result.task_id) {
        pollAnalysis(scanId, result.task_id);
        return;
      }

      setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: false }));
    } catch (error) {
      setAnalysisErrorByScan(prev => ({
        ...prev,
        [scanId]: error?.response?.data?.detail || error.message || 'Error starting analysis',
      }));
      setAnalysisLoadingByScan(prev => ({ ...prev, [scanId]: false }));
    }
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
                  <section className="bg-surface-container-high rounded-xl border border-outline-variant/15 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h4 className="font-headline text-lg font-bold text-on-surface">Attack Vector Analysis</h4>
                        <p className="text-xs text-on-surface-variant">AI-based chaining of findings into potential attack paths.</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyzeVectors(scan.id);
                        }}
                        disabled={analysisLoadingByScan[scan.id]}
                        className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-60"
                      >
                        {analysisLoadingByScan[scan.id] ? 'Analyzing...' : 'Analyze Attack Vectors'}
                      </button>
                    </div>

                    {analysisErrorByScan[scan.id] && (
                      <p className="mt-3 text-xs text-error">{analysisErrorByScan[scan.id]}</p>
                    )}

                    {analysisByScan[scan.id] && (
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[10px] px-2 py-1 rounded border border-primary/40 text-primary font-bold uppercase">
                            Risk Score: {analysisByScan[scan.id].risk_score}/10
                          </span>
                          <span className="text-[10px] px-2 py-1 rounded border border-outline-variant/30 text-on-surface-variant font-bold uppercase">
                            {analysisByScan[scan.id].combined_risk || 'N/A'}
                          </span>
                        </div>

                        <p className="text-on-surface-variant">{analysisByScan[scan.id].summary}</p>

                        {Array.isArray(analysisByScan[scan.id].attack_vectors) && analysisByScan[scan.id].attack_vectors.length > 0 && (
                          <div className="space-y-2">
                            {analysisByScan[scan.id].attack_vectors.map((vector, idx) => (
                              <div key={`${scan.id}-vector-${idx}`} className="bg-surface-container-lowest rounded-lg border border-outline-variant/10 p-3">
                                <p className="font-bold text-on-surface">{vector.name}</p>
                                <p className="text-xs text-on-surface-variant mt-1">{vector.description}</p>
                                <p className="text-[10px] uppercase mt-2 text-primary font-bold">Probability: {vector.probability} | Impact: {vector.impact}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {Array.isArray(analysisByScan[scan.id].recommendations) && analysisByScan[scan.id].recommendations.length > 0 && (
                          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/10 p-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Recommendations</p>
                            <ul className="list-disc pl-5 space-y-1 text-xs text-on-surface-variant">
                              {analysisByScan[scan.id].recommendations.map((rec, idx) => (
                                <li key={`${scan.id}-rec-${idx}`}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </section>

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
