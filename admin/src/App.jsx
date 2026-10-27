import React, { useState, useEffect } from 'react';
import AdminSidebar from './components/AdminSidebar';
import AdminTopBar from './components/AdminTopBar';
import AdminLoginPage from './pages/AdminLoginPage';
import OverviewSection from './pages/OverviewSection';
import UsersSection from './pages/UsersSection';
import DeveloperSection from './pages/DeveloperSection';
import SupportTicketsSection from './pages/SupportTicketsSection';
import AiAssistantSection from './pages/AiAssistantSection';
import SettingsSection from './pages/SettingsSection';
import BroadcastNotificationModal from './components/BroadcastNotificationModal';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const LOCAL_API_BASE = 'http://localhost:5000/api/v1/admin';
const REMOTE_API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/admin`
  : 'https://crm-ep4i.onrender.com/api/v1/admin';

// If local, prefer localhost:5000 where backend is running
const API_BASE = isLocal ? LOCAL_API_BASE : REMOTE_API_BASE;

export default function App() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('crm_admin_user');
      const token = localStorage.getItem('crm_admin_token');
      return savedUser && token ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Core Platform Data State
  const [users, setUsers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [overviewSummary, setOverviewSummary] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const getHeaders = () => {
    const token = localStorage.getItem('crm_admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch core administrative telemetry from backend
  const fetchAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const headers = getHeaders();
      let activeUrl = API_BASE;

      let [uRes, sRes, oRes] = await Promise.all([
        fetch(`${activeUrl}/users`, { headers }).then((r) => r.json()).catch(() => ({})),
        fetch(`${activeUrl}/subscription`, { headers }).then((r) => r.json()).catch(() => ({})),
        fetch(`${activeUrl}/overview-summary`, { headers }).then((r) => r.json()).catch(() => ({})),
      ]);

      // If local server returned nothing and we are on localhost, fallback to remote Render
      if ((!uRes || !uRes.success) && isLocal && activeUrl === LOCAL_API_BASE) {
        activeUrl = REMOTE_API_BASE;
        [uRes, sRes, oRes] = await Promise.all([
          fetch(`${activeUrl}/users`, { headers }).then((r) => r.json()).catch(() => ({})),
          fetch(`${activeUrl}/subscription`, { headers }).then((r) => r.json()).catch(() => ({})),
          fetch(`${activeUrl}/overview-summary`, { headers }).then((r) => r.json()).catch(() => ({})),
        ]);
      }

      if (uRes && uRes.success) setUsers(uRes.data);
      if (sRes && sRes.success) setSubscription(sRes.data);
      if (oRes && oRes.success) setOverviewSummary(oRes.data);

      if (isManual) {
        showToast('Platform metrics synchronized with Node.js backend');
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Backend connection error: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (adminUser) {
      fetchAllData();
    }
  }, [adminUser]);

  const handleSignOut = () => {
    localStorage.removeItem('crm_admin_token');
    localStorage.removeItem('crm_admin_user');
    setAdminUser(null);
  };

  const handleCreateUser = async (userData) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Added ${userData.name} to personnel directory`);
      fetchAllData();
      return true;
    } else {
      throw new Error(data.message || 'Failed to create user');
    }
  };

  const handleDeleteOwner = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to delete owner account', 'error');
        return false;
      }
      showToast('Owner account and tenant data permanently deleted');
      await fetchAllData();
      return true;
    } catch (err) {
      showToast(`Network error deleting owner: ${err.message}`, 'error');
      return false;
    }
  };

  const handleUpdateRole = async (id, role) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/role`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Privileges updated to '${role}'`);
        fetchAllData();
      } else {
        showToast(data.message || 'Error updating role', 'error');
      }
    } catch (err) {
      showToast('Network error updating role', 'error');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Status updated');
        fetchAllData();
      } else {
        showToast(data.message || 'Error toggling status', 'error');
      }
    } catch (err) {
      showToast('Network error updating status', 'error');
    }
  };

  const handleUpdateStaffLimit = async (id, staff_limit) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/staff-limit`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ staff_limit: Number(staff_limit) }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Staff limit updated to ${staff_limit} seats!`);
        fetchAllData();
        return true;
      } else {
        showToast(data.message || 'Error updating staff limit', 'error');
        return false;
      }
    } catch (err) {
      showToast('Network error updating staff limit', 'error');
      return false;
    }
  };

  const handleToggleFeature = async (id, key, value) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/features`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ [key]: Boolean(value) }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Feature ${value ? 'enabled' : 'disabled'}`);
        fetchAllData();
        return true;
      }
      showToast(data.message || 'Error updating feature', 'error');
      return false;
    } catch (err) {
      showToast('Network error updating feature', 'error');
      return false;
    }
  };

  const handleResetPassword = async (id, password) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Password reset. The user can sign in with the new password now.');
        return true;
      }
      showToast(data.message || 'Error resetting password', 'error');
      return false;
    } catch (err) {
      showToast('Network error resetting password', 'error');
      return false;
    }
  };

  const handleUpdateSettings = async (settingsData) => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(settingsData),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Platform settings saved successfully');
        fetchAllData();
      } else {
        showToast(data.message || 'Failed to update settings', 'error');
      }
    } catch (err) {
      showToast('Network error saving settings', 'error');
    }
  };

  // Secure Admin Gate: Render Login Page if not authenticated
  if (!adminUser) {
    return (
      <AdminLoginPage
        onLoginSuccess={(user) => {
          setAdminUser(user);
          showToast(`Welcome back, ${user.name || 'Administrator'}`);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-[#eef1f6] text-slate-900 font-sans antialiased">
      {/* Responsive Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onRefresh={() => fetchAllData(true)}
          refreshing={refreshing}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSignOut={handleSignOut}
          onOpenNotificationModal={() => setIsBroadcastModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={28} className="animate-spin text-emerald-500" />
              <div className="text-sm font-semibold">Connecting to Admin Telemetry Services...</div>
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <OverviewSection
                  overviewSummary={overviewSummary}
                  users={users}
                  company={subscription?.company}
                  onNavigate={setActiveSection}
                  onUpdateStaffLimit={handleUpdateStaffLimit}
                  onUpdateRole={handleUpdateRole}
                  onToggleStatus={handleToggleStatus}
                  onToggleFeature={handleToggleFeature}
                  onResetPassword={handleResetPassword}
                />
              )}

              {activeSection === 'users' && (
                <UsersSection
                  users={users}
                  onCreateUser={handleCreateUser}
                  onUpdateRole={handleUpdateRole}
                  onToggleStatus={handleToggleStatus}
                  onUpdateStaffLimit={handleUpdateStaffLimit}
                  onToggleFeature={handleToggleFeature}
                  onResetPassword={handleResetPassword}
                  onDeleteOwner={handleDeleteOwner}
                />
              )}

              {activeSection === 'support' && (
                <SupportTicketsSection apiBase={API_BASE} getHeaders={getHeaders} showToast={showToast} />
              )}

              {activeSection === 'ai' && (
                <AiAssistantSection apiBase={API_BASE} getHeaders={getHeaders} showToast={showToast} />
              )}

              {activeSection === 'developer' && (
                <DeveloperSection
                  apiBase={API_BASE}
                  getHeaders={getHeaders}
                  showToast={showToast}
                />
              )}

              {activeSection === 'settings' && (
                <SettingsSection
                  company={subscription?.company}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Broadcast Notification Modal */}
      <BroadcastNotificationModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        users={users}
        apiBase={API_BASE}
        getHeaders={getHeaders}
        onNotificationSent={() => showToast('Notification broadcast successfully sent to Owner Dashboard!')}
      />

      {/* Toast Notification Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-fadeIn transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="text-rose-600" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
