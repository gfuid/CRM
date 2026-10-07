import { useState } from 'react';
import { Bell, Moon, Sun, LogOut, KeyRound, ChevronDown, CheckCircle2, AlertTriangle, CreditCard, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useRouter } from '../../lib/router';
import { useAsync } from '../../lib/hooks';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { ROLE_LABEL } from '../../lib/constants';
import { Avatar, IconButton, Menu, MenuItem } from '../ui';
import ProfileModal from './ProfileModal';

const NOTE_ICON = { billing: CreditCard, warning: AlertTriangle, success: CheckCircle2, info: Info };
const NOTE_TONE = { billing: 'text-warning', warning: 'text-danger', success: 'text-primary', info: 'text-info' };

function Notifications() {
  const toast = useToast();
  const { data, reload } = useAsync(() => api.notifications(), []);
  const items = data?.items || [];
  const unread = data?.unread || 0;

  const markAll = async () => {
    try {
      await api.readAllNotifications();
      reload({ quiet: true });
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Menu
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={() => {
            toggle();
            if (!open) reload({ quiet: true });
          }}
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    >
      <div className="w-[min(360px,calc(100vw-2rem))]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-sm font-bold text-ink">Notifications</span>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="text-xs font-semibold text-primary hover:underline">
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-2.5 py-8 text-center text-sm text-muted">You’re all caught up.</p>
          ) : (
            items.map((n) => {
              const Icon = NOTE_ICON[n.type] || Info;
              return (
                <div key={n.id} className={`flex gap-3 rounded-lg px-2.5 py-2.5 ${n.read ? '' : 'bg-primary-soft/40'}`}>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${NOTE_TONE[n.type] || 'text-info'}`} aria-hidden />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{n.title}</div>
                    <div className="text-[13px] text-muted">{n.message}</div>
                    <div className="mt-0.5 text-[11px] text-faint">{n.system ? 'Billing' : timeAgo(n.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Menu>
  );
}

export default function TopBar({ leading }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { section } = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      {leading}
      <div className="min-w-0 flex-1 text-sm font-semibold capitalize text-muted lg:hidden">{section}</div>
      <div className="ml-auto flex items-center gap-1">
        <IconButton icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} />
        <Notifications />
        <Menu
          trigger={({ toggle: open }) => (
            <button type="button" onClick={open} className="ml-1 flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-subtle" aria-label="Account menu">
              <Avatar name={user?.name} size={32} />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight text-ink">{user?.name}</span>
                <span className="block text-xs leading-tight text-muted">{ROLE_LABEL[user?.role]}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-faint sm:block" aria-hidden />
            </button>
          )}
        >
          <div className="px-2.5 py-2">
            <div className="truncate text-sm font-semibold text-ink">{user?.name}</div>
            <div className="truncate text-xs text-muted">{user?.email}</div>
          </div>
          <MenuItem icon={KeyRound} onClick={() => setProfileOpen(true)}>
            Profile & password
          </MenuItem>
          <MenuItem icon={LogOut} danger onClick={() => signOut()}>
            Sign out
          </MenuItem>
        </Menu>
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}
