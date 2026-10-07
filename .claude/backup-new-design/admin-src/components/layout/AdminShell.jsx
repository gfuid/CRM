import { useRef, useState } from 'react';
import { LayoutDashboard, Building, Megaphone, Users, Settings, Menu as MenuIcon, X, Moon, Sun, LogOut, ShieldCheck } from 'lucide-react';
import { Link, useRouter } from '../../lib/router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar, IconButton, Menu, MenuItem, useDialog } from '../ui';
import BrandLogo from '../BrandLogo';

export const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'companies', label: 'Companies', icon: Building },
  { key: 'notifications', label: 'Notifications', icon: Megaphone },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const apiHost = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').host;
  } catch {
    return 'API address is not a valid URL';
  }
})();

function NavLinks({ onNavigate }) {
  const { section } = useRouter();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map((n) => {
        const active = section === n.key;
        return (
          <Link
            key={n.key}
            to={`/${n.key}`}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${
              active ? 'bg-primary-soft text-primary-ink' : 'text-muted hover:bg-subtle hover:text-ink'
            }`}
          >
            <n.icon className="h-[18px] w-[18px]" aria-hidden />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }) {
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <div className="flex items-center gap-2.5 px-2">
        <BrandLogo size={30} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-ink">Travel-Trade CRM</div>
          <div className="text-xs text-muted">Platform admin</div>
        </div>
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto rounded-lg bg-subtle px-3 py-2.5 text-xs text-muted">
        <span className="block font-semibold text-ink">Connected server</span>
        <span className="block break-all">{apiHost}</span>
      </div>
    </div>
  );
}

function MobileNav({ open, onClose }) {
  const ref = useRef(null);
  useDialog(open, onClose, ref);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-slate-950/40 animate-fade-in" onClick={onClose} aria-hidden />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-pop animate-slide-in-left"
      >
        <IconButton icon={X} label="Close menu" onClick={onClose} className="absolute right-3 top-3.5" />
        <SidebarBody onNavigate={onClose} />
      </aside>
    </div>
  );
}

function TopBar({ onOpenMenu }) {
  const { section } = useRouter();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const current = NAV.find((n) => n.key === section);
  const name = user?.name || 'Platform Administrator';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-2 backdrop-blur sm:px-4">
      <IconButton icon={MenuIcon} label="Open menu" onClick={onOpenMenu} className="lg:hidden" />
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
        <BrandLogo size={22} />
        <span className="truncate text-sm font-bold text-ink">{current?.label || 'Admin'}</span>
      </div>
      <div className="hidden flex-1 items-center gap-2 text-[13px] font-medium text-muted lg:flex">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
        Platform admin console
      </div>
      <IconButton icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} />
      <Menu
        trigger={({ toggle: toggleMenu, open }) => (
          <button
            type="button"
            onClick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Account menu"
            className="flex h-10 items-center gap-2 rounded-lg px-1.5 hover:bg-subtle sm:px-2"
          >
            <Avatar name={name} size={30} />
            <span className="hidden max-w-[160px] truncate text-sm font-semibold text-ink sm:block">{name}</span>
          </button>
        )}
      >
        <div className="border-b border-line px-2.5 pb-2 pt-1">
          <div className="truncate text-sm font-semibold text-ink">{name}</div>
          {user?.email && <div className="truncate text-xs text-muted">{user.email}</div>}
        </div>
        <div className="pt-1">
          <MenuItem icon={LogOut} onClick={() => signOut('You have signed out.')}>
            Sign out
          </MenuItem>
        </div>
      </Menu>
    </header>
  );
}

export default function AdminShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-line bg-surface lg:block">
        <SidebarBody />
      </aside>
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-60">
        <TopBar onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
