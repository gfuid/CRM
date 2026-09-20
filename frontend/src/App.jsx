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
  const [activeTab, setActiveTab] = useState('analytics');

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
            onLoginClick={() => navigateAuth('login')}
            onRegisterClick={() => navigateAuth('register')}
          />
        ) : authMode === 'register' ? (
          <RegisterPage
            onSwitchToLogin={() => navigateAuth('login')}
            onBackToLanding={() => navigateAuth('landing')}
          />
        ) : (
          <LoginPage
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
        onOpenStaffModal={() => setStaffModalOpen(true)}
      />
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Mobile Top Header: Slim, Clean Light Theme with Brand & Actions */}
        <MobileTopHeader
          companyName={company?.name || 'Travel-Trade'}
          onOpenStaffModal={() => setStaffModalOpen(true)}
        />
        
        {/* Desktop TopBar */}
        <div className="hidden md:block">
          <TopBar
            breadcrumb={`${breadcrumbPrefix} / ${tabNames[activeTab] || 'Dashboard'}`}
            onCustomizeWidget={() => {}}
            onOpenStaffModal={() => setStaffModalOpen(true)}
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
          onOpenStaffModal={() => setStaffModalOpen(true)}
        />
      </div>

      {/* Owner Staff Management Modal */}
      {isOwner && (
        <StaffManagementModal
          isOpen={staffModalOpen}
          onClose={() => setStaffModalOpen(false)}
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
