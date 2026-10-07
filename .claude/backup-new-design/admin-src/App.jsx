import { useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './lib/router';
import AdminShell, { NAV } from './components/layout/AdminShell';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import CompaniesPage from './pages/CompaniesPage';
import NotificationsPage from './pages/NotificationsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

const PAGES = {
  overview: OverviewPage,
  companies: CompaniesPage,
  notifications: NotificationsPage,
  users: UsersPage,
  settings: SettingsPage,
};

function Console() {
  const { signedIn } = useAuth();
  const { section, navigate } = useRouter();
  const Page = PAGES[section];

  useEffect(() => {
    if (signedIn && !Page) navigate('/overview', { replace: true });
  }, [signedIn, Page, navigate]);

  useEffect(() => {
    const label = NAV.find((n) => n.key === section)?.label;
    document.title = signedIn && label ? `${label} - Travel-Trade CRM - Admin` : 'Travel-Trade CRM - Admin';
  }, [signedIn, section]);

  if (!signedIn) return <LoginPage />;
  return <AdminShell>{Page ? <Page /> : null}</AdminShell>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider>
            <Console />
          </RouterProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
