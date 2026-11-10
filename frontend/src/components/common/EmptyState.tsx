import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon: Icon = Inbox, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 my-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 border border-slate-700/50">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-5">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
