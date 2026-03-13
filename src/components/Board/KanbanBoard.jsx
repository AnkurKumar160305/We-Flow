import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Column from './Column';
import PendingTray from './PendingTray';
import AddTaskModal from '../Modals/AddTaskModal';
import EditTaskModal from '../Modals/EditTaskModal';
import MoveTaskModal from '../Modals/MoveTaskModal';
import DeleteTaskModal from '../Modals/DeleteTaskModal';
import './KanbanBoard.css';

const COLUMNS = ['todo', 'doing', 'done', 'blocked'];

const COL_CONFIG = {
  todo:    { color: '#0A84FF', label: 'To Do' },
  doing:   { color: '#F36B21', label: 'Doing' },
  done:    { color: '#28A745', label: 'Done' },
  blocked: { color: '#DC3545', label: 'Blocked' },
};

const KanbanBoard = ({ addNotification }) => {
  const { profile, workspace, settings, members, isCreator, effectiveRole } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState([]);

  // Modal state
  const [addModal, setAddModal] = useState(null);    // columnId | null
  const [editModal, setEditModal] = useState(null);  // task | null
  const [moveModal, setMoveModal] = useState(null);  // task | null
  const [deleteModal, setDeleteModal] = useState(null); // task | null

  // Enrich task with member info
  const enrichTask = useCallback((task) => {
    const member = members.find(m => m.id === task.assigned_to);
    if (!member) return task;
    const initials = member.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return {
      ...task,
      _member_name: member.name,
      _member_color: member.member_color,
      _member_initials: initials,
    };
  }, [members]);

  const fetchTasks = useCallback(async () => {
    if (!profile?.workspace_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: true });

    if (data) {
      const enriched = data.map(enrichTask);
      setTasks(enriched.filter(t => t.status === 'active' || t.status === 'done'));
      setPendingTasks(enriched.filter(t => t.status === 'pending' || t.status === 'rejected'));
    }
    setLoading(false);
  }, [profile, enrichTask]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Realtime subscriptions
  useEffect(() => {
    if (!profile?.workspace_id) return;
    const channel = supabase.channel(`wf-tasks-${profile.workspace_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${profile.workspace_id}` },
        () => fetchTasks()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile, fetchTasks]);

  // --- CRUD operations ---
  const handleAddTask = async (taskData) => {
    const isCo = effectiveRole === 'co-creator';
    const { data, error } = await supabase.from('tasks').insert({
      workspace_id: profile.workspace_id,
      title: taskData.title,
      category: taskData.category || null,
      status_col: isCo ? 'todo' : (taskData.status_col || 'todo'),
      status: isCo ? 'pending' : 'active',
      assigned_to: taskData.assigned_to || profile.id,
      due_date: taskData.due_date || null,
      is_urgent: taskData.is_urgent || false,
      blocker_note: taskData.blocker_note || null,
      submitted_by: isCo ? profile.id : null,
    }).select().single();

    if (!error) {
      fetchTasks();
      if (isCo) {
        addNotification(`You submitted "${taskData.title}" for approval`);
        // Notify creators
        addNotification(`${profile.name} submitted a task: "${taskData.title}"`);
      }
    }
    return { error };
  };

  const handleEditTask = async (taskId, updates) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (!error) fetchTasks();
    return { error };
  };

  const handleMoveTask = async (taskId, newColumn) => {
    const wasDone = tasks.find(t => t.id === taskId)?.status_col === 'done';
    const isDone = newColumn === 'done';
    const { error } = await supabase.from('tasks').update({
      status_col: newColumn,
      status: newColumn === 'done' ? 'done' : 'active',
    }).eq('id', taskId);
    if (!error) {
      fetchTasks();
      if (isDone && !wasDone) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#28A745', '#fff', '#F36B21'] });
      }
    }
    return { error };
  };

  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) fetchTasks();
    return { error };
  };

  const handleApproveTask = async (task) => {
    const { error } = await supabase.from('tasks').update({
      status: 'active',
      status_col: 'todo',
      approved_by: profile.id,
    }).eq('id', task.id);
    if (!error) {
      fetchTasks();
      addNotification(`You approved "${task.title}" — it's now on the board`);
    }
  };

  const handleRejectTask = async (task, reason) => {
    const { error } = await supabase.from('tasks').update({
      status: 'rejected',
      rejection_reason: reason,
    }).eq('id', task.id);
    if (!error) {
      fetchTasks();
      addNotification(`You rejected "${task.title}"`);
    }
  };

  // --- Sprint stats ---
  const activeTasks = tasks;
  const counts = {
    todo:    activeTasks.filter(t => t.status_col === 'todo').length,
    doing:   activeTasks.filter(t => t.status_col === 'doing').length,
    done:    activeTasks.filter(t => t.status_col === 'done').length,
    blocked: activeTasks.filter(t => t.status_col === 'blocked').length,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const donePercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;

  // Sprint date progress
  let sprintProgress = 0;
  if (settings?.sprint_start && settings?.sprint_end) {
    const start = new Date(settings.sprint_start);
    const end = new Date(settings.sprint_end);
    const now = new Date();
    sprintProgress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }

  const memberChips = members.slice(0, 6);

  return (
    <div className="board-wrapper">
      {/* Sprint Summary Bar */}
      <div className="sprint-bar">
        <div className="sprint-bar-left">
          <span className="sprint-active-badge">● Active</span>
          <span className="sprint-name">{settings?.sprint_name || 'Sprint'}</span>
          {settings?.sprint_start && settings?.sprint_end && (
            <span className="sprint-dates t-mono">
              {new Date(settings.sprint_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' — '}
              {new Date(settings.sprint_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <div className="sprint-bar-mid">
          <div className="sprint-progress-track">
            <div className="sprint-progress-fill" style={{ width: `${donePercent}%` }} />
          </div>
          <span className="sprint-progress-pct t-mono">{donePercent}% done</span>
        </div>
        <div className="sprint-bar-right">
          {/* Task count chips */}
          {COLUMNS.map(col => (
            <span key={col} className="sprint-col-chip">
              <span style={{ color: COL_CONFIG[col].color, fontWeight: 800 }}>{counts[col]}</span>
              <span style={{ color: 'var(--ink-40)', fontSize: 10 }}> {COL_CONFIG[col].label}</span>
            </span>
          ))}
          {/* Member chips */}
          <div className="sprint-members">
            {memberChips.map(m => {
              const init = m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={m.id} className="sprint-member-chip" style={{ background: m.member_color }} title={m.name}>
                  {init}
                </div>
              );
            })}
            {members.length > 6 && <div className="sprint-member-chip more">+{members.length - 6}</div>}
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="stat-row">
        {COLUMNS.map(col => (
          <div key={col} className="stat-card" style={{ '--stat-color': COL_CONFIG[col].color }}>
            <div className="stat-card-top" />
            <div className="stat-card-body">
              <span className="stat-card-num" style={{ color: COL_CONFIG[col].color }}>{counts[col]}</span>
              <span className="stat-card-label">{COL_CONFIG[col].label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Board + Pending Tray */}
      <div className="board-and-tray">
        {/* Kanban Columns */}
        <div className="kanban-columns">
          {loading ? (
            <div className="board-loading"><div className="spinner" /><span>Loading board…</span></div>
          ) : (
            COLUMNS.map(colId => (
              <Column
                key={colId}
                columnId={colId}
                tasks={tasks.filter(t => t.status_col === colId)}
                onAddTask={(col) => setAddModal(col)}
                onEditTask={(task) => setEditModal(task)}
                onDeleteTask={(task) => setDeleteModal(task)}
                onMoveTask={(task) => setMoveModal(task)}
                isCreator={isCreator}
                coCreatorId={profile?.id}
              />
            ))
          )}
        </div>

        {/* Pending Tray — creators only */}
        {isCreator && pendingTasks.length > 0 && (
          <PendingTray
            tasks={pendingTasks}
            members={members}
            onApprove={handleApproveTask}
            onReject={handleRejectTask}
          />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {addModal && (
          <AddTaskModal
            key="add"
            defaultColumn={addModal}
            members={members}
            onAdd={handleAddTask}
            onClose={() => setAddModal(null)}
          />
        )}
        {editModal && (
          <EditTaskModal
            key="edit"
            task={editModal}
            members={members}
            onSave={handleEditTask}
            onClose={() => setEditModal(null)}
          />
        )}
        {moveModal && (
          <MoveTaskModal
            key="move"
            task={moveModal}
            onMove={handleMoveTask}
            onClose={() => setMoveModal(null)}
          />
        )}
        {deleteModal && (
          <DeleteTaskModal
            key="delete"
            task={deleteModal}
            onDelete={handleDeleteTask}
            onClose={() => setDeleteModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KanbanBoard;
