import React, { useState } from 'react';
import { Bell, Check, Clock, AlertTriangle, Ship, FileCheck, CheckCheck, X } from 'lucide-react';

export default function NotificationsPopover({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'urgent',
      title: 'High-Value Follow-up Due Today',
      desc: 'Al Barakah Global Agro ($125,000 CIF Dubai) follow-up scheduled.',
      time: '15 mins ago',
      read: false,
      icon: AlertTriangle,
      iconColor: 'text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400',
    },
    {
      id: 2,
      type: 'shipping',
      title: 'Port Clearance Notice',
      desc: 'Export consignment container #4089 cleared Jebel Ali port inspection.',
      time: '1 hour ago',
      read: false,
      icon: Ship,
      iconColor: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400',
    },
    {
      id: 3,
      type: 'import',
      title: 'Bulk CSV Leads Imported',
      desc: '15 new trade buyer records successfully parsed and verified in CRM.',
      time: '3 hours ago',
      read: false,
      icon: FileCheck,
      iconColor: 'text-blue-600 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400',
    },
    {
      id: 4,
      type: 'task',
      title: 'Inspection Certificate Due',
      desc: 'SGS quality certificate required for upcoming Basmati Rice dispatch.',
      time: 'Yesterday',
      read: true,
      icon: Clock,
      iconColor: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
    },
  ]);

  if (!isOpen) return null;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markSingleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
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
              Trade Notifications
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
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => markSingleRead(item.id)}
                className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  !item.read ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}>
                  <Icon size={15} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={`text-xs font-bold truncate ${!item.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                      {item.title}
                    </h4>
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
          Live Export & Trade Alerts
        </div>
      </div>
    </>
  );
}
