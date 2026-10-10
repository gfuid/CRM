import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  Clock,
  AlertTriangle,
  Ship,
  FileCheck,
  CheckCheck,
  X,
  Crown,
  Sparkles,
  Info,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_TRADE_NOTIFICATIONS = [
  {
    id: 'mock-1',
    type: 'urgent',
    title: 'High-Value Follow-up Due Today',
    desc: 'Al Barakah Global Agro ($125,000 CIF Dubai) follow-up scheduled.',
    time: '15 mins ago',
    read: false,
    icon: AlertTriangle,
    iconColor: 'text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400',
  },
  {
    id: 'mock-2',
    type: 'shipping',
    title: 'Port Clearance Notice',
    desc: 'Export consignment container #4089 cleared Jebel Ali port inspection.',
    time: '1 hour ago',
    read: false,
    icon: Ship,
    iconColor: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  {
    id: 'mock-3',
    type: 'import',
    title: 'Bulk CSV Leads Imported',
    desc: '15 new trade buyer records successfully parsed and verified in CRM.',
    time: '3 hours ago',
    read: true,
    icon: FileCheck,
    iconColor: 'text-blue-600 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400',
  },
];

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function NotificationsPopover({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState(DEFAULT_TRADE_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    api
      .getNotifications()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const liveItems = res.data.map((item) => {
            let Icon = Bell;
            let iconColor = 'text-blue-600 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400';

            if (item.type === 'subscription') {
              Icon = Crown;
              iconColor = 'text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400';
            } else if (item.type === 'warning' || item.priority === 'urgent' || item.priority === 'high') {
              Icon = ShieldAlert;
              iconColor = 'text-rose-600 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400';
            } else if (item.type === 'quota') {
              Icon = Sparkles;
              iconColor = 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400';
            }

            return {
              id: item.id,
              type: item.type,
              title: item.title,
              desc: item.message,
              time: formatTimeAgo(item.created_at),
              read: !!item.is_read,
              isServer: true,
              priority: item.priority,
              icon: Icon,
              iconColor,
            };
          });

          // Prepend server broadcasts to default trade list
          setNotifications([...liveItems, ...DEFAULT_TRADE_NOTIFICATIONS]);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch notifications:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch (e) {
      // ignore
    }
  };

  const markSingleRead = async (id, isServer) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (isServer) {
      try {
        await api.markNotificationRead(id);
      } catch (e) {
        // ignore
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div className="absolute right-0 top-12 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-scaleUp text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Trade & Admin Alerts
            </h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.map((item) => {
            const Icon = item.icon || Bell;
            const isSubscriptionNotice = item.type === 'subscription';

            return (
              <div
                key={item.id}
                onClick={() => markSingleRead(item.id, item.isServer)}
                className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  !item.read
                    ? isSubscriptionNotice
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-l-4 border-l-amber-500'
                      : 'bg-emerald-50/30 dark:bg-emerald-950/10'
                    : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}>
                  <Icon size={15} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className={`text-xs font-bold truncate ${!item.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {item.title}
                      </h4>
                      {isSubscriptionNotice && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 shrink-0">
                          Notice
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] font-semibold text-slate-400">
          Live Export, Quota & Admin Broadcasts
        </div>
      </div>
    </>
  );
}
