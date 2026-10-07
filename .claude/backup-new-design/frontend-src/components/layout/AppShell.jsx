import { useState } from 'react';
import { House, Users, ListTodo, ChartColumn, UsersRound, Settings, Plus, Menu as MenuIcon, X } from 'lucide-react';
import { Link, useRouter } from '../../lib/router';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../BrandLogo';
import TopBar from './TopBar';

export const NAV = [
  { key: 'today', label: 'Today', icon: House },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'tasks', label: 'Tasks', icon: ListTodo },
  { key: 'reports', label: 'Reports', icon: ChartColumn },
  { key: 'team', label: 'Team', icon: UsersRound, ownerOnly: true },
  { key: 'settings', label: 'Settings', icon: Settings, ownerOnly: true },
];

function NavLinks({ onNavigate }) {
  const { section } = useRouter();
  const { isOwner } = useAuth();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.filter((n) => !n.ownerOnly || isOwner).map((n) => {
        const active = section === n.key;
        return (
          <Link
            key={n.key}
            to={`/app/${n.key}`}
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
  const { company, can } = useAuth();
  const { navigate } = useRouter();
  return (
    <div className="flex h-full flex-col gap-5 px-3 py-4">
      <div className="flex items-center gap-2.5 px-2">
        <BrandLogo size={30} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-ink">{company?.name || 'Travel-Trade CRM'}</div>
          <div className="text-xs text-muted">Travel-Trade CRM</div>
        </div>
      </div>
      {can('leads_create') && (
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            navigate('/app/leads?new=1');
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-strong"
        >
          <Plus className="h-4 w-4" aria-hidden /> New lead
        </button>
      )}
      <NavLinks onNavigate={onNavigate} />
      {company?.is_demo && (
        <div className="mt-auto rounded-lg bg-warning-soft px-3 py-2.5 text-xs text-warning-ink">
          <span className="font-bold">Demo workspace.</span> Sample data so you can see how everything looks.
        </div>
      )}
    </div>
  );
}

/** Bottom tab bar on phones. */
function MobileTabs() {
  const { section } = useRouter();
  const tabs = NAV.slice(0, 4);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((n) => {
        const active = section === n.key;
        return (
          <Link
            key={n.key}
            to={`/app/${n.key}`}
            aria-current={active ? 'page' : undefined}
            className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? 'text-primary' : 'text-muted'}`}
          >
            <n.icon className="h-5 w-5" aria-hidden />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppShell({ children }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-line bg-surface lg:block">
        <SidebarBody />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40 animate-fade-in" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-pop animate-slide-in">
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-subtle"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <TopBar
          leading={
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-subtle lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          }
        />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>
      <MobileTabs />
    </div>
  );
}
