import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, AlertTriangle, Crown, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

const ICONS = {
  warning: { Icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
  subscription: { Icon: Crown, cls: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' },
  success: { Icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
  info: { Icon: Megaphone, cls: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
};

/** Important notices from the CRM admin pop up once; after "OK" they stay in the bell list. */
export const popupQueue = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((n) => n && n.kind === 'announcement' && n.priority === 'high' && !n.is_read)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

export default function AnnouncementPopup({ userId }) {
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      setQueue(popupQueue(res?.data || res));
    } catch {
      /* the bell still shows notices; a failed check is not worth an error here */
    }
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    const first = setTimeout(load, 1500);
    const every = setInterval(load, 5 * 60 * 1000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [userId, load]);

  const current = queue[0];
  if (!current) return null;
  const { Icon, cls } = ICONS[current.type] || ICONS.info;

  const dismiss = async () => {
    setBusy(true);
    try { await api.markNotificationRead(current.id); } catch { /* shown again next time */ }
    setQueue((q) => q.slice(1));
    setBusy(false);
  };

  return (
    <Modal
      isOpen
      onClose={dismiss}
      title="Announcement"
      subtitle={queue.length > 1 ? `1 of ${queue.length} notices` : 'From the CRM team'}
      footer={
        <button
          id="announcement-ok"
          onClick={dismiss}
          disabled={busy}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
        >
          {queue.length > 1 ? 'OK, next' : 'OK, got it'}
        </button>
      }
    >
      <div className="flex gap-3 items-start">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cls}`}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white break-words">{current.title}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line break-words">{current.message}</p>
          {current.created_at && (
            <p className="mt-2 text-xs text-slate-400">{new Date(current.created_at).toLocaleString()}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
