import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, DashboardOverview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { Ticket, CheckSquare, ShieldCheck, Bot, Sparkles, ArrowRight, Layers, FileText } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { user, company } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const data = await api.getOverview();
        setOverview(data);
      } catch (err) {
        console.error('Failed to load dashboard overview', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>Welcome back, {user?.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-950 border border-brand-800 text-brand-400 font-mono">
                  {user?.role.replace('_', ' ')}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Workspace: <span className="text-slate-200 font-medium">{company?.company_name}</span> ({company?.industry || 'Enterprise'})
              </p>
            </div>

            <Link
              to="/copilot"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
            >
              <Bot className="w-4 h-4" />
              <span>Launch Business Copilot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading operations metrics..." />
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <Link
                  to="/tickets"
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Open Support Tickets</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Ticket className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white group-hover:text-brand-400 transition-colors">
                    {overview?.tickets_open ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-mono">Active customer issues</div>
                </Link>

                <Link
                  to="/activities"
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Active Activities</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white group-hover:text-brand-400 transition-colors">
                    {overview?.activities_open ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-mono">In-flight workflow tasks</div>
                </Link>

                <Link
                  to="/approvals"
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Pending Approvals</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white group-hover:text-amber-400 transition-colors">
                    {overview?.approvals_pending ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-mono">Awaiting manager decision</div>
                </Link>
              </div>

              {/* Quick Operation Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">AI Request to Workflow</h3>
                      <p className="text-xs text-slate-400">Convert plain text requests into validated execution steps.</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                    Employees can submit business requests (such as spare parts purchasing, software access, or facility maintenance) and the copilot extracts parameters, checks completeness, and generates an actionable workflow.
                  </p>
                  <Link
                    to="/copilot"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300"
                  >
                    <span>Open Copilot Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Pinecone Knowledge Ingestion</h3>
                      <p className="text-xs text-slate-400">Strictly separate customer policies from internal documents.</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                    Upload manuals, warranty policies, and operating procedures in PDF, DOCX, or TXT. Documents are segmented into semantic chunks and embedded directly in Pinecone using <span className="font-mono text-purple-400">llama-text-embed-v2</span>.
                  </p>
                  <Link
                    to="/knowledge"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
                  >
                    <span>Manage Knowledge Base</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
