import React, { useState, useEffect } from 'react';
import { api, Approval } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ShieldCheck, Check, X, AlertCircle, RefreshCw, Clock, MessageSquare } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const data = await api.listApprovals();
      setApprovals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (approvalId: string, decision: 'approve' | 'reject') => {
    setActionLoading(approvalId);
    const remarks = remarksMap[approvalId] || undefined;
    try {
      if (decision === 'approve') {
        await api.approve(approvalId, remarks);
      } else {
        await api.reject(approvalId, remarks);
      }
      await fetchApprovals();
    } catch (err: any) {
      alert(`Decision failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span>Workflow Approvals Console</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Review and decide on business workflow requests requiring managerial authorization.
              </p>
            </div>

            <button
              onClick={fetchApprovals}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading pending approvals..." />
          ) : approvals.length === 0 ? (
            <EmptyState
              title="No Approvals Pending"
              description="All submitted workflow requests have been reviewed or decided."
            />
          ) : (
            <div className="space-y-4">
              {approvals.map((apr) => {
                const isPending = apr.status === 'pending';
                const isRequester = user?.user_id === apr.requested_by;

                return (
                  <div
                    key={apr.approval_id}
                    className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold text-brand-300">{apr.approval_id}</span>
                        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          {apr.approval_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <StatusBadge status={apr.status} type="approval" />
                    </div>

                    <p className="text-xs text-slate-200 mb-4 leading-relaxed font-medium">
                      {apr.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono mb-4">
                      <span>Request ID: {apr.request_id}</span>
                      <span>Requested by: {apr.requested_by}</span>
                      <span>Submitted: {new Date(apr.created_at).toLocaleString()}</span>
                    </div>

                    {isPending ? (
                      <div className="pt-4 border-t border-slate-800/80">
                        {isRequester ? (
                          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>You requested this approval. Multi-tenant policy strictly prohibits self-approval.</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={remarksMap[apr.approval_id] || ''}
                              onChange={(e) =>
                                setRemarksMap({ ...remarksMap, [apr.approval_id]: e.target.value })
                              }
                              placeholder="Optional review remarks or budgetary notes..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                            />
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleDecision(apr.approval_id, 'approve')}
                                disabled={actionLoading === apr.approval_id}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Request</span>
                              </button>
                              <button
                                onClick={() => handleDecision(apr.approval_id, 'reject')}
                                disabled={actionLoading === apr.approval_id}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      apr.remarks && (
                        <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                          <span className="font-semibold text-slate-300">Decision Remarks: </span>
                          <span>{apr.remarks}</span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
