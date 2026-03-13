import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = ['Product', 'Tech', 'Design', 'Marketing', 'Ops', 'Finance'];
const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'doing', label: 'Doing' },
  { id: 'done', label: 'Done' },
  { id: 'blocked', label: 'Blocked' },
];

const AddTaskModal = ({ defaultColumn = 'todo', members = [], onAdd, onClose }) => {
  const [form, setForm] = useState({
    title: '',
    category: '',
    status_col: defaultColumn,
    assigned_to: '',
    due_date: '',
    is_urgent: false,
    blocker_note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setError(''); setLoading(true);
    const { error: err } = await onAdd(form);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-box" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Task</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to be done?" maxLength={200} required autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">None</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Column</label>
              <select className="form-input" value={form.status_col} onChange={e => set('status_col', e.target.value)}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Owner</label>
              <select className="form-input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Blocker Note (Optional)</label>
            <input className="form-input" value={form.blocker_note} onChange={e => set('blocker_note', e.target.value)} placeholder="Any blockers or dependencies?" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={form.is_urgent} onChange={e => set('is_urgent', e.target.checked)} style={{ accentColor: 'var(--error)', width: 15, height: 15 }} />
            <span>Mark as Urgent</span>
            <span style={{ fontSize: 10, color: 'var(--ink-40)', fontWeight: 500 }}>(shows red ! on card)</span>
          </label>
          <div className="modal-footer" style={{ paddingTop: 12, marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Add Task'}
            </button>
          </div>
        </form>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </div>
  );
};

export default AddTaskModal;
