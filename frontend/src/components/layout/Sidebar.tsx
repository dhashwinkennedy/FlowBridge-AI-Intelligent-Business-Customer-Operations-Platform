import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Bot, FileText, CheckSquare, ShieldCheck, Ticket, Users } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'AI Business Copilot', to: '/copilot', icon: Bot },
    { label: 'Knowledge Base (RAG)', to: '/knowledge', icon: FileText },
    { label: 'Activities & Tasks', to: '/activities', icon: CheckSquare },
    { label: 'Approvals Console', to: '/approvals', icon: ShieldCheck, roles: ['manager', 'company_admin', 'platform_admin'] },
    { label: 'Support Tickets', to: '/tickets', icon: Ticket },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
          Operations
        </div>
        {navItems.map((item) => {
          if (item.roles && user && !item.roles.includes(user.role)) {
            return null;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">Pinecone RAG</span>
            <span className="text-[10px] font-mono text-emerald-400">1024d Cosine</span>
          </div>
          <p className="text-[11px] text-slate-500">Integrated llama-text-embed-v2</p>
        </div>
      </div>
    </aside>
  );
};
