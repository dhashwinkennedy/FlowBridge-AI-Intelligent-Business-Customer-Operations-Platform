import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Sparkles, Shield, Cpu, ArrowRight, Layers, FileSearch, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, company } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero section */}
      <div className="relative overflow-hidden pt-16 pb-24 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/20 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-950 border border-brand-800/80 text-brand-300 text-xs font-mono mb-8">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>INDUSTRIX 2026 – PS#601 Solution</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight mb-6">
            Axiom<span className="text-brand-500">X</span> – AI Business & Customer Operations Copilot
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Multi-tenant enterprise operations platform fusing an <span className="text-slate-200 font-semibold">AI Customer Assistant</span> with an <span className="text-slate-200 font-semibold">AI Business Copilot</span> for end-to-end conversation-to-resolution automation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all"
                >
                  Register Company
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-all"
                >
                  Sign In
                </Link>
              </>
            )}

            {company && (
              <Link
                to={`/c/${company.company_slug}`}
                className="px-6 py-3 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-800/80 font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Customer Assistant
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Two Pillars Section */}
      <div className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Two Integrated Operating Engines</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            AxiomX seamlessly links external customer conversations to internal enterprise execution.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Component A */}
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
              <Bot className="w-6 h-6" />
            </div>
            <div className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider mb-2">Component A</div>
            <h3 className="text-xl font-bold text-white mb-3">AI Customer Assistant</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Domain-grounded RAG chatbot using Pinecone integrated embeddings. Answers product queries, policies, and warranties while preventing hallucinations and registering support tickets.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Company-isolated RAG retrieval (llama-text-embed-v2)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Customer complaint & support ticket registration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Self-service ticket tracking by ticket ID & email</span>
              </li>
            </ul>
          </div>

          {/* Component B */}
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-6">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="text-xs font-mono font-semibold uppercase text-brand-400 tracking-wider mb-2">Component B</div>
            <h3 className="text-xl font-bold text-white mb-3">AI Business Copilot</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Transforms natural-language employee requests into structured workflows. Manages multi-tier managerial approvals, task assignments, and activity tracking.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Natural language intent & priority classification</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automated workflow step generation & confirmation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Conversation-to-Resolution: links customer tickets to internal activities</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
