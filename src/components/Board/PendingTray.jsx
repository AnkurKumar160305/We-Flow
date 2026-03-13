import React, { useState } from 'react';
import { Check, X, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './PendingTray.css';

const PendingTray = ({ tasks, members, onApprove, onReject }) => {
  const [rejectModal, setRejectModal] = useState(null); // task
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const getMember = (task) => members.find(m => m.id === task.submitted_by);

  const handleReject = async () => {
    if (!reason.trim() || reason.length < 10) return;
    setRejecting(true);
    await onReject(rejectModal, reason.trim());
    setRejectModal(null);
    setReason('');
    setRejecting(false);
  };

  const pending  = tasks.filter(t => t.status === 'pending');
  const rejected = tasks.filter(t => t.status === 'rejected');

  return (
    <div className="pending-tray">
      <div className="tray-header">
        <span className="tray-title">Pending</span>
        <span className="tray-count">{pending.length}</span>
      </div>

      {pending.length === 0 && (
        <div className="tray-empty">All caught up ✓</div>
      )}

      <div className="tray-list">
        <AnimatePresence>
          {pending.map(task => {
            const member = getMember(task);
            const initials = member?.name ? member.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="tray-item"
              >
                <div className="tray-item-top">
                  <div className="tray-avatar" style={{ background: member?.member_color || '#888' }}>{initials}</div>
                  <div className="tray-item-info">
                    <div className="tray-item-title">{task.title}</div>
                    <div className="tray-item-by">by {member?.name || 'Unknown'}</div>
                  </div>
                </div>
                {task.category && <span className="tray-cat">{task.category}</span>}
                <div className="tray-actions">
                  <button className="btn btn-success btn-sm" onClick={() => onApprove(task)}>
                    <Check size={12} /> Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(task); setReason(''); }}>
                    <X size={12} /> Reject
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Rejected tasks summary */}
      {rejected.length > 0 && (
        <div className="tray-rejected-section">
          <div className="tray-section-label">Rejected ({rejected.length})</div>
          {rejected.map(task => (
            <div key={task.id} className="tray-rejected-item">
              <div className="tray-item-title" style={{ color: 'var(--error)', fontSize: 11 }}>{task.title}</div>
              {task.rejection_reason && (
                <div className="tray-reject-reason">"{task.rejection_reason}"</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <div className="modal-overlay" onClick={() => setRejectModal(null)}>
            <motion.div
              className="modal-box"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              style={{ maxWidth: 420 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Reject Task</h3>
                <button className="modal-close" onClick={() => setRejectModal(null)}><X size={16} /></button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-60)', marginBottom: 16, fontWeight: 500 }}>
                Rejecting: <strong>{rejectModal.title}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Rejection Reason * <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(min 10 chars)</span></label>
                <textarea
                  className="form-input"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Explain why this task is being rejected…"
                  rows={3}
                />
                <span style={{ fontSize: 10, color: reason.length < 10 ? 'var(--error)' : 'var(--success)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {reason.length} / 10 min
                </span>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleReject} disabled={reason.length < 10 || rejecting}>
                  {rejecting ? 'Rejecting…' : 'Reject Task'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PendingTray;
