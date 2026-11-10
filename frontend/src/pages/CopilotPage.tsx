import React, { useState, useEffect } from 'react';
import { api, WorkflowRequest } from '../services/api';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Bot, Sparkles, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Ticket, Layers, Clock } from 'lucide-react';

export const CopilotPage: React.FC = () => {
  const [requestText, setRequestText] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Analysis result
  const [analysis, setAnalysis] = useState<{ category: string; priority: string; missing_information: string[] } | null>(null);

  // Active workflow created in this session
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowRequest | null>(null);
  const [confirmedStatus, setConfirmedStatus] = useState<string | null>(null);

  // History list
  const [requestsList, setRequestsList] = useState<WorkflowRequest[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const fetchRequests = async () => {
    try {
      const data = await api.listWorkflowRequests();
      setRequestsList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUnderstand = async () => {
    if (!requestText.trim() || requestText.trim().length < 3) return;
    setAnalyzing(true);
    setAnalysis(null);
    setActiveWorkflow(null);
    setConfirmedStatus(null);
    try {
      const res = await api.understandRequest(requestText.trim(), undefined, ticketId.trim() || undefined);
      setAnalysis(res);
    } catch (err: any) {
      alert(`Request analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!requestText.trim()) return;
    setGenerating(true);
    try {
      const res: any = await api.generateWorkflow(requestText.trim(), undefined, ticketId.trim() || undefined);
      if (res.status === 'clarification_required') {
        setAnalysis(res);
        alert('More detail required before a workflow can be generated.');
      } else {
        setActiveWorkflow(res);
        setAnalysis(null);
        fetchRequests();
      }
    } catch (err: any) {
      alert(`Workflow generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!activeWorkflow) return;
    setConfirming(true);
    try {
      const res = await api.confirmWorkflow(activeWorkflow.request_id);
      setConfirmedStatus(res.status);
      setActiveWorkflow((prev) => (prev ? { ...prev, status: res.status as any } : null));
      fetchRequests();
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <span>AI Business Copilot</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Natural language understanding, multi-tier approval routing, and Conversation-to-Resolution automation.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Column: Copilot Input & Active Workflow */}
            <div className="lg:col-span-7 space-y-6">
              {/* Request Input Card */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span>Submit Business Request</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Describe what you need done in plain language (e.g. equipment replacement, purchase order, maintenance, or access permissions).
                </p>

                <textarea
                  rows={4}
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  placeholder="e.g. Urgent purchase request: We require 5 sets of high-pressure replacement hydraulic seals for Line 2 immediately due to oil leakage."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors mb-3"
                />

                {/* Conversation-to-Resolution Ticket Link */}
                <div className="mb-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
                  <Ticket className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      Link Customer Ticket ID (Conversation-to-Resolution)
                    </label>
                    <input
                      type="text"
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      placeholder="Optional ticket ID (e.g. tkt_6a4f9b8c)"
                      className="w-full bg-transparent border-0 p-0 text-xs text-brand-300 placeholder-slate-600 font-mono focus:ring-0"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleUnderstand}
                    disabled={analyzing || !requestText.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-40"
                  >
                    {analyzing ? 'Analyzing...' : 'Understand Request'}
                  </button>

                  <button
                    onClick={handleGenerate}
                    disabled={generating || !requestText.trim()}
                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generating ? 'Generating Workflow...' : 'Generate Workflow'}</span>
                  </button>
                </div>
              </div>

              {/* Analysis Result Card (if any) */}
              {analysis && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 animate-fadeIn">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>AI Intent Understanding</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block">Detected Category</span>
                      <span className="font-semibold text-brand-300">{analysis.category.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block">Estimated Priority</span>
                      <StatusBadge status={analysis.priority} type="priority" />
                    </div>
                  </div>

                  {analysis.missing_information && analysis.missing_information.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-300">
                      <div className="font-semibold flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span>Clarification Needed:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                        {analysis.missing_information.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Generated Workflow Review Card */}
              {activeWorkflow && (
                <div className="p-6 rounded-2xl bg-indigo-950/30 border border-indigo-800/60 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-indigo-300">{activeWorkflow.request_id}</span>
                    <StatusBadge status={activeWorkflow.status} />
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2">Generated Execution Workflow</h3>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 mb-4 text-xs text-slate-300">
                    "{activeWorkflow.request_text}"
                  </div>

                  <div className="space-y-2 mb-5">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Structured Action Steps:</span>
                    {activeWorkflow.generated_workflow?.steps?.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
                        <div className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-300 flex items-center justify-center font-mono text-[10px]">
                          {idx + 1}
                        </div>
                        <span className="text-slate-200">{step}</span>
                      </div>
                    ))}
                  </div>

                  {activeWorkflow.requires_approval && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-center gap-2 text-xs text-amber-300 mb-5">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>This workflow requires manager approval prior to activity execution.</span>
                    </div>
                  )}

                  {confirmedStatus ? (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Workflow confirmed! Current status: <strong>{confirmedStatus}</strong></span>
                    </div>
                  ) : (
                    <button
                      onClick={handleConfirm}
                      disabled={confirming}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{confirming ? 'Confirming...' : 'Review & Confirm Workflow'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Workflow Requests History */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Recent Workflow Requests</span>
                  </h3>
                  <button onClick={fetchRequests} className="text-xs text-brand-400 hover:text-brand-300">
                    Refresh
                  </button>
                </div>

                {loadingList ? (
                  <LoadingSpinner size="sm" message="Loading requests..." />
                ) : requestsList.length === 0 ? (
                  <EmptyState
                    title="No Workflow Requests"
                    description="Submit your first natural language request on the left to trigger workflow automation."
                  />
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {requestsList.map((item) => (
                      <div
                        key={item.request_id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono font-semibold text-brand-300">{item.request_id}</span>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2 mb-2">{item.request_text}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{item.request_category.replace(/_/g, ' ')}</span>
                          {item.related_ticket_id && (
                            <span className="text-indigo-400">Linked: {item.related_ticket_id}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
