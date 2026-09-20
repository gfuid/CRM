import React, { useState, useEffect } from 'react';
import AdminSidebar from './components/AdminSidebar';
import AdminTopBar from './components/AdminTopBar';
import OverviewSection from './pages/OverviewSection';
import UsersSection from './pages/UsersSection';
import SettingsSection from './pages/SettingsSection';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1/admin';
const HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'usr_admin_1',
};

export default function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Fetch core administrative telemetry from backend
  const fetchAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [uRes, sRes, oRes] = await Promise.all([
        fetch(`${API_BASE}/users`, { headers: HEADERS }).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/subscription`, { headers: HEADERS }).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/overview-summary`, { headers: HEADERS }).then((r) => r.json()).catch(() => ({})),
      ]);

      if (uRes.success) setUsers(uRes.data);
      if (sRes.success) setSubscription(sRes.data);
      if (oRes.success) setOverviewSummary(oRes.data);

      if (isManual) {
        showToast('Platform metrics synchronized with Node.js backend');
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Backend connection error (Port 5000)', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreateUser = async (userData) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: HEADERS,
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

  const handleUpdateRole = async (id, role) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/role`, {
        method: 'PATCH',
        headers: HEADERS,
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
        headers: HEADERS,
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

  const handleUpdateSettings = async (settingsData) => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: HEADERS,
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

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      {/* Responsive Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onRefresh={() => fetchAllData(true)}
          refreshing={refreshing}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
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
                />
              )}

              {activeSection === 'users' && (
                <UsersSection
                  users={users}
                  onCreateUser={handleCreateUser}
                  onUpdateRole={handleUpdateRole}
                  onToggleStatus={handleToggleStatus}
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
