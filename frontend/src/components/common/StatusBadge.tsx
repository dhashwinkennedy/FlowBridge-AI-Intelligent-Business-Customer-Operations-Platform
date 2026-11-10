import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'ticket' | 'activity' | 'approval' | 'document' | 'priority' | 'knowledge';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'activity' }) => {
  const norm = (status || '').toLowerCase().replace(/_/g, ' ');

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (norm.includes('completed') || norm.includes('resolved') || norm.includes('approved') || norm.includes('ready')) {
    colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
  } else if (norm.includes('in progress') || norm.includes('processing') || norm.includes('assigned')) {
    colorClasses = 'bg-blue-950/80 text-blue-400 border-blue-800/60';
  } else if (norm.includes('pending') || norm.includes('waiting') || norm.includes('awaiting')) {
    colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-800/60';
  } else if (norm.includes('failed') || norm.includes('rejected') || norm.includes('blocked') || norm.includes('urgent') || norm.includes('high')) {
    colorClasses = 'bg-rose-950/80 text-rose-400 border-rose-800/60';
  } else if (norm.includes('customer')) {
    colorClasses = 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60';
  } else if (norm.includes('internal')) {
    colorClasses = 'bg-purple-950/80 text-purple-400 border-purple-800/60';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${colorClasses}`}>
      {norm}
    </span>
  );
};
