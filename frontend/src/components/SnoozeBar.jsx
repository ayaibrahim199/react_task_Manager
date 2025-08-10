import React from 'react';

export default function SnoozeBar({ taskTitle, onSnooze, onDismiss }) {
  if (!taskTitle) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-card rounded-full px-4 py-2">
        <span className="text-sm text-gray-800">Reminder: {taskTitle}</span>
        <button onClick={()=>onSnooze(5)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Snooze 5m</button>
        <button onClick={()=>onSnooze(10)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">10m</button>
        <button onClick={()=>onSnooze(30)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">30m</button>
        <button onClick={onDismiss} className="text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-100">Dismiss</button>
      </div>
    </div>
  );
} 