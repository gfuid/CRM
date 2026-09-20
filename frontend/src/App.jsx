import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
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
  const { user, profile, company, loading, loginAsDemo } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [authMode, setAuthMode] = useState('landing'); // 'landing' | 'login' | 'register'
  const [taskBadgeCount, setTaskBadgeCount] = useState(1);

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

  // Public Marketing Landing Page & Auth Flow
  if (!user || !profile) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        {authMode === 'landing' ? (
          <LandingPage
            onLoginClick={() => setAuthMode('login')}
            onRegisterClick={() => setAuthMode('register')}
            onExploreDemo={() => loginAsDemo()}
          />
        ) : authMode === 'register' ? (
          <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />
        ) : (
          <LoginPage
            onSwitchToRegister={() => setAuthMode('register')}
            onBackToLanding={() => setAuthMode('landing')}
            onExploreDemo={() => loginAsDemo()}
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
        return <Activity onNavigateToLeads={() => setActiveTab('leads')} />;
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-900">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        companyName={company?.name || 'Travel-Trade'}
        taskBadgeCount={taskBadgeCount}
      />
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <TopBar
          breadcrumb={`Main Menu / ${tabNames[activeTab] || 'Dashboard'}`}
          onCustomizeWidget={() => {}}
        />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<PageSkeleton />}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
