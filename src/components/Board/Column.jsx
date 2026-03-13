import React, { useState } from 'react';
import { Plus, AlertCircle, Pencil, Trash2, MoveRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCardInner from './TaskCard';
import './Column.css';
import './TaskCard.css';

const COLUMN_META = {
  todo:    { label: 'TO DO',    color: '#0A84FF', dot: true,  pulse: false },
  doing:   { label: 'DOING',   color: '#F36B21', dot: true,  pulse: false },
  done:    { label: 'DONE',    color: '#28A745', dot: true,  pulse: false },
  blocked: { label: 'BLOCKED', color: '#DC3545', dot: true,  pulse: true  },
};

const CATEGORIES = ['Product', 'Tech', 'Design', 'Marketing', 'Ops', 'Finance'];

const Column = ({ columnId, tasks = [], onAddTask, onEditTask, onDeleteTask, onMoveTask, isCreator, coCreatorId }) => {
  const meta = COLUMN_META[columnId];

  // Group tasks by category
  const byCategory = {};
  CATEGORIES.forEach(cat => {
    const grouped = tasks.filter(t => t.category === cat);
    if (grouped.length > 0) byCategory[cat] = grouped;
  });
  const uncategorized = tasks.filter(t => !t.category || !CATEGORIES.includes(t.category));
  if (uncategorized.length > 0) byCategory['Other'] = uncategorized;

  return (
    <div className="kanban-column">
      {/* Column Header */}
      <div className="col-header" style={{ '--col-color': meta.color }}>
        <div className="col-header-left">
          <span className={`col-dot ${meta.pulse ? 'pulse' : ''}`} style={{ background: meta.color }} />
          <span className="col-label t-mono-s" style={{ color: meta.color }}>{meta.label}</span>
          <span className="col-count t-mono" style={{ color: meta.color, borderColor: meta.color }}>{tasks.length}</span>
        </div>
        {isCreator && (
          <button className="col-add-btn" onClick={() => onAddTask(columnId)} title={`Add task to ${meta.label}`}>
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Task List */}
      <div className="col-task-list">
        {Object.entries(byCategory).map(([cat, catTasks]) => (
          <div key={cat} className="col-section">
            <div className="col-section-label">{cat}</div>
            <AnimatePresence>
              {catTasks.map(task => (
                <TaskCardWrapper
                  key={task.id}
                  task={task}
                  columnId={columnId}
                  isCreator={isCreator}
                  coCreatorId={coCreatorId}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onMove={onMoveTask}
                />
              ))}
            </AnimatePresence>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="col-empty">
            <span>No tasks here</span>
            {isCreator && <button onClick={() => onAddTask(columnId)} className="col-empty-add">+ Add task</button>}
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper for TaskCard hover actions
const TaskCardWrapper = ({ task, columnId, isCreator, coCreatorId, onEdit, onDelete, onMove }) => {
  const [hovered, setHovered] = useState(false);
  const canEdit = isCreator || (task.submitted_by === coCreatorId && task.status !== 'active');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <TaskCardInner task={task} columnId={columnId} />
      {(isCreator || canEdit) && hovered && (
        <div className="task-hover-actions">
          {isCreator && <button className="hover-btn" onClick={() => onMove(task)} title="Move"><MoveRight size={12} /></button>}
          {(isCreator || canEdit) && <button className="hover-btn" onClick={() => onEdit(task)} title="Edit"><Pencil size={12} /></button>}
          {isCreator && <button className="hover-btn danger" onClick={() => onDelete(task)} title="Delete"><Trash2 size={12} /></button>}
        </div>
      )}
    </motion.div>
  );
};

export default Column;
export { COLUMN_META, TaskCardWrapper };
