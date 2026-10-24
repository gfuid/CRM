import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext({});

export const isStaffDeleted = (u) => {
  if (!u) return false;
  try {
    const deleted = JSON.parse(localStorage.getItem('crm_deleted_staff') || '[]');
    if (!deleted || !Array.isArray(deleted) || deleted.length === 0) return false;
    const lowerDeleted = deleted.map((x) => String(x).toLowerCase());
    if (u.id && lowerDeleted.includes(String(u.id).toLowerCase())) return true;
    if (u._id && lowerDeleted.includes(String(u._id).toLowerCase())) return true;
    if (u.email && lowerDeleted.includes(String(u.email).toLowerCase())) return true;
    return false;
  } catch {
    return false;
  }
};

// Data cached in the browser for quick display. It belongs to ONE account and must never be
// shown to the next person who logs in on the same computer.
const ACCOUNT_CACHE_KEYS = [
  'oneroot_leads_v3', 'oneroot_tasks_v3', 'oneroot_outreach_v1', 'oneroot_outreach_v3', 'oneroot_mydays_v1',
  'oneroot_mydays_v3', 'oneroot_mydays_migrated', 'crm_leads', 'crm_local_users', 'crm_local_staff',
  'crm_deleted_staff', 'crm_user_session', 'crm_active_tab', 'crm_trade_notes',
];
const ACCOUNT_CACHE_PREFIXES = ['crm_tasks_', 'crm_local_staff_'];

export const clearAccountCaches = () => {
  try {
    ACCOUNT_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && ACCOUNT_CACHE_PREFIXES.some((p) => key.startsWith(p))) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
};

