import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, LogOut, Building, User as UserIcon, LifeBuoy, ExternalLink } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Axiom<span className="text-brand-400">X</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-mono -mt-1 tracking-wider uppercase">Operations Copilot</span>
            </div>
          </Link>

          {company && (
            <div className="hidden md:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Building className="w-3.5 h-3.5 text-brand-400" />
              <span className="font-semibold text-white">{company.company_name}</span>
              <span className="text-slate-500 font-mono">({company.company_slug})</span>
            </div>
          )}
        </div>

        {/* Right side navigation & user profile */}
        <div className="flex items-center gap-4">
          {company && (
            <Link
              to={`/c/${company.company_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-300 bg-brand-950/60 border border-brand-800/60 rounded-lg hover:bg-brand-900/60 transition-colors"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Customer Assistant</span>
              <ExternalLink className="w-3 h-3 text-brand-400" />
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{user.name}</div>
                <div className="text-[10px] font-mono text-brand-400 uppercase">{user.role.replace('_', ' ')}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow-sm transition-colors"
              >
                Register Company
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
