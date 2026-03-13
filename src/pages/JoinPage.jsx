import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const JoinPage = ({ token }) => {
  const [workspace, setWorkspace] = useState(null);
  const [link, setLink] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLink = async () => {
      const { data: linkData } = await supabase.from('invite_links').select('*, workspaces(*)').eq('token', token).eq('is_active', true).single();
      if (!linkData) { setError('This invite link is invalid or has expired.'); setLoading(false); return; }
      setLink(linkData);
      setWorkspace(linkData.workspaces);
      setLoading(false);
    };
    fetchLink();
  }, [token]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    const { error: err } = await supabase.from('pending_members').insert({
      workspace_id: link.workspace_id,
      name: form.name,
      email: form.email,
      role: link.role,
      token_used: token,
      status: 'pending',
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setSubmitted(true);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sur-01)' }}>
      <div className="spinner" />
    </div>
  );

  const ROLE_COLORS = { creator: '#0A84FF', 'co-creator': '#F36B21', observer: '#888' };
  const rColor = link ? (ROLE_COLORS[link.role] || '#888') : '#888';

  return (
    <div className="auth-page">
      <div style={{ background: 'var(--sur-00)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-light)', width: '100%', maxWidth: 420, padding: '40px 40px 32px' }}>
        {error && !submitted ? (
          <div style={{ textAlign: 'center' }}>
            <XCircle size={40} color="var(--error)" style={{ marginBottom: 12 }} />
            <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 8, color: 'var(--error)' }}>Invalid Link</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-60)', fontWeight: 500 }}>{error}</p>
          </div>
        ) : submitted ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--success)" style={{ marginBottom: 12 }} />
            <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Request Sent!</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-60)', fontWeight: 500 }}>A Creator in <strong>{workspace?.name}</strong> will review your request. You'll get an email when approved.</p>
          </div>
        ) : (
          <>
            {/* Workspace branding */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              {workspace?.logo_url
                ? <img src={workspace.logo_url} alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', marginBottom: 10 }} />
                : <div style={{ width: 56, height: 56, borderRadius: 12, background: workspace?.brand_color || 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 22, margin: '0 auto 10px' }}>{workspace?.name?.[0] || 'W'}</div>
              }
              <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>{workspace?.name}</h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 12px', background: `${rColor}15`, borderRadius: 20, border: `1px solid ${rColor}30` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: rColor }}>You're joining as {link?.role}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" required />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting} style={{ marginTop: 4 }}>
                {submitting ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Request to Join →'}
              </button>
            </form>
          </>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default JoinPage;
