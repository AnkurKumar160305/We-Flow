import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { Loader2, Upload, CheckCircle, Copy, RefreshCw } from 'lucide-react';

const STEPS = ['Brand', 'Sprint', 'Invite'];

const COLORS = ['#F36B21', '#0A84FF', '#28A745', '#DC3545', '#7B6BA8', '#C47B5A', '#3B8A8A', '#C49A3C'];

const OnboardingWizard = ({ signupName: propSignupName }) => {
  const { user, createWorkspace, createUserProfile, createSettings, workspace } = useAuth();
  const signupName = propSignupName || user?.user_metadata?.full_name;
  const [step, setStep] = useState(0); // 0,1,2
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Brand
  const [wsName, setWsName] = useState('');
  const [accentColor, setAccentColor] = useState('#F36B21');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Step 2 — Sprint
  const [sprintName, setSprintName] = useState('Sprint 1');
  const [sprintStart, setSprintStart] = useState(new Date().toISOString().split('T')[0]);
  const [sprintEnd, setSprintEnd] = useState('');
  const [northStar, setNorthStar] = useState('');

  // Step 3 — Invite links
  const [inviteLinks, setInviteLinks] = useState({ creator: '', cocreator: '', observer: '' });
  const [createdWorkspace, setCreatedWorkspace] = useState(null);
  const [copied, setCopied] = useState('');

  const handleLogoChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleStep1 = async e => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setError(''); setLoading(true);
    try {
      let logoUrl = null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `logos/${user.id}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('workspace-assets').upload(path, logoFile);
        if (!uploadErr) {
          const { data: pub } = supabase.storage.from('workspace-assets').getPublicUrl(path);
          logoUrl = pub.publicUrl;
        }
      }
      const { data: ws, error: wsErr } = await createWorkspace({ name: wsName, logoUrl, brandColor: accentColor });
      if (wsErr) throw new Error(wsErr.message);
      const { error: userErr } = await createUserProfile({ workspaceId: ws.id, name: signupName || user.email.split('@')[0], role: 'creator' });
      if (userErr) throw new Error(userErr.message);
      setCreatedWorkspace(ws);
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async e => {
    e.preventDefault();
    if (!sprintName || !sprintStart || !sprintEnd) return;
    setError(''); setLoading(true);
    try {
      const ws = createdWorkspace || workspace;
      const { error: settErr } = await createSettings({
        workspaceId: ws.id,
        sprintName,
        sprintStart,
        sprintEnd,
        northStar,
      });
      if (settErr) throw new Error(settErr.message);
      // Generate invite tokens
      const roles = ['creator', 'co-creator', 'observer'];
      const tokens = {};
      for (const role of roles) {
        const { data: link } = await supabase
          .from('invite_links')
          .insert({ workspace_id: ws.id, role, is_active: true })
          .select()
          .single();
        if (link) tokens[role] = `${window.location.origin}/join/${link.token}`;
      }
      setInviteLinks({ creator: tokens['creator'] || '', cocreator: tokens['co-creator'] || '', observer: tokens['observer'] || '' });
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 }, colors: ['#F36B21', '#28A745', '#fff', '#0A84FF'] });
    // AuthContext will detect profile + workspace exist → route to board
    setTimeout(() => window.location.reload(), 800);
  };

  const copyLink = (key, val) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="auth-page" style={{ background: 'var(--sur-01)' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i <= step ? 'var(--brand)' : 'var(--sur-03)',
                color: i <= step ? '#fff' : 'var(--ink-40)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, transition: 'background 0.3s'
              }}>{i < step ? <CheckCircle size={14} /> : i + 1}</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: i <= step ? 'var(--ink-100)' : 'var(--ink-40)' }}>{s}</span>
              {i < 2 && <div style={{ width: 32, height: 2, background: i < step ? 'var(--brand)' : 'var(--sur-03)', marginLeft: 4, transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--sur-00)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-light)', padding: '40px 40px 32px' }}>
          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* STEP 0 — BRAND */}
          {step === 0 && (
            <form onSubmit={handleStep1}>
              <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Setup your workspace</h2>
              <p style={{ color: 'var(--ink-40)', fontSize: 13, marginBottom: 28, fontWeight: 500 }}>Brand it to make it yours</p>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Workspace Name *</label>
                <input className="form-input" value={wsName} onChange={e => setWsName(e.target.value)} placeholder="e.g. InHive Studio" required maxLength={60} />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Accent Colour</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setAccentColor(c)} style={{
                      width: 32, height: 32, borderRadius: 8, background: c,
                      border: accentColor === c ? '3px solid var(--ink-100)' : '3px solid transparent',
                      transition: 'border 0.15s', outline: 'none',
                    }} />
                  ))}
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 0 }} title="Custom colour" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 28 }}>
                <label className="form-label">Logo (optional)</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1.5px dashed var(--border-mid)', borderRadius: 10, padding: '14px 16px', background: 'var(--sur-01)' }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                    : <div style={{ width: 40, height: 40, borderRadius: 8, background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Upload size={16} color="white" /></div>
                  }
                  <span style={{ fontSize: 13, color: 'var(--ink-60)', fontWeight: 500 }}>{logoFile ? logoFile.name : 'Click to upload logo'}</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Continue — Set Sprint →'}
              </button>
            </form>
          )}

          {/* STEP 1 — SPRINT */}
          {step === 1 && (
            <form onSubmit={handleStep2}>
              <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Set up your sprint</h2>
              <p style={{ color: 'var(--ink-40)', fontSize: 13, marginBottom: 28, fontWeight: 500 }}>Define your current sprint goal and timeline</p>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Sprint Name *</label>
                <input className="form-input" value={sprintName} onChange={e => setSprintName(e.target.value)} placeholder="Sprint 1" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input className="form-input" type="date" value={sprintStart} onChange={e => setSprintStart(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input className="form-input" type="date" value={sprintEnd} onChange={e => setSprintEnd(e.target.value)} required min={sprintStart} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 28 }}>
                <label className="form-label">North Star Goal <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(Optional, max 120 chars)</span></label>
                <input className="form-input" value={northStar} onChange={e => setNorthStar(e.target.value)} placeholder="e.g. Ship MVP by end of sprint" maxLength={120} />
                <span style={{ fontSize: 10, color: 'var(--ink-40)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{northStar.length}/120</span>
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Continue — Invite Team →'}
              </button>
            </form>
          )}

          {/* STEP 2 — INVITE */}
          {step === 2 && (
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Invite your team</h2>
              <p style={{ color: 'var(--ink-40)', fontSize: 13, marginBottom: 28, fontWeight: 500 }}>Share role-specific links — this step is optional</p>

              {[
                { key: 'creator', label: 'Creator Link', role: 'Creator', desc: 'Full board + approval access', color: 'var(--col-todo)' },
                { key: 'cocreator', label: 'Co-Creator Link', role: 'Co-Creator', desc: 'Submit tasks for approval', color: 'var(--brand)' },
                { key: 'observer', label: 'Observer Link', role: 'Observer', desc: 'Read-only view', color: 'var(--ink-40)' },
              ].map(({ key, label, role, desc, color }) => (
                <div key={key} style={{ marginBottom: 12, border: '1px solid var(--border-light)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, color }}>{role}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-40)', marginLeft: 8, fontWeight: 500 }}>{desc}</span>
                    </div>
                    <button onClick={() => copyLink(key, inviteLinks[key])} className="btn btn-secondary btn-sm" style={{ gap: 4 }}>
                      {copied === key ? <CheckCircle size={12} color="var(--success)" /> : <Copy size={12} />}
                      {copied === key ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <code style={{ fontSize: 10, color: 'var(--ink-60)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', display: 'block', background: 'var(--sur-01)', padding: '6px 8px', borderRadius: 6 }}>
                    {inviteLinks[key] || 'Generating...'}
                  </code>
                </div>
              ))}

              <button className="btn btn-primary btn-lg btn-full" style={{ marginTop: 16 }} onClick={handleFinish}>
                🚀 Launch Board
              </button>
              <button className="btn btn-ghost btn-full" style={{ marginTop: 8, fontSize: 12 }} onClick={handleFinish}>
                Skip — I'll invite later
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OnboardingWizard;
