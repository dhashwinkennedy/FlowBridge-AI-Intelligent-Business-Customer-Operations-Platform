import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Ticket } from '../services/api';
import { Bot, Send, Sparkles, AlertCircle, Building, Ticket as TicketIcon, Search, CheckCircle2, User, Mail, MessageSquare } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';

interface ChatMessage {
  id: string;
  role: 'customer' | 'assistant';
  content: string;
  sources?: any[];
  timestamp: string;
}

export const CustomerAssistantPage: React.FC = () => {
  const { companySlug = '' } = useParams<{ companySlug: string }>();

  const [company, setCompany] = useState<{ company_name: string; company_slug: string; industry?: string } | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState('');

  // Tab: 'chat' | 'ticket' | 'status'
  const [activeTab, setActiveTab] = useState<'chat' | 'ticket' | 'status'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [customerEmail, setCustomerEmail] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ticket Submission Form
  const [tktName, setTktName] = useState('');
  const [tktEmail, setTktEmail] = useState('');
  const [tktSubject, setTktSubject] = useState('');
  const [tktDesc, setTktDesc] = useState('');
  const [tktCategory, setTktCategory] = useState('complaint');
  const [tktSubmitting, setTktSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // Ticket Lookup Form
  const [lookupId, setLookupId] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<Partial<Ticket> | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    async function loadCompany() {
      setLoadingCompany(true);
      try {
        const data = await api.getPublicCompany(companySlug);
        setCompany(data);
        // Initial welcome message
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I am the AI Customer Operations Assistant for ${data.company_name}. How can I assist you today with our products, warranties, or services?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err: any) {
        setCompanyError(err.message || 'Company not found or link is invalid.');
      } finally {
        setLoadingCompany(false);
      }
    }
    if (companySlug) {
      loadCompany();
    }
  }, [companySlug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'customer',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setSending(true);

    try {
      const res = await api.publicChat(companySlug, {
        message: text,
        conversation_id: conversationId,
        customer_email: customerEmail || undefined,
      });

      if (res.conversation_id) setConversationId(res.conversation_id);

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `I encountered an issue retrieving an answer from our company knowledge base. Please try submitting a support ticket below. (${err.message})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTktSubmitting(true);
    try {
      const res = await api.createPublicTicket(companySlug, {
        customer_name: tktName,
        customer_email: tktEmail,
        subject: tktSubject,
        description: tktDesc,
        category: tktCategory,
        conversation_id: conversationId,
      });
      setCreatedTicket(res);
      setTktSubject('');
      setTktDesc('');
    } catch (err: any) {
      alert(`Ticket creation failed: ${err.message}`);
    } finally {
      setTktSubmitting(false);
    }
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await api.getPublicTicketStatus(companySlug, lookupId.trim(), lookupEmail.trim());
      setLookupResult(res);
    } catch (err: any) {
      setLookupError(err.message || 'Ticket not found. Verify your ticket ID and email.');
    } finally {
      setLookupLoading(false);
    }
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono">Connecting to company knowledge base...</p>
        </div>
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Company Workspace Not Found</h2>
          <p className="text-xs text-slate-400 mb-6">{companyError || `Slug "${companySlug}" is not registered.`}</p>
          <Link to="/" className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Brand Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/40 text-brand-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{company.company_name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-950 text-brand-400 border border-brand-800">
                  Customer Assistant
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">Grounding: Pinecone RAG (llama-text-embed-v2)</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'chat' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ask AI
            </button>
            <button
              onClick={() => setActiveTab('ticket')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'ticket' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Submit Ticket
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'status' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Track Ticket
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto p-4 flex-1 flex flex-col">
        {/* TAB 1: Chat Assistant */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 min-h-[450px] max-h-[calc(100vh-280px)]">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      m.role === 'customer'
                        ? 'bg-brand-600 text-white rounded-br-none shadow-md shadow-brand-500/10'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Sources Badge */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                        <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Retrieved Knowledge Sources:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.sources.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-brand-300">
                              {s.title || s.source_filename || `Chunk #${idx + 1}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`mt-2 text-[10px] text-right font-mono ${m.role === 'customer' ? 'text-brand-200' : 'text-slate-500'}`}>
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none p-3.5 flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <span>Searching verified company documents via Pinecone...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap gap-2 text-xs">
              <span className="text-slate-500 text-[11px] font-mono self-center">Suggestions:</span>
              {[
                'How long is the product warranty?',
                'What proof of purchase is required for claims?',
                'How can I submit an escalation ticket?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q)}
                  disabled={sending}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about warranty, products, or service procedures..."
                disabled={sending}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={sending || !inputMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-40"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Submit Complaint / Ticket */}
        {activeTab === 'ticket' && (
          <div className="max-w-xl mx-auto w-full p-6 sm:p-8 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <TicketIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Register Support Complaint / Ticket</h2>
                <p className="text-xs text-slate-400">Escalate an inquiry directly to the {company.company_name} support team.</p>
              </div>
            </div>

            {createdTicket ? (
              <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-800 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Ticket Successfully Registered</h3>
                <p className="text-xs text-slate-300 mb-4">Please save your ticket reference ID for status tracking:</p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-sm text-brand-400 font-bold mb-5 select-all">
                  {createdTicket.ticket_id}
                </div>
                <button
                  onClick={() => {
                    setCreatedTicket(null);
                    setActiveTab('status');
                    setLookupId(createdTicket.ticket_id);
                    setLookupEmail(createdTicket.customer_email);
                  }}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
                >
                  Track This Ticket Now
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={tktName}
                      onChange={(e) => setTktName(e.target.value)}
                      placeholder="Alex Taylor"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Your Email</label>
                    <input
                      type="email"
                      required
                      value={tktEmail}
                      onChange={(e) => setTktEmail(e.target.value)}
                      placeholder="alex@domain.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={tktCategory}
                      onChange={(e) => setTktCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    >
                      <option value="complaint">Complaint</option>
                      <option value="warranty">Warranty Claim</option>
                      <option value="technical_support">Technical Support</option>
                      <option value="billing">Billing Inquiry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={tktSubject}
                      onChange={(e) => setTktSubject(e.target.value)}
                      placeholder="Defective unit replacement"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Detailed Description</label>
                  <textarea
                    rows={4}
                    required
                    value={tktDesc}
                    onChange={(e) => setTktDesc(e.target.value)}
                    placeholder="Please include model details, purchase date, and exact issue experienced..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={tktSubmitting}
                  className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {tktSubmitting ? 'Registering...' : 'Submit Support Ticket'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: Track Ticket Status */}
        {activeTab === 'status' && (
          <div className="max-w-xl mx-auto w-full p-6 sm:p-8 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Track Ticket Status</h2>
                <p className="text-xs text-slate-400">Check current resolution progress on an active ticket.</p>
              </div>
            </div>

            <form onSubmit={handleLookupSubmit} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ticket ID</label>
                <input
                  type="text"
                  required
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder="e.g. tkt_6a4f9b8c"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Registered Customer Email</label>
                <input
                  type="email"
                  required
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="alex@domain.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>
              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
              >
                {lookupLoading ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {lookupError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            {lookupResult && (
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-brand-400 font-semibold">{lookupResult.ticket_id}</span>
                  <StatusBadge status={lookupResult.status || 'open'} type="ticket" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{lookupResult.subject}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Category: {lookupResult.category}</p>
                </div>
                {lookupResult.resolution_notes && (
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <span className="font-semibold text-emerald-400 block mb-1">Resolution Notes:</span>
                    <span className="text-slate-300">{lookupResult.resolution_notes}</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-900">
                  Last Updated: {new Date(lookupResult.updated_at || Date.now()).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
