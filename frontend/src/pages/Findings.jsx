import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Findings = () => {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFindings = async () => {
      try {
        // Asumiendo que agregaremos un endpoint /findings/ en el futuro
        // Por ahora, si no existe, fallará silenciosamente
        const response = await api.get('/scans/'); // Obtenemos scans y de ahí findings
        const allFindings = response.data.flatMap(scan => scan.findings || []);
        setFindings(allFindings);
      } catch (error) {
        console.error('Error fetching findings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFindings();
  }, []);

  return (
    <div className="pt-8 p-4 md:p-8 max-w-6xl mx-auto w-full pb-32">
      {/* Header Section with Asymmetric Layout */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-on-surface mb-4">Vulnerability <span className="text-primary">Registry</span></h2>
          <p className="text-on-surface-variant leading-relaxed">System-wide analysis of security posture. Prioritize fixes based on risk severity and explore educational resources to strengthen your architecture.</p>
        </div>
      </section>

      {/* Findings List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-20">
            <p className="text-on-surface-variant animate-pulse">Analyzing security database...</p>
          </div>
        ) : findings.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-20 text-center border-2 border-dashed border-outline-variant/20">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">gpp_good</span>
            <h2 className="text-xl font-headline font-semibold text-on-surface">No vulnerabilities found</h2>
            <p className="text-on-surface-variant mt-2">Clean sheet! Your infrastructure appears secure for now.</p>
          </div>
        ) : (
          findings.map((finding) => (
            <article key={finding.id} className="bg-surface-container-low rounded-xl overflow-hidden group hover:bg-surface-container transition-all duration-300">
              {/* Contenido del finding dinámico */}
            </article>
          ))
        )}
      </div>

      {/* Secondary Content */}
      <section className="mt-16 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-2xl border border-primary/5 relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="text-2xl font-headline font-bold mb-4">Master Security Concepts</h4>
            <p className="text-on-surface-variant mb-6 max-w-md">Our integrated learning paths transform these vulnerabilities into teaching moments. Learn to code securely while you secure your infrastructure.</p>
            <button className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity uppercase tracking-widest">Explore OWASP Academy</button>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10">
            <span className="material-symbols-outlined text-[160px] fill-1">security</span>
          </div>
        </div>
        <div className="bg-surface-container-high p-8 rounded-2xl flex flex-col justify-center text-center">
          <p className="text-4xl font-headline font-extrabold text-primary mb-2">14</p>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Active Issues</p>
          <div className="h-1 bg-surface-container-highest my-6 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3"></div>
          </div>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">68% resolution rate since last scan</p>
        </div>
      </section>
    </div>
  );
};

export default Findings;
