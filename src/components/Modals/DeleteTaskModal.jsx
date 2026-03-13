import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const DeleteTaskModal = ({ task, onDelete, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await onDelete(task.id);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal-box" style={{ maxWidth: 380 }} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: 'var(--error)' }}>Delete Task</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 16px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} color="var(--error)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-80)' }}>Delete <strong>"{task.title}"</strong>?</p>
          <p style={{ fontSize: 12, color: 'var(--ink-40)', fontWeight: 500 }}>This cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={loading} style={{ background: 'var(--error)', color: '#fff' }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DeleteTaskModal;
