import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MobileTopHeader from './components/MobileTopHeader';
import MobileTabBar from './components/MobileTabBar';
import StaffManagementModal from './components/StaffManagementModal';
import PageSkeleton from './components/PageSkeleton';
import './index.css';

// Performance Optimization: React Lazy Loading & Code Splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Leads = lazy(() => import('./pages/Leads'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const Activity = lazy(() => import('./pages/Activity'));
const Outreach = lazy(() => import('./pages/Outreach'));
const MyDays = lazy(() => import('./pages/MyDays'));
const FollowUp = lazy(() => import('./pages/FollowUp'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

const tabNames = {
  analytics: 'Analytics',
  leads: 'Leads',
  tasks: 'Task Management',
  activity: 'Activity',
  outreach: 'Outreach',
  mydays: 'My Days',
  followup: 'Follow up',
};

function AppContent() {
  const { user, profile, company, loading, isOwner, isStaff } = useAuth();
  const [activeTab, setActiveTabState] = useState(() => localStorage.getItem('crm_active_tab') || 'analytics');

  const setActiveTab = (tab) => {
    localStorage.setItem('crm_active_tab', tab);
    setActiveTabState(tab);
  };

  // Dedicated Route Detection (/login, /signup, /register)
  const getInitialAuthMode = () => {
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    if (p === '/login' || h.includes('/login') || h.includes('login')) return 'login';
    if (p === '/register' || p === '/signup' || h.includes('/register') || h.includes('/signup') || h.includes('register') || h.includes('signup')) return 'register';
    return 'landing';
  };

  const [authMode, setAuthMode] = useState(getInitialAuthMode);
  const [taskBadgeCount, setTaskBadgeCount] = useState(1);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState(null);
  const [loginInitialPersona, setLoginInitialPersona] = useState('owner');

  const handleOpenStaffModal = (staff = null) => {
    setStaffToEdit(staff);
    setStaffModalOpen(true);
  };

  // Staff Section Access Enforcement: ensure staff lands on an allowed tab
  useEffect(() => {
    if (isStaff && profile?.permissions) {
      const perms = profile.permissions;
      const isAllowed = (tab) => {
        if (tab === 'analytics') return Boolean(perms.view_analytics);
        if (tab === 'leads') return perms.view_leads !== false;
        if (tab === 'tasks') return Boolean(perms.view_tasks);
        if (tab === 'activity') return Boolean(perms.view_activity);
        if (tab === 'outreach') return Boolean(perms.view_outreach);
        if (tab === 'mydays') return Boolean(perms.view_mydays);
        if (tab === 'followup') return Boolean(perms.view_followup);
        return true;
      };

      if (!isAllowed(activeTab)) {
        const priorityOrder = ['leads', 'tasks', 'followup', 'activity', 'outreach', 'mydays', 'analytics'];
        const fallback = priorityOrder.find((t) => isAllowed(t)) || 'leads';
        setActiveTab(fallback);
      }
    }
  }, [isStaff, profile, activeTab]);

  const navigateAuth = (mode) => {
    setAuthMode(mode);
    const targetPath = mode === 'login' ? '/login' : mode === 'register' ? '/signup' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ mode }, '', targetPath);
    }
  };

  // Handle browser popstate
  useEffect(() => {
    const handlePopState = () => {
      setAuthMode(getInitialAuthMode());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Purge all legacy dummy/seed data from browser localStorage on load
  useEffect(() => {
    try {
      // 1. Clean fake leads
      const storedLeads = localStorage.getItem('oneroot_leads_v3');
      if (storedLeads) {
        const parsed = JSON.parse(storedLeads);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(
            (l) =>
              !l.id?.startsWith('lead_') &&
              l.company_name !== 'Gk Optotorg LLC' &&
              l.company_name !== 'Baltimport LLC' &&
              l.company_name !== 'Al-Barakah Global Agro Foods LLC' &&
              l.name !== 'Gk Optotorg LLC'
          );
          if (clean.length !== parsed.length) {
            localStorage.setItem('oneroot_leads_v3', JSON.stringify(clean));
          }
        }
      }

      // 2. Clean fake tasks
      const storedTasks = localStorage.getItem('oneroot_tasks_v3');
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks);
        if (Array.isArray(parsedTasks)) {
          const cleanTasks = parsedTasks.filter((t) => !t.id?.startsWith('task_'));
          if (cleanTasks.length !== parsedTasks.length) {
            localStorage.setItem('oneroot_tasks_v3', JSON.stringify(cleanTasks));
          }
        }
      }

      // 3. Clean fake outreach logs
      const storedOutreach = localStorage.getItem('oneroot_outreach_v1');
      if (storedOutreach) {
        const parsedOutreach = JSON.parse(storedOutreach);
        if (Array.isArray(parsedOutreach)) {
          const cleanOutreach = parsedOutreach.filter((o) => !o.id?.startsWith('out_'));
          if (cleanOutreach.length !== parsedOutreach.length) {
            localStorage.setItem('oneroot_outreach_v1', JSON.stringify(cleanOutreach));
          }
        }
      }

      // 4. Clean fake mydays reports
      const storedMyDays = localStorage.getItem('oneroot_mydays_v1');
      if (storedMyDays) {
        const parsedMyDays = JSON.parse(storedMyDays);
        if (Array.isArray(parsedMyDays)) {
          const cleanMyDays = parsedMyDays.filter((m) => !m.id?.startsWith('report_'));
          if (cleanMyDays.length !== parsedMyDays.length) {
            localStorage.setItem('oneroot_mydays_v1', JSON.stringify(cleanMyDays));
          }
        }
      }
    } catch (e) {
      console.warn('Storage purge error:', e);
    }
  }, []);

  // Keep-alive heartbeat: ping backend health endpoint every 10 minutes so Render free-tier never sleeps during active browser sessions
  useEffect(() => {
    const keepAlive = () => {
      fetch('https://crm-ep4i.onrender.com/health', { mode: 'no-cors' }).catch(() => {});
    };
    keepAlive();
    const interval = setInterval(keepAlive, 10 * 60 * 1000); // every 10 mins
    return () => clearInterval(interval);
  }, []);

  // Count overdue/due-soon tasks for badge
  useEffect(() => {
    if (!profile) return;
    const countTasks = async () => {
      try {
        const { data } = await supabase
          .from('tasks')
          .select('id, due_date, status')
          .eq('company_id', profile.company_id)
          .neq('status', 'Completed');

        if (!data || data.length === 0) {
          setTaskBadgeCount(1);
          return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const alertCount = data.filter((t) => {
          const due = new Date(t.due_date);
          due.setHours(0, 0, 0, 0);
          return due <= today;
        }).length;
        setTaskBadgeCount(alertCount || 1);
      } catch {
        setTaskBadgeCount(1);
      }
    };
    countTasks();
  }, [profile, activeTab]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10">
        <PageSkeleton />
      </div>
    );
  }


  // Public Dedicated Routes: Landing (/), Login (/login), Register (/signup)
  if (!user || !profile) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        {authMode === 'landing' ? (
          <LandingPage
            onLoginClick={() => {
              setLoginInitialPersona('owner');
              navigateAuth('login');
            }}
            onRegisterClick={() => navigateAuth('register')}
          />
        ) : authMode === 'register' ? (
          <RegisterPage
            onSwitchToLogin={(persona) => {
              if (persona) setLoginInitialPersona(persona);
              navigateAuth('login');
            }}
            onBackToLanding={() => navigateAuth('landing')}
          />
        ) : (
          <LoginPage
            initialPersona={loginInitialPersona}
            onSwitchToRegister={() => navigateAuth('register')}
            onBackToLanding={() => navigateAuth('landing')}
          />
        )}
      </Suspense>
    );
  }

  // Main App Page Routing: EXACTLY the 7 sections from user screenshot
  const renderPage = () => {
    switch (activeTab) {
      case 'analytics':
        return <Analytics />;
      case 'leads':
        return <Leads />;
      case 'tasks':
        return <TaskManagement />;
      case 'activity':
        return (
          <Activity
            onNavigateToLeads={() => setActiveTab('leads')}
            onNavigateToMyDays={() => setActiveTab('mydays')}
          />
        );
      case 'outreach':
        return <Outreach />;
      case 'mydays':
        return <MyDays />;
      case 'followup':
        return <FollowUp />;
      default:
        return <Analytics />;
    }
  };

  const breadcrumbPrefix = isStaff ? 'Staff Portal' : 'Main Menu';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row antialiased text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        companyName={company?.name || 'Travel-Trade'}
        taskBadgeCount={taskBadgeCount}
        onOpenStaffModal={handleOpenStaffModal}
      />
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Mobile Top Header: Slim, Clean Light Theme with Brand & Actions */}
        <MobileTopHeader
          companyName={company?.name || 'Travel-Trade'}
          onOpenStaffModal={handleOpenStaffModal}
        />
        
        {/* Desktop TopBar */}
        <div className="hidden md:block">
          <TopBar
            breadcrumb={`${breadcrumbPrefix} / ${tabNames[activeTab] || 'Dashboard'}`}
            onCustomizeWidget={() => {}}
            onOpenStaffModal={handleOpenStaffModal}
          />
        </div>

        {/* Main Content Area - with bottom padding on mobile so bottom bar never obscures content */}
        <main className="flex-1 p-3 sm:p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          <Suspense fallback={<PageSkeleton />}>
            {renderPage()}
          </Suspense>
        </main>

        {/* Mobile Bottom Tab Bar: Native App Bottom Nav */}
        <MobileTabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          taskBadgeCount={taskBadgeCount}
          onOpenStaffModal={handleOpenStaffModal}
        />
      </div>

      {/* Owner Staff Management Modal */}
      {isOwner && (
        <StaffManagementModal
          isOpen={staffModalOpen}
          onClose={() => {
            setStaffModalOpen(false);
            setStaffToEdit(null);
          }}
          initialEditStaff={staffToEdit}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
