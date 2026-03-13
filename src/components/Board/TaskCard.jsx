import React from 'react';

// TaskCard anatomy per PRD § 5.4
const TaskCardInner = ({ task, columnId }) => {
  const {
    title, category, assigned_to, due_date, is_urgent, blocker_note, status,
    _member_name, _member_color, _member_initials,
  } = task;

  const isDone    = columnId === 'done';
  const isBlocked = columnId === 'blocked';
  const memberColor = _member_color || '#888';
  const initials    = _member_initials || '?';
  const name        = _member_name || '';

  // Due date urgency
  let dueDateLabel = '';
  let dueDateClass = '';
  if (due_date) {
    const due = new Date(due_date);
    const now = new Date();
    const diffH = (due - now) / 3_600_000;
    dueDateLabel = due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (diffH < 0)   dueDateClass = 'overdue';
    else if (diffH < 48) dueDateClass = 'urgent';
  }

  const colColor = {
    todo: '#0A84FF', doing: '#F36B21', done: '#28A745', blocked: '#DC3545'
  }[columnId] || '#888';

  const bgTint = isDone
    ? 'rgba(40,167,69,0.05)'
    : `${memberColor}0d`; // 5% opacity

  return (
    <div
      className={`task-card-v5 ${isDone ? 'is-done' : ''} ${isBlocked ? 'is-blocked' : ''}`}
      style={{ '--col-color': colColor, '--tint': bgTint }}
    >
      {/* Top colour strip (2.5px) */}
      <div className="card-strip" style={{ background: colColor }} />

      {/* Header row: category + state pills + urgency */}
      <div className="card-top-row">
        {category && <span className="card-category">{category}</span>}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {status === 'pending'  && <span className="card-state-pill pending">Pending</span>}
          {status === 'rejected' && <span className="card-state-pill rejected">Rejected</span>}
          {isDone                && <span className="card-state-pill done-pill">Done</span>}
          {is_urgent             && <span className="card-urgent" title="Urgent">!</span>}
        </div>
      </div>

      {/* Title */}
      <div className={`card-title ${isDone ? 'struck' : ''}`}>{title}</div>

      {/* Blocker note */}
      {blocker_note && (
        <div className="card-blocker">
          <span style={{ fontWeight: 700 }}>Blocked:</span> {blocker_note}
        </div>
      )}

      {/* Footer: owner + due date */}
      <div className="card-footer-row">
        <div className="card-owner" style={{ background: memberColor }}>
          {initials}
        </div>
        {name && <span className="card-owner-name">{name.split(' ')[0]}</span>}
        {due_date && (
          <span className={`card-due t-mono ${dueDateClass}`} style={{ marginLeft: 'auto' }}>
            {dueDateLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCardInner;
