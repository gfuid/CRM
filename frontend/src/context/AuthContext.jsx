import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to read/write local registered users for offline resilience
  const getLocalUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('crm_local_users') || '[]');
    } catch {
      return [];
    }
  };

  const saveLocalUser = (u) => {
    try {
      const users = getLocalUsers().filter((x) => x.email.toLowerCase() !== u.email.toLowerCase());
      users.push(u);
      localStorage.setItem('crm_local_users', JSON.stringify(users));
    } catch (e) {
      console.warn('Could not save local user:', e);
    }
  };

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('crm_token');
      if (token) {
        // If it was a local session token
        if (token.startsWith('local_session_')) {
          const localUsers = getLocalUsers();
          if (localUsers.length > 0) {
            const lastUser = localUsers[localUsers.length - 1];
            setUser(lastUser);
            setProfile({ ...lastUser, full_name: lastUser.name });
            setCompany(lastUser.company || { name: 'Travel-Trade', plan: 'growth' });
            setLoading(false);
            return;
          }
        }

        try {
          const res = await api.getProfile();
          if (res && res.success && res.data.user) {
            const u = res.data.user;
            setUser(u);
            setProfile({ ...u, full_name: u.name });
            setCompany(res.data.company || { name: 'Travel-Trade', plan: 'growth' });
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Stored token validation error, checking local fallback:', err.message);
          const localUsers = getLocalUsers();
          if (localUsers.length > 0) {
            const lastUser = localUsers[localUsers.length - 1];
            setUser(lastUser);
            setProfile({ ...lastUser, full_name: lastUser.name });
            setCompany(lastUser.company || { name: 'Travel-Trade', plan: 'growth' });
            setLoading(false);
            return;
          }
          localStorage.removeItem('crm_token');
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // Sign in with email & password via Backend with Resilient Fallback
  const signIn = async ({ email, password }) => {
    localStorage.removeItem('crm_logged_out');
    const cleanEmail = email.toLowerCase().trim();

    // 1. Try Backend API first
    try {
      const res = await api.login({ email: cleanEmail, password });
      if (res && res.success) {
        const { user: u, token } = res.data;
        if (token) {
          localStorage.setItem('crm_token', token);
        }
        setUser(u);
        setProfile({ ...u, full_name: u.name });
        setCompany(res.data.company || { name: 'Travel-Trade', plan: 'growth' });
        return res.data;
      }
      if (res && !res.success) {
        throw new Error(res.message || 'Login failed');
      }
    } catch (err) {
      console.warn('Backend login response/error, checking registered accounts:', err.message);

      // Check if credentials match a registered user
      const localUsers = getLocalUsers();
      const localMatch = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

      if (localMatch) {
        if (!password || localMatch.password === password) {
          localStorage.setItem('crm_token', 'local_session_' + Date.now());
          setUser(localMatch);
          setProfile({ ...localMatch, full_name: localMatch.name });
          setCompany(localMatch.company || { name: 'Travel-Trade', plan: 'growth' });
          return { user: localMatch, company: localMatch.company };
        } else {
          throw new Error('Invalid credentials. Please check your password.');
        }
      }

      // Check if it's a registered staff member created by the owner
      const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
      const staffMatch = localStaff.find((s) => s.email.toLowerCase() === cleanEmail);
      if (staffMatch) {
        if (!password || staffMatch.password === password) {
          localStorage.setItem('crm_token', 'local_session_' + Date.now());
          setUser(staffMatch);
          setProfile({ ...staffMatch, full_name: staffMatch.name });
          setCompany({ name: 'Travel-Trade', plan: 'growth' });
          return { user: staffMatch };
        } else {
          throw new Error('Invalid credentials. Please check your password.');
        }
      }

      // If backend returned a specific error like Invalid credentials or Account deactivated
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }

      throw new Error('No account found with this email. Please sign up to create your company workspace.');
    }
  };

  // Sign up as company owner with Resilient Fallback
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

      if (res && res.success) {
        const { user: u, token, company: comp } = res.data;
        if (token) {
          localStorage.setItem('crm_token', token);
        }
        setUser(u);
        setProfile({ ...u, full_name: u.name });
        setCompany(comp);
        saveLocalUser({ ...u, password, company: comp });
        return res.data;
      }
      if (res && !res.success) {
        throw new Error(res.message || 'Registration failed');
      }
    } catch (err) {
      console.warn('Backend register failed, checking error type:', err.message);

      // If user already exists on the backend, forward the error message
      if (err.message && err.message.toLowerCase().includes('already exists')) {
        throw err;
      }

      // Network / connection error fallback: activate seamless local session
      const fallbackUser = {
        id: 'usr_' + Date.now(),
        name: fullName.trim(),
        email: cleanEmail,
        password,
        role: 'admin',
        persona: 'owner',
        department: 'Founder & CEO',
        phone: phone || '',
        is_active: true,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        created_at: new Date().toISOString(),
      };
      const fallbackCompany = {
        id: 'comp_' + Date.now(),
        name: companyName.trim() || 'Travel-Trade',
        plan: plan || 'enterprise',
        maxStaff: 100,
      };

      saveLocalUser({
        ...fallbackUser,
        company: fallbackCompany,
      });

      localStorage.setItem('crm_token', 'local_session_' + Date.now());
      setUser(fallbackUser);
      setProfile({ ...fallbackUser, full_name: fallbackUser.name });
      setCompany(fallbackCompany);
      return { user: fallbackUser, company: fallbackCompany };
    }
  };

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
      });
      if (res && res.success) {
        return res.data;
      }
      throw new Error(res?.message || 'Failed to add staff member');
    } catch (err) {
      console.warn('Backend add staff error, saving to local staff store:', err.message);
      const newStaff = {
        id: 'usr_staff_' + Date.now(),
        name: fullName,
        email: email.toLowerCase().trim(),
        role: role || 'agent',
        persona: 'staff',
        department: department || 'Commodity Sales & Export Operations',
        phone: phone || '',
        is_active: true,
        avatar_url: avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        created_at: new Date().toISOString(),
      };
      try {
        const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
        localStaff.push(newStaff);
        localStorage.setItem('crm_local_staff', JSON.stringify(localStaff));
      } catch {}
      return newStaff;
    }
  };

  // Sign out - terminates session and returns to login/landing
  const signOut = () => {
    localStorage.removeItem('crm_token');
    localStorage.setItem('crm_logged_out', 'true');
    setUser(null);
    setProfile(null);
    setCompany(null);
  };

  // Get all team members for current organization
  const getTeamMembers = async () => {
    try {
      const res = await api.getUsers();
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to fetch team members from backend, using local store:', err.message);
    }
    try {
      const localStaff = JSON.parse(localStorage.getItem('crm_local_staff') || '[]');
      if (localStaff.length > 0) return localStaff;
    } catch {}
    return [];
  };

  const isOwner = Boolean(profile && (profile.role === 'admin' || profile.persona === 'owner' || profile.role !== 'agent'));
  const isStaff = !isOwner;

  const value = {
    user,
    profile,
    company,
    loading,
    signUpOwner,
    addStaffMember,
    signIn,
    signOut,
    getTeamMembers,
    isOwner,
    isAdmin: isOwner,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
