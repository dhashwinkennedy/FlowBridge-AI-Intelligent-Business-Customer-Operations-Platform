import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, Ticket } from '../services/api';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Ticket as TicketIcon, RefreshCw, Bot, ArrowRight, User, Mail, MessageSquare } from 'lucide-react';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchTickets = async () => {
    try {
      const data = await api.listTickets();
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const updated = await api.updateTicketStatus(ticketId, newStatus, resolutionNotes || undefined);
      setTickets((prev) => prev.map((t) => (t.ticket_id === ticketId ? updated : t)));
      if (selectedTicket?.ticket_id === ticketId) {
        setSelectedTicket(updated);
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
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
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <TicketIcon className="w-5 h-5" />
                </div>
                <span>Customer Support Tickets Queue</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage and resolve customer complaints registered through the AI Customer Assistant.
              </p>
            </div>

            <button onClick={fetchTickets} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading support tickets..." />
          ) : tickets.length === 0 ? (
            <EmptyState
              title="No Tickets in Queue"
              description="Customer inquiries and complaints submitted via the customer assistant will appear here."
            />
          ) : (
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Tickets List */}
              <div className="lg:col-span-7 space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.ticket_id}
                    onClick={() => {
                      setSelectedTicket(t);
                      setResolutionNotes(t.resolution_notes || '');
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedTicket?.ticket_id === t.ticket_id
                        ? 'bg-slate-900 border-brand-500 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs text-brand-400 font-semibold">{t.ticket_id}</span>
                      <StatusBadge status={t.status} type="ticket" />
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1">{t.subject}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{t.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{t.customer_name} ({t.customer_email})</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ticket Detail & Resolution Panel */}
              <div className="lg:col-span-5">
                {selectedTicket ? (
                  <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 sticky top-24 space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-brand-400">{selectedTicket.ticket_id}</span>
                      <StatusBadge status={selectedTicket.status} type="ticket" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">{selectedTicket.subject}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                        {selectedTicket.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Customer: <strong>{selectedTicket.customer_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>Email: <span className="font-mono">{selectedTicket.customer_email}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">Category: {selectedTicket.category}</span>
                      </div>
                    </div>

                    {/* Conversation-to-Resolution Link to Copilot */}
                    <div className="p-3.5 rounded-xl bg-brand-950/40 border border-brand-800/60">
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand-300 mb-1">
                        <Bot className="w-4 h-4 text-brand-400" />
                        <span>Conversation-to-Resolution</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Initiate an internal business workflow activity linked directly to this customer complaint.
                      </p>
                      <Link
                        to={`/copilot?ticket_id=${encodeURIComponent(selectedTicket.ticket_id)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                      >
                        <span>Initiate Workflow in Copilot</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Status updater */}
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Resolution Notes</label>
                        <textarea
                          rows={2}
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Document actions taken or parts dispatched..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {['in_progress', 'waiting_for_customer', 'resolved', 'closed'].map((st) => (
                          <button
                            key={st}
                            disabled={updating}
                            onClick={() => handleUpdateStatus(selectedTicket.ticket_id, st)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 capitalize transition-colors disabled:opacity-50"
                          >
                            Mark {st.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                    Select a ticket from the queue on the left to inspect details and update resolution status.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
