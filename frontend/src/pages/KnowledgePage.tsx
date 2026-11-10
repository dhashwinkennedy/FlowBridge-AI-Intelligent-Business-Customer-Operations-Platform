import React, { useState, useEffect } from 'react';
import { api, DocumentItem } from '../services/api';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { FileText, Upload, Trash2, RefreshCw, AlertCircle, CheckCircle2, Shield, Layers, File } from 'lucide-react';

export const KnowledgePage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [knowledgeType, setKnowledgeType] = useState<'customer' | 'internal'>('customer');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const fetchDocs = async () => {
    try {
      const data = await api.listDocuments();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const res = await api.uploadDocument(fileToUpload, knowledgeType);
      setUploadSuccess(`"${res.filename}" uploaded successfully (${res.total_chunks} chunks indexed into Pinecone).`);
      setFileToUpload(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchDocs();
    } catch (err: any) {
      setUploadError(err.message || 'Document upload and Pinecone indexing failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? All chunks will be removed from Pinecone.`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.document_id !== docId));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
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
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span>Company Knowledge Base (Pinecone RAG)</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload PDF, DOCX, or TXT documents for integrated vector embedding (<span className="font-mono text-purple-400">llama-text-embed-v2</span>, 1024d Cosine).
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left: Upload Form */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-brand-400" />
                  <span>Ingest New Document</span>
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                  Select the target knowledge isolation partition to guarantee customer/internal data boundaries.
                </p>

                {uploadError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Knowledge Isolation Partition</label>
                    <select
                      value={knowledgeType}
                      onChange={(e) => setKnowledgeType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value="customer">Customer Knowledge (Public Policies, Warranties, Catalogs)</option>
                      <option value="internal">Internal Knowledge (SOPs, Employee Policies, Confidential)</option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500 font-mono">
                      {knowledgeType === 'customer'
                        ? 'Accessible by AI Customer Assistant on public customer chat.'
                        : 'Strictly restricted to internal employees and Business Copilot.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Document File</label>
                    <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center bg-slate-950/50 transition-colors">
                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.docx,.txt"
                        required
                        onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <File className="w-8 h-8 text-slate-500 mb-2" />
                        <span className="text-xs font-semibold text-brand-400 hover:text-brand-300">
                          {fileToUpload ? fileToUpload.name : 'Choose a file'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 font-mono">PDF, DOCX, or TXT up to 10MB</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !fileToUpload}
                    className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploading ? 'Extracting & Indexing...' : 'Upload & Embed into Pinecone'}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Documents Inventory Table */}
            <div className="lg:col-span-7">
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Indexed Document Inventory</span>
                  </h3>
                  <button onClick={fetchDocs} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                {loading ? (
                  <LoadingSpinner message="Loading document catalog..." />
                ) : documents.length === 0 ? (
                  <EmptyState
                    title="No Documents Ingested"
                    description="Upload your first customer warranty guide or internal operations policy on the left."
                  />
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {documents.map((doc) => (
                      <div
                        key={doc.document_id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-white truncate max-w-xs">{doc.filename}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <StatusBadge status={doc.knowledge_type} type="knowledge" />
                              <StatusBadge status={doc.indexing_status} type="document" />
                              <span className="text-[10px] font-mono text-slate-500">
                                {doc.total_chunks} chunks
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">
                              Namespace: {doc.pinecone_namespace}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(doc.document_id, doc.filename)}
                          title="Delete document and remove indexed chunks"
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
