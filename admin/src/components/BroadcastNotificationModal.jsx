import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  X,
  Clock,
  Trash2,
  Users,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  CreditCard
} from 'lucide-react';

const QUICK_TEMPLATES = [
  {
    id: 'sub_renew',
    label: '⏰ Subscription Renewal',
    title: 'CRM Subscription Renewal Reminder',
    message:
      'Dear Business Owner, your CRM subscription is approaching its renewal date. Please renew your plan promptly to ensure uninterrupted access for your entire sales and operations team.',
    type: 'subscription',
  },
  {
    id: 'quota_upgraded',
    label: '🚀 Staff Quota Increased',
    title: 'Staff Seat Limit Increased',
    message:
      'Great news! The administrator has increased your team quota limit. You can now add more staff members and sales reps from the Staff Management modal.',
    type: 'success',
  },
  {
    id: 'payment_alert',
    label: '💳 Payment / Invoice Due',
    title: 'Payment & Invoice Reminder',
    message:
      'Your monthly invoice is pending for processing. Please review your billing section or contact management to keep your account in good standing.',
    type: 'warning',
  },
  {
    id: 'system_notice',
    label: '📢 Platform Notice',
    title: 'Important System Announcement',
    message:
      'We have rolled out new trade management features including enhanced commodity tracking and instant port analytics for your workspace.',
    type: 'info',
  },
];

export default function BroadcastNotificationModal({
  isOpen,
  onClose,
  users = [],
  apiBase,
  getHeaders,
  onNotificationSent = () => {},
}) {
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'history'
  const [target, setTarget] = useState('all_owners'); // 'all_owners' | 'all' | userId
  const [title, setTitle] = useState(QUICK_TEMPLATES[0].title);
  const [message, setMessage] = useState(QUICK_TEMPLATES[0].message);
  const [type, setType] = useState('subscription');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      setFeedback(null);
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${apiBase}/notifications`, {
        headers: getHeaders(),
      }).then((r) => r.json());
      if (res.success && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch admin notifications history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApplyTemplate = (tpl) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setType(tpl.type);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', text: 'Please fill both Title and Message' });
      return;
    }

    setSending(true);
    setFeedback(null);

    let targetName = 'All Business Owners';
    let targetUserId = null;

    if (target === 'all') {
      targetName = 'All Platform Users';
    } else if (target !== 'all_owners') {
      const selectedUser = users.find((u) => u.id === target);
      targetName = selectedUser ? `${selectedUser.name} (${selectedUser.email})` : 'Specific User';
      targetUserId = target;
    }

    try {
      const res = await fetch(`${apiBase}/notifications`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          target: targetUserId ? 'specific_user' : target,
          target_user_id: targetUserId,
          target_name: targetName,
          title: title.trim(),
          message: message.trim(),
          type,
          priority: type === 'subscription' || type === 'warning' ? 'high' : 'normal',
        }),
      }).then((r) => r.json());

      if (res.success) {
        setFeedback({ type: 'success', text: `Notification delivered to ${targetName}!` });
        onNotificationSent();
        fetchHistory();
        setTimeout(() => {
          setActiveTab('history');
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', text: res.message || 'Failed to dispatch notification' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Network error sending notification' });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${apiBase}/notifications/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      }).then((r) => r.json());
      if (res.success) {
        setHistoryList((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm m-0">
                Owner Dashboard Notification Center
              </h3>
              <p className="text-[11px] text-slate-500 m-0">
                Send real-time alerts & renewal notices directly to business owner dashboards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('compose')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'compose'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Compose & Send Notice
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Sent History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold">
              {historyList.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {activeTab === 'compose' ? (
            <form onSubmit={handleSend} className="space-y-4">
              {/* Recipient Target */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Send Notice To: *
                </label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                >
                  <option value="all_owners">👑 All Business Owners (Broadcast to all Owner Dashboards)</option>
                  <option value="all">👥 All Platform Users (Owners + Staff Reps)</option>
                  <optgroup label="Direct to Specific User / Owner">
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.email} ({u.persona === 'owner' ? 'Owner' : u.role.toUpperCase()})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Quick Preset Templates */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Quick Templates (Click to apply):</span>
                  <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                    <Sparkles size={11} /> 1-Click Fill
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="p-2 text-left rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-amber-50/80 hover:border-amber-300 transition-all cursor-pointer group"
                    >
                      <div className="font-bold text-slate-800 group-hover:text-amber-900 text-[11px]">
                        {tpl.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{tpl.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notice Type & Alert Tone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notice Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="subscription">⏰ Subscription Renewal</option>
                    <option value="warning">⚠️ High-Priority Warning</option>
                    <option value="success">🎉 Success / Quota Increased</option>
                    <option value="info">ℹ️ General Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Priority</label>
                  <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Instant Dashboard Popup</span>
                  </div>
                </div>
              </div>

              {/* Notification Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notification Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Your CRM Subscription is Due for Renewal"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Notification Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notification Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write message explaining the renewal or alert..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed font-medium"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Send size={13} />
                  <span>{sending ? 'Dispatching...' : 'Dispatch Notification Now'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* HISTORY TAB */
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="py-8 text-center text-slate-400">Loading sent notifications...</div>
              ) : historyList.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                  <p>No broadcast notifications dispatched yet.</p>
                </div>
              ) : (
                historyList.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            n.type === 'subscription'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : n.type === 'warning'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {n.type}
                        </span>
                        <span className="font-bold text-slate-900">{n.title}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed m-0 font-medium">{n.message}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>Target: {n.target_name || n.target}</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
