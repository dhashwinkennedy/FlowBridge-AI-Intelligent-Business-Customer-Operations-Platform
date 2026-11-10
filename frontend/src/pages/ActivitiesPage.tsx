import React, { useState, useEffect } from 'react';
import { api, Activity } from '../services/api';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { CheckSquare, Plus, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';

export const ActivitiesPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New activity form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [department, setDepartment] = useState('Operations');
  const [submitting, setSubmitting] = useState(false);

  const fetchActivities = async () => {
    try {
      const data = await api.listActivities();
      setActivities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createActivity({
        title,
        description,
        priority,
        assigned_department: department,
      });
      setTitle('');
      setDescription('');
      setShowModal(false);
      fetchActivities();
    } catch (err: any) {
      alert(`Failed to create activity: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (actId: string, newStatus: string) => {
    try {
      await api.updateActivityStatus(actId, newStatus);
      setActivities((prev) =>
        prev.map((a) => (a.activity_id === actId ? { ...a, status: newStatus as any } : a))
      );
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span>Activities & Task Execution</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Track assigned activities resulting from approved business workflows or customer resolutions.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Activity</span>
            </button>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading assigned activities..." />
          ) : activities.length === 0 ? (
            <EmptyState
              title="No Activities Registered"
              description="Activities can be created manually or generated automatically from confirmed AI Copilot workflows."
              action={{ label: 'Create First Activity', onClick: () => setShowModal(true) }}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activities.map((act) => (
                <div
                  key={act.activity_id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono text-slate-500">{act.activity_id}</span>
                      <StatusBadge status={act.status} type="activity" />
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1.5">{act.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                      {act.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Priority:</span>
                      <StatusBadge status={act.priority} type="priority" />
                    </div>

                    {act.assigned_department && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Dept:</span>
                        <span className="font-semibold text-slate-300">{act.assigned_department}</span>
                      </div>
                    )}

                    {/* Status updater */}
                    <div className="pt-2">
                      <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Update Status:</label>
                      <select
                        value={act.status}
                        onChange={(e) => handleStatusChange(act.activity_id, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Activity Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-base font-bold text-white mb-4">Create New Activity</h3>
                <form onSubmit={handleCreateActivity} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Activity Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Inspect hydraulic seals on Line 2"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed instructions or specifications..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Maintenance / IT"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500 disabled:opacity-50"
                    >
                      {submitting ? 'Creating...' : 'Create Activity'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
