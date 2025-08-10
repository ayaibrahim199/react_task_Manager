import { useEffect, useState, useContext, useMemo } from 'react';
import api from '../lib/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import { requestNotificationPermission, clearNotificationForTask, scheduleReminderWithFallback, scheduleRelativeReminder } from '../lib/notifications';
import { enableSound, isSoundEnabled, playReminderChime } from '../lib/sound';
import SettingsModal from '../components/SettingsModal';
import SnoozeBar from '../components/SnoozeBar';

const DEFAULT_REMIND_KEY = 'defaultRemindMinutes';

const priorityBadge = (priority) => {
  const p = priority || 'medium';
  if (p === 'high') return 'bg-red-100 text-red-700';
  if (p === 'low') return 'bg-green-100 text-green-700';
  return 'bg-yellow-100 text-yellow-700';
};

const formatForInput = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => `${n}`.padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const isOverdue = (task) => {
  if (!task?.dueDate || task?.completed) return false;
  const due = new Date(task.dueDate);
  if (isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
};

export default function Dashboard() {
  const { token } = useContext(AuthContext);
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDueDate, setNewDueDate] = useState(''); // YYYY-MM-DDTHH:mm
  const [newPriority, setNewPriority] = useState('medium');
  const [newRecurrence, setNewRecurrence] = useState('none');
  const [defaultRemind, setDefaultRemind] = useState(() => {
    const v = Number(localStorage.getItem(DEFAULT_REMIND_KEY));
    return Number.isFinite(v) && v >= 0 ? v : 5;
  });
  const [newRemind, setNewRemind] = useState(() => {
    const v = Number(localStorage.getItem(DEFAULT_REMIND_KEY));
    return Number.isFinite(v) && v >= 0 ? v : 5;
  });
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // DnD
  const [dragId, setDragId] = useState(null);

  // UI filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all|active|completed
  const [filterPriority, setFilterPriority] = useState('all'); // all|low|medium|high
  const [sortBy, setSortBy] = useState('newest'); // newest|oldest|dueSoon

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data } = await api.get('/api/tasks');
        setTasks(data);
        // try to schedule notifications for tasks that have reminders
        setTimeout(() => data.forEach(t => {
          const r = scheduleReminderWithFallback(t, handleReminderFire);
          if (r && r.scheduled === false && r.reason === 'permission') {
            // soft hint once
            showToast('Enable notifications to get reminders', 'info');
          }
        }), 0);
      } catch (error) {
        showToast(error.response?.data?.message || 'Failed to fetch tasks', 'error');
      }
    };

    // ask for permission once
    requestNotificationPermission();

    fetchTasks();
  }, [token]);

  const [notifStatus, setNotifStatus] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'default'));
  const enableNotifications = async () => {
    const ok = await requestNotificationPermission();
    setNotifStatus(typeof Notification !== 'undefined' ? Notification.permission : 'default');
    showToast(ok ? 'Notifications enabled' : 'Notifications not allowed', ok ? 'success' : 'error');
  };

  const [soundStatus, setSoundStatus] = useState(false);
  const enableSoundClick = async () => {
    const ok = await enableSound();
    setSoundStatus(isSoundEnabled());
    showToast(ok ? 'Sound enabled' : 'Failed to enable sound', ok ? 'success' : 'error');
  };

  const handleChangeDefaultRemind = (v) => {
    const value = Math.max(0, Number(v) || 0);
    setDefaultRemind(value);
    localStorage.setItem(DEFAULT_REMIND_KEY, String(value));
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [snoozeTask, setSnoozeTask] = useState(null);

  const handleReminderFire = (task) => {
    playReminderChime();
    setSnoozeTask(task);
  };
  const handleSnooze = (minutes) => {
    if (!snoozeTask) return;
    scheduleRelativeReminder(snoozeTask, minutes, handleReminderFire);
    showToast(`Snoozed for ${minutes} min`, 'info');
    setSnoozeTask(null);
  };

  const toIsoOrUndefined = (localDateTimeString) => {
    if (!localDateTimeString) return undefined;
    const d = new Date(localDateTimeString);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    if (newDueDate) {
      const due = new Date(newDueDate);
      if (isNaN(due.getTime()) || due.getTime() < Date.now()) {
        showToast('Please pick a future due date/time', 'error');
        return;
      }
    }
    setAdding(true);
    try {
      const payload = { title: newTask, priority: newPriority, recurrence: newRecurrence, remindMinutesBefore: Number(newRemind) || 0 };
      const iso = toIsoOrUndefined(newDueDate);
      if (iso) payload.dueDate = iso;
      const { data } = await api.post('/api/tasks', payload);
      setTasks(prev => [...prev, data]);
      // schedule notification for the new task
      const r = scheduleReminderWithFallback(data, handleReminderFire);
      if (r && r.scheduled === true) {
        showToast(`Reminder scheduled in ${Math.round(r.msUntil/60000)} min${r.native === false ? ' (in-app)' : ''}`, 'success');
      } else if (r && r.reason) {
        const msg = {
          permission: 'Enable notifications to receive reminders',
          no_due_date: 'Set a due date to schedule a reminder',
          no_reminder: 'Set Remind (min) > 0 to schedule a reminder',
          in_past: 'Reminder time is already in the past',
          completed: 'Task is completed; no reminders',
          invalid_due: 'Invalid due date',
          unsupported: 'Notifications not supported in this browser'
        }[r.reason] || 'Reminder not scheduled';
        showToast(msg, 'info');
      }
      setNewTask('');
      setNewDueDate('');
      setNewPriority('medium');
      setNewRecurrence('none');
      setNewRemind(defaultRemind);
      showToast('Task added', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add task', 'error');
    } finally {
      setAdding(false);
    }
  };

  const deleteTask = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/tasks/${id}`);
      setTasks(prev => prev.filter(t => t._id !== id));
      clearNotificationForTask(id);
      showToast('Task deleted', 'success');
    }
    catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete task', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (task) => setEditing({ ...task, priority: task.priority || 'medium', recurrence: task.recurrence || 'none', remindMinutesBefore: task.remindMinutesBefore || 0 });

  const saveEdit = async () => {
    if (!editing) return;
    if (editing.dueDate) {
      const due = new Date(editing.dueDate);
      const created = new Date(editing.createdAt);
      if (isNaN(due.getTime()) || due < created) {
        showToast('Due date cannot be earlier than creation time', 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = { title: editing.title, priority: editing.priority, recurrence: editing.recurrence, remindMinutesBefore: Number(editing.remindMinutesBefore) || 0 };
      const iso = toIsoOrUndefined(editing.dueDate);
      if (iso) payload.dueDate = iso; else payload.dueDate = null;
      const { data } = await api.put(`/api/tasks/${editing._id}`, payload);
      setTasks(prev => prev.map(t => t._id === data._id ? data : t));
      const r = scheduleReminderWithFallback(data, handleReminderFire);
      if (r && r.scheduled === true) {
        showToast(`Reminder scheduled in ${Math.round(r.msUntil/60000)} min${r.native === false ? ' (in-app)' : ''}`, 'success');
      }
      setEditing(null);
      showToast('Task updated', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task) => {
    setTogglingId(task._id);
    try {
      const { data } = await api.put(`/api/tasks/${task._id}`, { completed: !task.completed });
      setTasks(prev => prev.map(t => t._id === data._id ? data : t));
      if (data.completed) {
        clearNotificationForTask(data._id);
      } else {
        const r = scheduleReminderWithFallback(data, handleReminderFire);
        if (r && r.scheduled === true) {
          showToast(`Reminder scheduled in ${Math.round(r.msUntil/60000)} min${r.native === false ? ' (in-app)' : ''}`, 'success');
        }
      }
      showToast(task.completed ? 'Marked as pending' : 'Marked as complete', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Drag & drop handlers
  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const current = [...tasks];
    const fromIndex = current.findIndex(t => t._id === dragId);
    const toIndex = current.findIndex(t => t._id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    // Reorder locally
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);

    // Reassign order values based on index
    const updated = current.map((t, idx) => ({ ...t, order: (idx + 1) * 100 }));
    setTasks(updated);

    // Persist order changes for moved and target neighbors (opt: all updated)
    try {
      const batch = updated.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1);
      await Promise.all(
        batch.map(t => api.put(`/api/tasks/${t._id}`, { order: t.order }))
      );
    } catch (e) {
      showToast('Failed to save order', 'error');
    } finally {
      setDragId(null);
    }
  };

  const filteredSortedTasks = useMemo(() => {
    let list = [...tasks];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t => t.title?.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') {
      const wantCompleted = filterStatus === 'completed';
      list = list.filter(t => !!t.completed === wantCompleted);
    }
    if (filterPriority !== 'all') {
      list = list.filter(t => (t.priority || 'medium') === filterPriority);
    }
    if (sortBy === 'newest') {
      list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      list.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'dueSoon') {
      list.sort((a,b) => new Date(a.dueDate || 8640000000000000) - new Date(b.dueDate || 8640000000000000));
    }
    return list;
  }, [tasks, search, filterStatus, filterPriority, sortBy]);

  return (
    <div className="container p-6 min-h-screen bg-gray-50 text-gray-800">
      <h1 className="text-2xl font-semibold mb-6">Your Tasks</h1>

      <div className="bg-white rounded-xl shadow-card border border-gray-200 p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <input id="search" name="search" className="border rounded px-3 py-2 bg-white text-gray-800 placeholder:text-gray-500" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title" />
        <select className="border rounded px-3 py-2 bg-white text-gray-800" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        <select className="border rounded px-3 py-2 bg-white text-gray-800" value={filterPriority} onChange={(e)=>setFilterPriority(e.target.value)}>
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select className="border rounded px-3 py-2 bg-white text-gray-800" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="dueSoon">Due soon</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-card border border-gray-200 p-4 mb-5">
        <div className="flex flex-col gap-3">
          <div className="flex w-full flex-wrap items-stretch overflow-hidden rounded-md border border-gray-300 bg-white">
            <input
              id="new-task-title"
              name="title"
              className="flex-1 min-w-[180px] px-3 py-2 outline-none border-0 bg-transparent"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="New task title"
            />
            <input
              id="new-task-due"
              name="dueDate"
              type="datetime-local"
              className="px-3 py-2 outline-none border-l border-gray-200 bg-transparent"
              value={newDueDate}
              min={formatForInput(new Date())}
              onChange={(e) => setNewDueDate(e.target.value)}
              aria-label="Due date"
            />
            <select
              id="new-task-priority"
              name="priority"
              className="px-3 py-2 outline-none border-l border-gray-200 bg-transparent"
              value={newPriority}
              onChange={(e)=>setNewPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              id="new-task-recurrence"
              name="recurrence"
              className="px-3 py-2 outline-none border-l border-gray-200 bg-transparent"
              value={newRecurrence}
              onChange={(e)=>setNewRecurrence(e.target.value)}
            >
              <option value="none">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input
              id="new-task-remind"
              name="remindMinutesBefore"
              type="number"
              min="0"
              className="w-24 px-3 py-2 outline-none border-l border-gray-200 bg-transparent"
              value={newRemind}
              onChange={(e)=>setNewRemind(e.target.value)}
              placeholder="Remind (min)"
            />
            <button
              className={`px-4 text-white font-medium border-l ${adding ? 'bg-blue-300 cursor-not-allowed border-blue-300' : 'bg-blue-600 hover:bg-blue-700 border-blue-600'}`}
              onClick={addTask}
              disabled={adding}
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={enableNotifications} className="text-sm px-3 py-1.5 rounded border border-blue-600 text-blue-600 hover:bg-blue-50">Enable notifications</button>
            <button type="button" onClick={enableSoundClick} className="text-sm px-3 py-1.5 rounded border border-green-600 text-green-700 hover:bg-green-50">Enable sound</button>
            <button type="button" onClick={() => setIsSettingsOpen(true)} className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">⚙️ Settings</button>
            {import.meta.env.DEV && (
              <span className="text-xs text-gray-500 self-center">Status: {notifStatus} • Sound: {soundStatus ? 'on' : 'off'}</span>
            )}
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultRemind={defaultRemind}
        onChangeDefaultRemind={handleChangeDefaultRemind}
      />

      <SnoozeBar
        taskTitle={snoozeTask?.title}
        onSnooze={handleSnooze}
        onDismiss={() => setSnoozeTask(null)}
      />

      <ul className="space-y-3">
        {filteredSortedTasks.map(task => (
          <li key={task._id} draggable onDragStart={()=>handleDragStart(task._id)} onDragOver={handleDragOver} onDrop={()=>handleDrop(task._id)} className={`${isOverdue(task) ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'} border rounded-xl shadow-card p-4`}>
            <div className="flex items-start justify-between gap-2">
              {editing && editing._id === task._id ? (
                <div className="flex-1 flex flex-col gap-2">
                  <input id={`edit-title-${editing._id}`} name="title" className="border rounded px-2 py-1 bg-white text-gray-800" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  <div className="flex flex-wrap gap-2">
                    <input id={`edit-due-${editing._id}`} name="dueDate" type="datetime-local" className="border rounded px-2 py-1 bg-white text-gray-800" value={editing.dueDate ? editing.dueDate.toString().slice(0,16) : ''} min={formatForInput(editing.createdAt)} onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })} />
                    <select id={`edit-priority-${editing._id}`} name="priority" className="border rounded px-2 py-1 bg-white text-gray-800" value={editing.priority || 'medium'} onChange={(e)=> setEditing({ ...editing, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <select id={`edit-recurrence-${editing._id}`} name="recurrence" className="border rounded px-2 py-1 bg-white text-gray-800" value={editing.recurrence || 'none'} onChange={(e)=> setEditing({ ...editing, recurrence: e.target.value })}>
                      <option value="none">No repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <input id={`edit-remind-${editing._id}`} name="remindMinutesBefore" type="number" min="0" className="border rounded px-2 py-1 w-32 bg-white text-gray-800" value={editing.remindMinutesBefore || 0} onChange={(e)=> setEditing({ ...editing, remindMinutesBefore: e.target.value })} placeholder="Remind (min)" />
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={task.completed ? 'font-medium line-through text-gray-500' : 'font-medium'}>{task.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${priorityBadge(task.priority)}`}>{(task.priority || 'medium').toUpperCase()}</span>
                    {isOverdue(task) && <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white">OVERDUE</span>}
                  </div>
                  <p className="text-sm text-gray-600">Created: {formatDateTime(task.createdAt)}</p>
                  {task.dueDate && <p className="text-sm text-gray-600">Due: {formatDateTime(task.dueDate)}</p>}
                  {(task.recurrence && task.recurrence !== 'none') && (
                    <p className="text-xs text-gray-500">Repeats: {task.recurrence}{task.remindMinutesBefore ? ` • Remind ${task.remindMinutesBefore}m before` : ''}</p>
                  )}
                </div>
              )}
              <div className="flex gap-2 shrink-0">
                <button className={(task.completed ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700') + ` text-white px-3 py-1.5 rounded-md ${togglingId === task._id ? 'opacity-70 cursor-not-allowed' : ''}`} onClick={() => toggleComplete(task)} disabled={togglingId === task._id}>
                  <span className="flex items-center justify-center gap-2">{togglingId === task._id && <Spinner />}{togglingId === task._id ? '...' : task.completed ? 'Undo' : 'Complete'}</span>
                </button>
                {editing && editing._id === task._id ? (
                  <button className={`text-white px-3 py-1.5 rounded-md ${saving ? 'bg-green-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={saveEdit} disabled={saving}>
                    <span className="flex items-center justify-center gap-2">{saving && <Spinner />}{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                ) : (
                  <button className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md" onClick={() => startEdit(task)}>Edit</button>
                )}
                <button className={`text-white px-3 py-1.5 rounded-md ${deletingId === task._id ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`} onClick={() => deleteTask(task._id)} disabled={deletingId === task._id}>
                  <span className="flex items-center justify-center gap-2">{deletingId === task._id && <Spinner />}{deletingId === task._id ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}