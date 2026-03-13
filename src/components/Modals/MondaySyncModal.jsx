import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const MondaySyncModal = ({ onClose }) => {
  const { profile, workspace } = useAuth();
  const [form, setForm] = useState({ wins: '', blockers: '', focus: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    // Store as a notification-type event in settings or a log table
    // For now save in settings.monday_sync_notes
    await supabase.from('settings').update({
      monday_sync_notes: JSON.stringify({ ...form, by: profile?.name, at: new Date().toISOString() })
    }).eq('workspace_id', profile?.workspace_id);
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-box" style={{ maxWidth: 460 }} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="var(--success)" />
            <h3 className="modal-title">Monday Sync</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-40)', marginBottom: 20, fontWeight: 500 }}>Weekly team check-in — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

        {saved ? (
          <div className="auth-success" style={{ textAlign: 'center', padding: '20px' }}>
            ✓ Week sync recorded. Team is aligned!
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">🏆 Wins from last week</label>
              <textarea className="form-input" value={form.wins} onChange={e => set('wins', e.target.value)} placeholder="What did we ship or accomplish?" rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">🚧 Current blockers</label>
              <textarea className="form-input" value={form.blockers} onChange={e => set('blockers', e.target.value)} placeholder="What's slowing us down?" rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">🎯 This week's focus</label>
              <textarea className="form-input" value={form.focus} onChange={e => set('focus', e.target.value)} placeholder="What must we get done this week?" rows={2} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Submit Sync'}</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default MondaySyncModal;
