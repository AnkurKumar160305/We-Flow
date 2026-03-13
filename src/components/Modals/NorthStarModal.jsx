import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const NorthStarModal = ({ onClose }) => {
  const { settings, updateSettings } = useAuth();
  const [goal, setGoal] = useState(settings?.north_star || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({ north_star: goal });
    setSaving(false);
    onClose();
  };

  // Calculate sprint progress
  let progress = 0;
  if (settings?.sprint_start && settings?.sprint_end) {
    const s = new Date(settings.sprint_start), e = new Date(settings.sprint_end), n = new Date();
    progress = Math.min(100, Math.max(0, Math.round(((n - s) / (e - s)) * 100)));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-box" style={{ maxWidth: 440 }} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} color="var(--brand)" />
            <h3 className="modal-title">North Star Goal</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {settings?.sprint_name && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--sur-01)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{settings.sprint_name}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-60)', marginBottom: 8 }}>{progress}% of sprint elapsed</div>
            <div style={{ height: 5, background: 'var(--sur-03)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--brand)', borderRadius: 99, transition: 'width 0.6s' }} />
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Sprint Goal <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(max 120 chars)</span></label>
          <input className="form-input" value={goal} onChange={e => setGoal(e.target.value.slice(0, 120))} placeholder="What does success look like this sprint?" />
          <span style={{ fontSize: 10, color: 'var(--ink-40)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{goal.length}/120</span>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Goal'}</button>
        </div>
      </motion.div>
    </div>
  );
};

export default NorthStarModal;