/** Wipe cached data if a different account than last time is now logged in. */
const resetCachesIfNewAccount = (userId) => {
  try {
    if (!userId) return;
    const last = localStorage.getItem('crm_cache_owner');
    if (last !== userId) {
      clearAccountCaches();
      localStorage.setItem('crm_cache_owner', userId);
    }
  } catch {}
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const withoutPasswordFields = (record) => {
    const safeRecord = { ...record };
    delete safeRecord.password;
    delete safeRecord.staff_password;
    delete safeRecord.plain_password;
    delete safeRecord.current_password;
    delete safeRecord.new_password;
    return safeRecord;
  };

  const getLocalUsers = () => {
    try {
      const users = JSON.parse(localStorage.getItem('crm_local_users') || '[]');
      return Array.isArray(users) ? users.map(withoutPasswordFields) : [];
    } catch {
      return [];
    }
  };

  const saveLocalUser = (u) => {
    try {
      const users = getLocalUsers().filter((x) => x.email?.toLowerCase() !== u.email?.toLowerCase());
      users.push(withoutPasswordFields(u));
      localStorage.setItem('crm_local_users', JSON.stringify(users));
    } catch (e) {
      console.warn('Could not save local user:', e);
    }
  };

  const clearLegacyLocalPasswords = () => {
    const localKeys = ['crm_local_users'];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && key.startsWith('crm_local_staff_')) localKeys.push(key);
    }

    for (const key of localKeys) {
      try {
        const records = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(records)) {
          localStorage.setItem(key, JSON.stringify(records.map(withoutPasswordFields)));
        }
      } catch (err) {
        console.warn(`Could not sanitize legacy local accounts (${key}):`, err.message);
      }
    }
  };

  // Listen for session expiration and live permission update events
  useEffect(() => {
    const handleSessionExpired = (e) => {
      console.warn('Session expired event received:', e?.detail?.message);
      try {
        sessionStorage.setItem('crm_logout_reason', e?.detail?.message || 'Your session ended. Please log in again.');
      } catch {}
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user_session');
      setUser(null);
      setProfile(null);
    };

    const handlePermissionsUpdate = (e) => {
      const updated = e?.detail;
      if (!updated) return;
      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        const matchesId = updated.id && (prevUser.id === updated.id || String(prevUser._id) === String(updated.id));
        const matchesEmail = updated.email && prevUser.email?.toLowerCase() === updated.email?.toLowerCase();
        if (matchesId || matchesEmail) {
          const updatedPermissions = updated.permissions || prevUser.permissions;
          const updatedScope = updated.data_scope || prevUser.data_scope;
          const updatedDept = updated.department || prevUser.department;
          const updatedPhone = updated.phone !== undefined ? updated.phone : prevUser.phone;
          const updatedAvatar = updated.avatar_url || prevUser.avatar_url;
          const updatedUser = {
            ...prevUser,
            permissions: updatedPermissions,
            data_scope: updatedScope,
            department: updatedDept,
            phone: updatedPhone,
            avatar_url: updatedAvatar,
          };
          setProfile((prevProf) => ({
            ...(prevProf || {}),
            ...updatedUser,
            full_name: updatedUser.name || prevProf?.name,
          }));
          const session = JSON.parse(localStorage.getItem('crm_user_session') || '{}');
          if (session.user) {
            session.user = { ...session.user, ...updatedUser };
            session.profile = { ...(session.profile || {}), ...updatedUser };
            localStorage.setItem('crm_user_session', JSON.stringify(session));
          }
          return updatedUser;
        }
        return prevUser;
      });
    };

    // When the user comes back to the tab, quietly pick up a fresh token and any permission
    // changes the owner made (at most every 5 minutes)
    let lastRefresh = Date.now();
    const handleFocus = async () => {
      if (Date.now() - lastRefresh < 5 * 60 * 1000) return;
      const token = localStorage.getItem('crm_token');
      if (!token) return;
      lastRefresh = Date.now();
      try {
        const res = await api.getProfile();
        if (res?.success && res.data?.user) {
          if (res.data.token) localStorage.setItem('crm_token', res.data.token);
          const fresh = withoutPasswordFields(res.data.user);
          setUser((prev) => (prev ? { ...prev, ...fresh } : prev));
          setProfile((prev) => (prev ? { ...prev, ...fresh, full_name: fresh.name || prev.full_name } : prev));
        }
      } catch {
        // a real 401 already triggers crm_session_expired; network errors are ignored
      }
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('crm_session_expired', handleSessionExpired);
    window.addEventListener('crm_permissions_updated', handlePermissionsUpdate);
    window.addEventListener('crm_staff_updated', handlePermissionsUpdate);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('crm_session_expired', handleSessionExpired);
      window.removeEventListener('crm_permissions_updated', handlePermissionsUpdate);
      window.removeEventListener('crm_staff_updated', handlePermissionsUpdate);
    };
  }, []);

  // Restore sessions only after the backend validates the bearer token.
  useEffect(() => {
    const initAuth = async () => {
      clearLegacyLocalPasswords();
      const token = localStorage.getItem('crm_token');
      const isExplicitLogout = localStorage.getItem('crm_logged_out') === 'true';
      localStorage.removeItem('crm_user_session');

      if (token?.startsWith('local_session_')) {
        localStorage.removeItem('crm_token');
      }

      if (isExplicitLogout) {
        localStorage.removeItem('crm_token');
        setLoading(false);
        return;
      }

      if (!token || token.startsWith('local_session_')) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getProfile();
        if (!res?.success || !res.data?.user) {
          throw new Error(res?.message || 'The backend could not validate this session.');
        }

        const u = res.data.user;
        resetCachesIfNewAccount(u.id);
        // Sliding session: keep the fresh token the server hands back
        if (res.data.token) localStorage.setItem('crm_token', res.data.token);
        let compName = res.data.company?.name || u.company_name;
        if (!compName || compName === 'Travel-Trade') {
          const localUsers = getLocalUsers();
          const owner = localUsers.find((localUser) => localUser.persona === 'owner' || localUser.role === 'admin');
          compName = u.company_name || owner?.company_name || owner?.company?.name || 'My Organization';
        }
        const comp = { name: compName, plan: res.data.company?.plan || 'growth' };
        const safeUser = withoutPasswordFields(u);
        const safeProfile = { ...safeUser, full_name: safeUser.name, company_name: compName };
        setUser(safeUser);
        setProfile(safeProfile);
        setCompany(comp);
        localStorage.setItem('crm_user_session', JSON.stringify({
          user: safeUser,
          profile: safeProfile,
          company: comp,
        }));
      } catch (err) {
        console.warn('Backend profile check failed; cached session will not be used:', err.message);
        localStorage.removeItem('crm_user_session');
        setUser(null);
        setProfile(null);
        setCompany(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Sign in only through the backend; local browser data is never an identity source.
  const signIn = async ({ email, password }) => {
    localStorage.removeItem('crm_logged_out');
    const cleanEmail = email.toLowerCase().trim();

    try {
      const res = await api.login({ email: cleanEmail, password });
      if (!res?.success || !res.data?.user || !res.data?.token) {
        throw new Error(res?.message || 'The sign-in service returned an invalid response.');
      }
      const { user: rawUser, token } = res.data;
      const u = withoutPasswordFields(rawUser);
      resetCachesIfNewAccount(u.id);
      localStorage.setItem('crm_token', token);
      let compName = res.data.company?.name || u.company_name;
      if (!compName || compName === 'Travel-Trade') {
        const localUsers = getLocalUsers();
        const owner = localUsers.find((localUser) => localUser.persona === 'owner' || localUser.role === 'admin');
        compName = u.company_name || owner?.company_name || owner?.company?.name || 'My Organization';
      }
      const comp = { name: compName, plan: res.data.company?.plan || 'growth' };
      const safeProfile = { ...u, full_name: u.name, company_name: compName };
      setUser(u);
      setProfile(safeProfile);
      setCompany(comp);
      localStorage.setItem('crm_user_session', JSON.stringify({
        user: u,
        profile: safeProfile,
        company: comp,
      }));
      return res.data;
    } catch (err) {
      console.warn('Backend sign-in failed; local authentication is disabled:', err.message);
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user_session');
      setUser(null);
      setProfile(null);
      setCompany(null);
      throw err.isNetworkError
        ? new Error('Sign-in service is unavailable. Check your connection and try again.')
        : err;
    }
  };

  // New accounts must be created by the backend.
  const signUpOwner = async ({ email, password, fullName, phone, companyName, plan }) => {
    localStorage.removeItem('crm_logged_out');
    const cleanEmail = email.toLowerCase().trim();

    // 1. Try Backend API first
    try {
      const res = await api.register({
        name: fullName,
        email: cleanEmail,
        password,
        phone,
        company_name: companyName,
        persona: 'owner',
        plan: plan || 'growth',
      });

      if (res?.success && res.data?.user && res.data?.token) {
        const u = withoutPasswordFields(res.data.user);
        const { token, company: comp } = res.data;
        resetCachesIfNewAccount(u.id);
        localStorage.setItem('crm_token', token);
        setUser(u);
        setProfile({ ...u, full_name: u.name });
        setCompany(comp);
        saveLocalUser({ ...u, company: comp });
        return res.data;
      }
      throw new Error(res?.message || 'The registration service returned an invalid response.');
    } catch (err) {
      console.warn('Backend registration failed:', err.message);
      throw err.isNetworkError
        ? new Error('Registration service is unavailable. Check your connection and try again.')
        : err;
    }
  };

  // Add staff member (owner only)
  // Add staff member (owner only)
  const addStaffMember = async ({ email, fullName, role, department, phone, password, avatar_url }) => {
    try {
      const res = await api.createUser({
        name: fullName,
        email,
        password,
        role: role || 'agent',
        department: department || 'Commodity Sales & Export Operations',
        phone: phone || '',
        avatar_url,
        owner_id: profile?.id || user?.id,
        company_id: profile?.company_id || user?.company_id,
      });
      if (res && res.success) {
        try {
          const ownerKey = (profile?.id || user?.id) ? `crm_local_staff_${profile?.id || user?.id}` : null;
          if (ownerKey) {
            const localStaff = JSON.parse(localStorage.getItem(ownerKey) || '[]');
            const idx = localStaff.findIndex((s) => s.email?.toLowerCase() === email.toLowerCase());
            if (idx !== -1) {
              localStaff[idx] = res.data;
            } else {
              localStaff.push(res.data);
            }
            localStorage.setItem(ownerKey, JSON.stringify(localStaff));
          }
        } catch {        }
        return res.data;
      }
      throw new Error(res?.message || 'Failed to add staff member');
    } catch (err) {
      console.warn('Backend staff creation failed:', err.message);
      throw err.isNetworkError
        ? new Error('Staff creation service is unavailable. Check your connection and try again.')
        : err;
    }
  };

  // Update profile details (Name, phone, department, avatar, password)
  const updateProfile = async (updates) => {
    try {
      const res = await api.updateProfile(updates);
      if (!res?.success || !res.data) {
        throw new Error(res?.message || 'The profile could not be saved on the server.');
      }

      // After a password change the server signs out other devices and hands this one a new token
      if (res.data.token) {
        localStorage.setItem('crm_token', res.data.token);
      }
      const safeUser = withoutPasswordFields(res.data);
      delete safeUser.token;
      const updated = { ...safeUser, full_name: safeUser.name };
      setProfile(updated);
      setUser((prev) => ({ ...(prev || {}), ...safeUser }));

      const email = (safeUser.email || user?.email || '').toLowerCase();
      const localUsers = getLocalUsers();
      const idx = localUsers.findIndex((localUser) => localUser.email?.toLowerCase() === email);
      if (idx !== -1) {
        localUsers[idx] = withoutPasswordFields({ ...localUsers[idx], ...safeUser });
        localStorage.setItem('crm_local_users', JSON.stringify(localUsers));
      }
      return updated;
    } catch (err) {
      console.warn('Backend profile update failed:', err.message);
      throw err;
    }
  };

  // Sign out - terminates session and returns to login/landing
  const signOut = () => {
    localStorage.removeItem('crm_token');
    clearAccountCaches();
    localStorage.removeItem('crm_cache_owner');
    localStorage.removeItem('crm_local_staff'); // Purge legacy shared key
    localStorage.setItem('crm_logged_out', 'true');
    setUser(null);
    setProfile(null);
    setCompany(null);
  };

  // Delete staff member and remove from all local and backend stores
  const deleteStaffMember = async (staffId, staffEmail) => {
    if (!staffId && !staffEmail) {
      throw new Error('Staff member ID or email is required.');
    }

    const token = localStorage.getItem('crm_token');
    if (!token || token.startsWith('local_session_')) {
      throw new Error('A valid backend session is required to delete a staff account.');
    }
    const response = await api.deleteUser(staffId || staffEmail);
    if (!response?.success) {
      throw new Error(response?.message || 'Could not delete the staff account.');
    }

    // Record a tombstone only after the backend confirms deletion.
    try {
      const deleted = JSON.parse(localStorage.getItem('crm_deleted_staff') || '[]');
      const newEntries = [staffId, staffEmail].filter(Boolean).map((x) => String(x).toLowerCase());
      const updated = Array.from(new Set([...deleted, ...newEntries]));
      localStorage.setItem('crm_deleted_staff', JSON.stringify(updated));
    } catch {}

    // Purge from local storage across all staff keys
    try {
      const isTarget = (u) => {
        if (!u) return false;
        if (staffId && (u.id === staffId || String(u._id) === String(staffId))) return true;
        if (staffEmail && u.email && u.email.toLowerCase() === String(staffEmail).toLowerCase()) return true;
        return false;
      };

      const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
      localStorage.setItem('crm_local_staff', JSON.stringify(localStaff.filter((u) => !isTarget(u))));

      const localUsers = JSON.parse(localStorage.getItem('crm_local_users') || '[]');
      localStorage.setItem('crm_local_users', JSON.stringify(localUsers.filter((u) => !isTarget(u))));

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('crm_local_staff_')) {
          try {
            const arr = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(arr)) {
              localStorage.setItem(key, JSON.stringify(arr.filter((u) => !isTarget(u))));
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Error purging local storage during delete:', e);
    }

    window.dispatchEvent(new CustomEvent('crm_staff_updated', { detail: { deletedId: staffId, deletedEmail: staffEmail } }));
    return true;
  };

  // Get all team members for current organization
  const getTeamMembers = async () => {
    const activeUserId = profile?.id || user?.id;
    const activeEmail = (profile?.email || user?.email || '').toLowerCase();
    const activeCompId = profile?.company_id || user?.company_id;

    let list = [];
    let serverAnswered = false;
    try {
      const res = await api.getUsers();
      if (res && res.success && Array.isArray(res.data)) {
        list = res.data;
        serverAnswered = true; // the server list is the truth, even when it is empty
      }
    } catch (err) {
      console.warn('Failed to fetch team members from backend, using local store:', err.message);
    }

    // Isolated owner key only - NEVER use shared 'crm_local_staff' fallback!
    // The browser copy is only used when the server could not be reached.
    const ownerKey = activeUserId ? `crm_local_staff_${activeUserId}` : null;
    let localStaff = [];
    if (ownerKey && !serverAnswered) {
      try {
        localStaff = JSON.parse(localStorage.getItem(ownerKey) || '[]');
      } catch {}
    }

    const map = new Map();
    list.forEach((u) => {
      const safeUser = withoutPasswordFields(u);
      map.set(safeUser.email?.toLowerCase() || safeUser.id, safeUser);
    });
    localStaff.forEach((u) => {
      const safeUser = withoutPasswordFields(u);
      const key = safeUser.email?.toLowerCase() || safeUser.id;
      if (!map.has(key)) map.set(key, safeUser);
    });
    list = Array.from(map.values());

    // Exclude any deleted staff members
    list = list.filter((u) => !isStaffDeleted(u));

    // STRICT OWNER ISOLATION: A staff member MUST belong to the current owner
    const genericCompanyIds = ['comp_1', 'comp_traveltrade_1', 'comp_stellarsync_1', 'comp_default', ''];

    list = list.filter((u) => {
      if (!u) return false;
      // Exclude self (owner shouldn't be listed as their own staff)
      if (u.id === activeUserId || (activeEmail && u.email?.toLowerCase() === activeEmail)) return false;
      // Exclude other owners
      if (u.persona === 'owner' || (u.role === 'admin' && u.persona !== 'staff')) return false;

      // Check explicit creator match
      if (u.created_by) {
        return (
          u.created_by === activeUserId ||
          (activeEmail && u.created_by.toLowerCase() === activeEmail)
        );
      }

      // Check company_id match (only if valid non-generic company and created_by is NOT set)
      if (
        activeCompId &&
        !genericCompanyIds.includes(activeCompId) &&
        u.company_id &&
        u.company_id === activeCompId
      ) {
        return true;
      }

      return false;
    });

    // Persist to isolated local cache for this owner only
    if (ownerKey) {
      try {
        localStorage.setItem(ownerKey, JSON.stringify(list));
      } catch {}
    }

    return list;
  };

  const isOwner = Boolean(
    profile &&
    (profile.persona === 'owner' || profile.role === 'admin') &&
    profile.persona !== 'staff'
  );
  const isStaff = !isOwner;

  const value = {
    user,
    profile,
    company,
    loading,
    signUpOwner,
    addStaffMember,
    deleteStaffMember,
    signIn,
    signOut,
    updateProfile,
    getTeamMembers,
    isOwner,
    isAdmin: isOwner,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
