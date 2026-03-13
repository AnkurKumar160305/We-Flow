import React, { useState, useEffect } from 'react';
import { X, Save, Upload, Copy, CheckCircle, RefreshCw, Plus, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import './SettingsDrawer.css';

const TABS = ['Sprint', 'Branding', 'Invites', 'Team', 'Milestones', 'Billing'];
const ACCENT_COLORS = ['#F36B21', '#0A84FF', '#28A745', '#DC3545', '#7B6BA8', '#C47B5A', '#3B8A8A', '#C49A3C'];

const SettingsDrawer = ({ onClose }) => {
  const { profile, workspace, settings, updateSettings, updateWorkspace, isFoundingCreator, refreshMembers, members } = useAuth();
  const [tab, setTab] = useState('Sprint');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  // Sprint tab state
  const [sprint, setSprint] = useState({
    sprint_name: settings?.sprint_name || '',
    sprint_start: settings?.sprint_start || '',
    sprint_end: settings?.sprint_end || '',
    north_star: settings?.north_star || '',
  });

  // Branding tab state
  const [brand, setBrand] = useState({
    name: workspace?.name || '',
    brand_color: workspace?.brand_color || '#F36B21',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(workspace?.logo_url || '');

  // Invite links
  const [inviteLinks, setInviteLinks] = useState({ creator: '', 'co-creator': '', observer: '' });
  const [copied, setCopied] = useState('');

  // Milestones
  const [milestones, setMilestones] = useState([]);
  const [newMile, setNewMile] = useState({ title: '', target_date: '' });

  const flash = (msg) => { setSaved(msg); setTimeout(() => setSaved(''), 2500); };

  useEffect(() => {
    if (profile?.workspace_id) {
      fetchInviteLinks();
      fetchMilestones();
    }
  }, [profile]);

  const fetchInviteLinks = async () => {
    const { data } = await supabase.from('invite_links').select('*').eq('workspace_id', profile.workspace_id).eq('is_active', true);
    if (data) {
      const map = {};
      data.forEach(l => map[l.role] = `${window.location.origin}/join/${l.token}`);
      setInviteLinks(map);
    }
  };

  const fetchMilestones = async () => {
    const { data } = await supabase.from('milestones').select('*').eq('workspace_id', profile.workspace_id).order('target_date');
    if (data) setMilestones(data);
  };

  const saveSprint = async () => {
    setSaving(true);
    await updateSettings(sprint);
    setSaving(false);
    flash('Sprint settings saved!');
  };

  const saveBranding = async () => {
    setSaving(true);
    let logoUrl = workspace?.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `logos/${profile.workspace_id}-${Date.now()}.${ext}`;
      await supabase.storage.from('workspace-assets').upload(path, logoFile, { upsert: true });
      const { data: pub } = supabase.storage.from('workspace-assets').getPublicUrl(path);
      logoUrl = pub.publicUrl;
    }
    await updateWorkspace({ name: brand.name, brand_color: brand.brand_color, logo_url: logoUrl });
    setSaving(false);
    flash('Branding updated!');
  };

  const regenerateLink = async (role) => {
    // Deactivate old
    await supabase.from('invite_links').update({ is_active: false }).eq('workspace_id', profile.workspace_id).eq('role', role);
    // Create new
    const { data } = await supabase.from('invite_links').insert({ workspace_id: profile.workspace_id, role, is_active: true }).select().single();
    if (data) setInviteLinks(prev => ({ ...prev, [role]: `${window.location.origin}/join/${data.token}` }));
  };

  const copyLink = (role) => {
    navigator.clipboard.writeText(inviteLinks[role] || '');
    setCopied(role);
    setTimeout(() => setCopied(''), 2000);
  };

  const addMilestone = async () => {
    if (!newMile.title) return;
    const { data } = await supabase.from('milestones').insert({ workspace_id: profile.workspace_id, ...newMile }).select().single();
    if (data) { setMilestones(m => [...m, data]); setNewMile({ title: '', target_date: '' }); }
  };

  const toggleMilestone = async (m) => {
    await supabase.from('milestones').update({ is_complete: !m.is_complete }).eq('id', m.id);
    setMilestones(ms => ms.map(x => x.id === m.id ? { ...x, is_complete: !x.is_complete } : x));
  };

  const deleteMilestone = async (id) => {
    await supabase.from('milestones').delete().eq('id', id);
    setMilestones(ms => ms.filter(x => x.id !== id));
  };

  const approvePending = async (pm) => {
    await supabase.from('pending_members').update({ status: 'approved', reviewed_by: profile.id }).eq('id', pm.id);
    // Would normally create user row here — simplified
    refreshMembers();
  };

  const declinePending = async (pm) => {
    await supabase.from('pending_members').update({ status: 'declined', reviewed_by: profile.id }).eq('id', pm.id);
    refreshMembers();
  };

  const completePct = milestones.length > 0 ? Math.round((milestones.filter(m => m.is_complete).length / milestones.length) * 100) : 0;

  const ROLE_CONFIG = {
    creator: { label: 'Creator', color: 'var(--col-todo)' },
    'co-creator': { label: 'Co-Creator', color: 'var(--brand)' },
    observer: { label: 'Observer', color: 'var(--ink-40)' },
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <motion.div className="settings-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.32 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {saved && <div className="auth-success settings-flash">{saved}</div>}

        {/* Tabs */}
        <div className="settings-tabs">
          {TABS.filter(t => {
            if (t === 'Branding' || t === 'Billing') return isFoundingCreator;
            return true;
          }).map(t => (
            <button key={t} className={`settings-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="settings-body">
          {/* === SPRINT === */}
          {tab === 'Sprint' && (
            <div className="settings-section">
              <div className="form-group">
                <label className="form-label">Sprint Name</label>
                <input className="form-input" value={sprint.sprint_name} onChange={e => setSprint(s => ({ ...s, sprint_name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={sprint.sprint_start} onChange={e => setSprint(s => ({ ...s, sprint_start: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={sprint.sprint_end} onChange={e => setSprint(s => ({ ...s, sprint_end: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">North Star Goal</label>
                <input className="form-input" value={sprint.north_star} onChange={e => setSprint(s => ({ ...s, north_star: e.target.value.slice(0, 120) }))} placeholder="Sprint goal (max 120 chars)" maxLength={120} />
                <span style={{ fontSize: 10, color: 'var(--ink-40)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{sprint.north_star?.length || 0}/120</span>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={saveSprint} disabled={saving}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <><Save size={13} /> Save Changes</>}
              </button>
            </div>
          )}

          {/* === BRANDING (Founding Creator only) === */}
          {tab === 'Branding' && isFoundingCreator && (
            <div className="settings-section">
              <div className="form-group">
                <label className="form-label">Workspace Name</label>
                <input className="form-input" value={brand.name} onChange={e => setBrand(b => ({ ...b, name: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Accent Colour</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {ACCENT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setBrand(b => ({ ...b, brand_color: c }))} style={{ width: 28, height: 28, borderRadius: 7, background: c, border: brand.brand_color === c ? '3px solid var(--ink-100)' : '3px solid transparent', transition: 'border 0.15s' }} />
                  ))}
                  <input type="color" value={brand.brand_color} onChange={e => setBrand(b => ({ ...b, brand_color: e.target.value }))} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', padding: 0 }} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Logo</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1.5px dashed var(--border-mid)', borderRadius: 10, padding: '12px 14px', background: 'var(--sur-01)' }}>
                  {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover' }} /> : <Upload size={16} color="var(--ink-40)" />}
                  <span style={{ fontSize: 12, color: 'var(--ink-60)', fontWeight: 500 }}>{logoFile ? logoFile.name : 'Click to change logo'}</span>
                  <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; setLogoFile(f); if (f) setLogoPreview(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
                </label>
              </div>
              {/* Live preview */}
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--sur-01)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: brand.brand_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13 }}>
                    {brand.name?.[0] || 'W'}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{brand.name || 'Your Workspace'}</span>
                  <span style={{ padding: '3px 10px', background: brand.brand_color, color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 700, marginLeft: 6 }}>Brand</span>
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={saveBranding} disabled={saving}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <><Save size={13} /> Save Branding</>}
              </button>
            </div>
          )}

          {/* === INVITES === */}
          {tab === 'Invites' && (
            <div className="settings-section">
              <p style={{ fontSize: 12, color: 'var(--ink-40)', marginBottom: 16, fontWeight: 500 }}>Share role-specific invite links. Regenerating invalidates the old link.</p>
              {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                <div key={role} style={{ marginBottom: 14, border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{cfg.label}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => copyLink(role)} style={{ gap: 4 }}>
                        {copied === role ? <CheckCircle size={11} color="var(--success)" /> : <Copy size={11} />}
                        {copied === role ? 'Copied!' : 'Copy'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => regenerateLink(role)} title="Regenerate (invalidates old)">
                        <RefreshCw size={11} />
                      </button>
                    </div>
                  </div>
                  <code style={{ fontSize: 10, color: 'var(--ink-60)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', display: 'block', background: 'var(--sur-01)', padding: '6px 8px', borderRadius: 6 }}>
                    {inviteLinks[role] || 'No link yet — click ↺ to generate'}
                  </code>
                </div>
              ))}
            </div>
          )}

          {/* === TEAM === */}
          {tab === 'Team' && (
            <div className="settings-section">
              <p style={{ fontSize: 12, color: 'var(--ink-40)', marginBottom: 12, fontWeight: 500 }}>{members.length} member{members.length !== 1 ? 's' : ''} in this workspace</p>
              {members.map(m => {
                const initials = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                const cfg = ROLE_CONFIG[m.role] || { label: m.role, color: 'var(--ink-40)' };
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.member_color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</div>
                    </div>
                    <div className="status-dot" style={{ background: m.status === 'active' ? 'var(--success)' : 'var(--sur-04)' }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* === MILESTONES === */}
          {tab === 'Milestones' && (
            <div className="settings-section">
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--sur-01)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-60)', marginBottom: 6 }}>Progress: {completePct}%</div>
                <div style={{ height: 6, background: 'var(--sur-03)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${completePct}%`, background: 'var(--brand)', borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
              </div>
              {/* Add milestone */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input className="form-input" style={{ flex: 1, minWidth: 0 }} value={newMile.title} onChange={e => setNewMile(m => ({ ...m, title: e.target.value }))} placeholder="Milestone name…" />
                <input className="form-input" style={{ width: 120, flexShrink: 0 }} type="date" value={newMile.target_date} onChange={e => setNewMile(m => ({ ...m, target_date: e.target.value }))} />
                <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={addMilestone}><Plus size={13} /></button>
              </div>
              {milestones.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <input type="checkbox" checked={m.is_complete} onChange={() => toggleMilestone(m)} style={{ accentColor: 'var(--success)', width: 16, height: 16, cursor: 'pointer' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, textDecoration: m.is_complete ? 'line-through' : 'none', color: m.is_complete ? 'var(--ink-40)' : 'var(--ink-100)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                    {m.target_date && <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-40)', marginTop: 2 }}>{new Date(m.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>}
                  </div>
                  <button className="icon-btn" onClick={() => deleteMilestone(m.id)} style={{ width: 24, height: 24, color: 'var(--error)' }}><Trash2 size={12} /></button>
                </div>
              ))}
              {milestones.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-40)', fontSize: 12, fontWeight: 500 }}>No milestones yet</div>}
            </div>
          )}

          {/* === BILLING (Founding Creator only) === */}
          {tab === 'Billing' && isFoundingCreator && (
            <div className="settings-section">
              <div style={{ padding: '20px', background: 'var(--sur-01)', borderRadius: 12, border: '1px solid var(--border-light)', marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Current Plan</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--brand)', marginBottom: 4 }}>Free</div>
                <div style={{ fontSize: 12, color: 'var(--ink-40)', fontWeight: 500 }}>3 seats · Kanban board · Monday Sync</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                {[
                  { name: 'Pro', price: '₹499/mo', seats: '10 seats', color: 'var(--col-todo)' },
                  { name: 'Team', price: '₹999/mo', seats: 'Unlimited', color: 'var(--brand)' },
                ].map(plan => (
                  <div key={plan.name} style={{ padding: '14px', borderRadius: 10, border: `2px solid ${plan.color}20`, marginBottom: 10, background: `${plan.color}08` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: plan.color }}>{plan.name}</span>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{plan.price}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-60)', fontWeight: 500 }}>{plan.seats} · Custom branding · Invite links · Approval workflow</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={() => window.open('https://stripe.com', '_blank')}>
                Manage Billing — Stripe Portal ↗
              </button>
              <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-40)', marginTop: 10, fontWeight: 500 }}>Annual plans available at 2 months free</p>
            </div>
          )}
        </div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SettingsDrawer;
