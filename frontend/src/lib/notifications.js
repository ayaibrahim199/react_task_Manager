let timers = new Map();

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

export function clearAllScheduledNotifications() {
  for (const [, id] of timers) clearTimeout(id);
  timers.clear();
}

export function clearNotificationForTask(taskId) {
  const id = timers.get(taskId);
  if (id) {
    clearTimeout(id);
    timers.delete(taskId);
  }
}

export function scheduleNotificationForTask(task, onFire) {
  // expects task: {_id, title, dueDate, remindMinutesBefore, completed}
  clearNotificationForTask(task._id);
  if (!isNotificationSupported()) return { scheduled: false, reason: 'unsupported' };
  if (Notification.permission !== 'granted') return { scheduled: false, reason: 'permission' };
  if (!task?.dueDate) return { scheduled: false, reason: 'no_due_date' };
  if (task?.completed) return { scheduled: false, reason: 'completed' };
  const remindMin = Number(task.remindMinutesBefore) || 0;
  if (remindMin <= 0) return { scheduled: false, reason: 'no_reminder' };
  const due = new Date(task.dueDate).getTime();
  if (Number.isNaN(due)) return { scheduled: false, reason: 'invalid_due' };
  const fireAt = due - remindMin * 60 * 1000;
  const delay = fireAt - Date.now();
  if (delay <= 0) return { scheduled: false, reason: 'in_past' };
  const timeoutId = setTimeout(() => {
    try {
      new Notification('Task reminder', {
        body: `${task.title} is due in ${remindMin} minute(s)`,
        tag: task._id,
      });
    } catch {}
    try {
      if (typeof onFire === 'function') onFire(task);
    } catch {}
    timers.delete(task._id);
  }, Math.min(delay, 2_147_483_647)); // cap to maximum setTimeout
  timers.set(task._id, timeoutId);
  return { scheduled: true, msUntil: delay };
}

export function showNotificationNow({ title = 'Task Manager', body = 'This is a test notification', tag, silent = false } = {}) {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { body, tag, silent });
    return true;
  } catch {
    return false;
  }
}

export function scheduleReminderWithFallback(task, onFallback) {
  // Try native notification first (also call onFallback as an in-app cue when it fires)
  const native = scheduleNotificationForTask(task, onFallback);
  if (native && native.scheduled) {
    return { ...native, native: true };
  }
  const reason = native?.reason;
  // Only fallback when permission is blocked or not supported
  if (reason !== 'permission' && reason !== 'unsupported') {
    return native || { scheduled: false, reason: 'unknown' };
  }
  // Compute delay similar to native path
  if (!task?.dueDate) return { scheduled: false, reason: 'no_due_date' };
  const remindMin = Number(task.remindMinutesBefore) || 0;
  if (remindMin <= 0) return { scheduled: false, reason: 'no_reminder' };
  const due = new Date(task.dueDate).getTime();
  if (Number.isNaN(due)) return { scheduled: false, reason: 'invalid_due' };
  const fireAt = due - remindMin * 60 * 1000;
  const delay = fireAt - Date.now();
  if (delay <= 0) return { scheduled: false, reason: 'in_past' };

  clearNotificationForTask(task._id);
  const timeoutId = setTimeout(() => {
    try {
      if (typeof onFallback === 'function') onFallback(task);
    } catch {}
    timers.delete(task._id);
  }, Math.min(delay, 2_147_483_647));
  timers.set(task._id, timeoutId);
  return { scheduled: true, native: false, msUntil: delay };
}

export function scheduleRelativeReminder(task, minutesFromNow, onFire) {
  const delay = Math.max(0, Math.floor(Number(minutesFromNow) || 0) * 60 * 1000);
  if (delay <= 0) return { scheduled: false, reason: 'no_delay' };
  clearNotificationForTask(task._id);
  const timeoutId = setTimeout(() => {
    try {
      if (isNotificationSupported() && Notification.permission === 'granted') {
        new Notification('Task reminder', {
          body: `${task.title} reminder`,
          tag: task._id,
        });
      }
    } catch {}
    try {
      if (typeof onFire === 'function') onFire(task);
    } catch {}
    timers.delete(task._id);
  }, Math.min(delay, 2_147_483_647));
  timers.set(task._id, timeoutId);
  return { scheduled: true, native: isNotificationSupported() && Notification.permission === 'granted', msUntil: delay };
} 