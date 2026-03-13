import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const COLUMNS = [
  { id: 'todo',    label: 'To Do',   color: '#0A84FF' },
  { id: 'doing',   label: 'Doing',   color: '#F36B21' },
  { id: 'done',    label: 'Done',    color: '#28A745' },
  { id: 'blocked', label: 'Blocked', color: '#DC3545' },
];

const MoveTaskModal = ({ task, onMove, onClose }) => {
  const [selected, setSelected] = useState(task.status_col || 'todo');
  const [loading, setLoading] = useState(false);

  const handleMove = async () => {
    if (selected === task.status_col) { onClose(); return; }
    setLoading(true);
    await onMove(task.id, selected);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-box" style={{ maxWidth: 380 }} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Move Task</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-60)', marginBottom: 16, fontWeight: 500 }}>Moving: <strong>{task.title}</strong></p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {COLUMNS.map(col => (
            <button
              key={col.id}
              onClick={() => setSelected(col.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                border: `2px solid ${selected === col.id ? col.color : 'var(--border-light)'}`,
                background: selected === col.id ? `${col.color}10` : 'var(--sur-00)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: selected === col.id ? col.color : 'var(--ink-80)' }}>{col.label}</span>
              {task.status_col === col.id && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-40)', fontWeight: 600 }}>Current</span>}
            </button>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleMove} disabled={loading || selected === task.status_col}>
            {loading ? 'Moving…' : 'Move'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MoveTaskModal;
