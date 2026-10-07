import { lazy, Suspense, useEffect } from 'react';
import { RouterProvider, useRouter } from './lib/router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/layout/AppShell';
import { Skeleton } from './components/ui';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const TodayPage = lazy(() => import('./pages/TodayPage'));
const LeadsPage = lazy(() => import('./pages/LeadsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const PAGES = {
  today: TodayPage,
  leads: LeadsPage,
  tasks: TasksPage,
  reports: ReportsPage,
  team: TeamPage,
  settings: SettingsPage,
};
const OWNER_ONLY = new Set(['team', 'settings']);

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function Redirect({ to }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(to, { replace: true }), [to, navigate]);
  return null;
}

function Routes() {
  const { path, section } = useRouter();
  const { status, isOwner } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
      </div>
    );
  }

  const signedIn = status === 'signed-in';

  if (path.startsWith('/app')) {
    if (!signedIn) return <Redirect to="/login" />;
    if (!PAGES[section] || (OWNER_ONLY.has(section) && !isOwner)) return <Redirect to="/app/today" />;
    const Page = PAGES[section];
    return (
      <AppShell>
        <Suspense fallback={<PageFallback />}>
          <Page />
        </Suspense>
      </AppShell>
    );
  }

  if (path === '/login' || path === '/signup') {
    if (signedIn) return <Redirect to="/app/today" />;
    return (
      <Suspense fallback={null}>
        <AuthPage mode={path === '/signup' ? 'signup' : 'login'} />
      </Suspense>
    );
  }

  if (signedIn && path === '/') return <Redirect to="/app/today" />;
  return (
    <Suspense fallback={null}>
      <LandingPageRoute />
    </Suspense>
  );
}

function LandingPageRoute() {
  const { navigate } = useRouter();
  return <LandingPage onLoginClick={() => navigate('/login')} onRegisterClick={() => navigate('/signup')} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RouterProvider>
          <AuthProvider>
            <Routes />
          </AuthProvider>
        </RouterProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
