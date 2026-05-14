import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  getScripts, createScript, updateScript, deleteScript,
  getToolConfigs, updateToolConfig, resetToolConfig,
} from '../services/api';

const LANG_META = {
  python: { label: 'Python', icon: 'code', color: 'text-yellow-400' },
  bash:   { label: 'Bash',   icon: 'terminal', color: 'text-green-400' },
};

const EMPTY_SCRIPT = { name: '', description: '', language: 'python', code: '', enabled: true, timeout: 60 };

const SCRIPT_PLACEHOLDER = `# Output findings as JSON lines to stdout.
# Each line must be a valid JSON object with these fields:
#   title       (str, required)
#   description (str, required)
#   severity    (str, required) — critical | high | medium | low | info
#   evidence    (str, optional)
#
# Example:
import sys, json, subprocess

target = sys.argv[1]
result = subprocess.run(["curl", "-sI", target], capture_output=True, text=True)

if "X-Frame-Options" not in result.stdout:
    print(json.dumps({
        "title": "Missing X-Frame-Options Header",
        "description": f"Target {target} does not set X-Frame-Options.",
        "severity": "medium",
        "evidence": result.stdout[:300],
    }))
`;

export default function Scripts() {
  const [tab, setTab] = useState('scripts');   // 'scripts' | 'toolconfigs'

  // ── Custom Scripts state ─────────────────────────────────────────────────
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [form, setForm] = useState(EMPTY_SCRIPT);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  // ── Tool Configs state ───────────────────────────────────────────────────
  const [toolConfigs, setToolConfigs] = useState([]);
  const [editingTool, setEditingTool] = useState(null);   // tool_name being edited
  const [toolDraft, setToolDraft] = useState('');
  const [toolSaving, setToolSaving] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────
  const fetchScripts = useCallback(async () => {
    try { setScripts(await getScripts()); } catch (e) { console.error(e); }
  }, []);

  const fetchToolConfigs = useCallback(async () => {
    try { setToolConfigs(await getToolConfigs()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchScripts(); fetchToolConfigs(); }, [fetchScripts, fetchToolConfigs]);

  // ── Script editor helpers ────────────────────────────────────────────────
  const selectScript = (s) => { setSelectedScript(s); setForm({ ...s }); setIsNew(false); };

  const newScript = () => {
    setSelectedScript(null);
    setForm({ ...EMPTY_SCRIPT });
    setIsNew(true);
  };

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.target;
      const next = value.substring(0, selectionStart) + '    ' + value.substring(selectionEnd);
      setForm(f => ({ ...f, code: next }));
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 4;
      });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const lang = ext === 'py' ? 'python' : ext === 'sh' ? 'bash' : form.language;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({
        ...f,
        code: ev.target.result,
        language: lang,
        name: f.name || file.name.replace(/\.[^.]+$/, ''),
      }));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await createScript(form);
        await fetchScripts();
        selectScript(created);
        setIsNew(false);
      } else {
        const updated = await updateScript(selectedScript.id, form);
        await fetchScripts();
        selectScript(updated);
      }
    } catch (e) {
      alert('Error saving script: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedScript) return;
    if (!window.confirm(`Delete script "${selectedScript.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteScript(selectedScript.id);
      setSelectedScript(null);
      setForm(EMPTY_SCRIPT);
      setIsNew(false);
      await fetchScripts();
    } finally {
      setDeleting(false);
    }
  };

  // ── Tool config helpers ──────────────────────────────────────────────────
  const startEditTool = (tc) => { setEditingTool(tc.tool_name); setToolDraft(tc.command_template); };
  const cancelEditTool = () => { setEditingTool(null); setToolDraft(''); };

  const handleSaveTool = async (tc) => {
    if (!toolDraft.includes('{target}')) {
      alert('Command must contain {target}');
      return;
    }
    setToolSaving(true);
    try {
      await updateToolConfig(tc.tool_name, {
        command_template: toolDraft,
        description: tc.description,
        enabled: tc.enabled,
      });
      await fetchToolConfigs();
      cancelEditTool();
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setToolSaving(false);
    }
  };

  const handleResetTool = async (toolName) => {
    if (!window.confirm(`Reset "${toolName}" to default command?`)) return;
    try {
      await resetToolConfig(toolName);
      await fetchToolConfigs();
      if (editingTool === toolName) cancelEditTool();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleToggleTool = async (tc) => {
    try {
      await updateToolConfig(tc.tool_name, {
        command_template: tc.command_template,
        description: tc.description,
        enabled: !tc.enabled,
      });
      await fetchToolConfigs();
    } catch (e) {
      console.error(e);
    }
  };

  const isDirty = isNew
    ? Object.keys(EMPTY_SCRIPT).some(k => form[k] !== EMPTY_SCRIPT[k])
    : selectedScript && Object.keys(form).some(k => form[k] !== selectedScript[k]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="pt-8 pb-24 min-h-screen px-4 lg:px-8 max-w-7xl mx-auto">

      {/* Header */}
      <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold tracking-tight text-on-background">Scripts</h1>
          <p className="text-on-surface-variant text-lg mt-1">Customize tool commands and manage custom scan scripts.</p>
        </div>
        {tab === 'scripts' && (
          <button onClick={newScript} className="bg-primary text-on-primary px-4 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 transition-all">
            <span className="material-symbols-outlined">add_circle</span>New Script
          </button>
        )}
      </section>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-container-low p-1 rounded-xl w-fit">
        {[
          { key: 'scripts',     label: 'Custom Scripts', icon: 'code'     },
          { key: 'toolconfigs', label: 'Tool Commands',  icon: 'settings' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === t.key ? 'bg-primary text-on-primary shadow' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Custom Scripts ─────────────────────────────────────────── */}
      {tab === 'scripts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Script list */}
          <aside className="lg:col-span-4 space-y-2">
            {scripts.length === 0 && !isNew && (
              <div className="bg-surface-container-low rounded-xl p-8 text-center border-2 border-dashed border-outline-variant/20">
                <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">code_off</span>
                <p className="text-on-surface-variant text-sm">No scripts yet.</p>
                <button onClick={newScript} className="mt-3 text-primary text-sm font-bold hover:underline">Create your first script →</button>
              </div>
            )}
            {isNew && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/40">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">New Script</p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{form.name || 'Untitled'}</p>
              </div>
            )}
            {scripts.map(s => (
              <div
                key={s.id}
                onClick={() => selectScript(s)}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  !isNew && selectedScript?.id === s.id
                    ? 'bg-surface-container-high border-primary'
                    : 'bg-surface-container-low border-outline-variant/10 hover:border-outline-variant/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold truncate max-w-[180px]">{s.name}</p>
                  <span className={`text-[10px] font-mono ${LANG_META[s.language]?.color}`}>{s.language}</span>
                </div>
                {s.description && <p className="text-xs text-on-surface-variant mt-1 truncate">{s.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.enabled ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                  <span className="text-[10px] text-on-surface-variant">{s.enabled ? 'enabled' : 'disabled'}</span>
                </div>
              </div>
            ))}
          </aside>

          {/* Editor */}
          <div className="lg:col-span-8">
            {!isNew && !selectedScript ? (
              <div className="bg-surface-container-low rounded-xl p-20 text-center border-2 border-dashed border-outline-variant/20">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">integration_instructions</span>
                <p className="text-on-surface-variant">Select a script or create a new one.</p>
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                {/* Meta fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Name *</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm border-none focus:ring-2 focus:ring-primary outline-none"
                      placeholder="my-custom-scanner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Language</label>
                    <select
                      value={form.language}
                      onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm border-none focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="python">Python</option>
                      <option value="bash">Bash</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Description</label>
                    <input
                      value={form.description || ''}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm border-none focus:ring-2 focus:ring-primary outline-none"
                      placeholder="What this script does..."
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Timeout (s)</label>
                      <input
                        type="number" min="5" max="300"
                        value={form.timeout}
                        onChange={e => setForm(f => ({ ...f, timeout: parseInt(e.target.value) || 60 }))}
                        className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm border-none focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div className="flex flex-col justify-end pb-0.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.enabled}
                          onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Enabled</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Code editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Code *</label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-bold"
                    >
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      Upload file
                    </button>
                    <input ref={fileInputRef} type="file" accept=".py,.sh,.bash" className="hidden" onChange={handleFileUpload} />
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-outline-variant/20">
                    <div className="bg-[#0c0e16] px-4 py-1.5 flex items-center gap-2 border-b border-outline-variant/10">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-error-dim/40"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-secondary-dim/40"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-fixed-dim/40"></div>
                      </div>
                      <span className={`text-[10px] font-mono ml-1 ${LANG_META[form.language]?.color}`}>
                        {LANG_META[form.language]?.label} · target = sys.argv[1]
                      </span>
                    </div>
                    <textarea
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                      onKeyDown={handleTabKey}
                      placeholder={SCRIPT_PLACEHOLDER}
                      spellCheck={false}
                      className="w-full h-72 bg-[#000000]/95 text-green-400 font-mono text-xs p-4 resize-none outline-none leading-relaxed"
                    />
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1.5">
                    Output one JSON object per line: <code className="text-primary">{"{"}"title","description","severity","evidence"{"}"}</code>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    {!isNew && (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-1.5 text-sm text-error/70 hover:text-error transition-colors font-bold"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.name.trim() || !form.code.trim()}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                      isDirty
                        ? 'bg-primary text-on-primary hover:brightness-110 shadow-primary/20'
                        : 'bg-surface-container-highest text-on-surface-variant cursor-default'
                    } disabled:opacity-50`}
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    {saving ? 'Saving...' : isNew ? 'Create Script' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Tool Commands ──────────────────────────────────────────── */}
      {tab === 'toolconfigs' && (
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant mb-4">
            Customize the command each tool uses. Use <code className="text-primary bg-primary/10 px-1 rounded">{"{"+"target}"}</code> as the placeholder for the scan target.
            Changes take effect on the next scan.
          </p>

          {toolConfigs.map(tc => (
            <div key={tc.tool_name} className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleTool(tc)}
                    className={`w-9 h-5 rounded-full transition-colors shrink-0 ${tc.enabled ? 'bg-primary' : 'bg-outline-variant/40'}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow mx-0.5 transition-transform ${tc.enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </button>
                  <div>
                    <p className="font-bold text-sm uppercase tracking-wider">{tc.tool_name}</p>
                    {tc.description && <p className="text-xs text-on-surface-variant">{tc.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tc.id !== 0 && (
                    <button
                      onClick={() => handleResetTool(tc.tool_name)}
                      className="text-xs text-on-surface-variant hover:text-on-surface px-2 py-1 rounded-lg hover:bg-surface-container-high transition-colors"
                    >
                      Reset
                    </button>
                  )}
                  {editingTool !== tc.tool_name ? (
                    <button
                      onClick={() => startEditTool(tc)}
                      className="flex items-center gap-1 text-xs text-primary font-bold px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={cancelEditTool} className="text-xs text-on-surface-variant px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors">Cancel</button>
                      <button
                        onClick={() => handleSaveTool(tc)}
                        disabled={toolSaving}
                        className="text-xs text-on-primary font-bold px-3 py-1.5 rounded-lg bg-primary hover:brightness-110 transition-all disabled:opacity-50"
                      >
                        {toolSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                {editingTool === tc.tool_name ? (
                  <input
                    value={toolDraft}
                    onChange={e => setToolDraft(e.target.value)}
                    className="w-full bg-[#0c0e16] text-green-400 font-mono text-xs px-4 py-3 rounded-lg border border-primary/40 outline-none focus:ring-2 focus:ring-primary"
                    spellCheck={false}
                  />
                ) : (
                  <code className="block text-xs font-mono text-on-surface-variant bg-surface-container-high px-4 py-2.5 rounded-lg truncate">
                    {tc.command_template}
                  </code>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
