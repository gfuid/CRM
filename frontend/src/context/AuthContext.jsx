import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('crm_token');
      if (token) {
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
          console.warn('Stored token validation error, falling back to demo session:', err.message);
          localStorage.removeItem('crm_token');
        }
      }

      // If user previously logged out, don't force login
      const hasLoggedOut = localStorage.getItem('crm_logged_out');
      if (!hasLoggedOut) {
        loginAsDemo();
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Demo profile fallback
  const loginAsDemo = () => {
    localStorage.removeItem('crm_logged_out');
    const demoUser = {
      id: 'usr_admin_1',
      name: 'Sarah Connor (Owner)',
      email: 'owner@travel-trade.com',
      role: 'admin',
      persona: 'owner',
      department: 'Founder & CEO',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    };
    const demoCompany = {
      id: 'comp_traveltrade_1',
      name: 'Travel-Trade',
      plan: 'growth',
      maxStaff: 50,
    };
    setUser(demoUser);
    setProfile({ ...demoUser, full_name: demoUser.name });
    setCompany(demoCompany);
  };

  // Sign in with email & password via MongoDB Backend
  const signIn = async ({ email, password }) => {
    try {
      localStorage.removeItem('crm_logged_out');
      const res = await api.login({ email, password });
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
      throw new Error(res?.message || 'Login failed');
    } catch (err) {
      console.error('Sign in failed:', err);
      throw err;
    }
  };

  // Sign up as company owner via MongoDB Backend
  const signUpOwner = async ({ email, password, fullName, phone, companyName, plan }) => {
    try {
      const res = await api.register({
        name: fullName,
        email,
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
        return res.data;
      }
      throw new Error(res?.message || 'Registration failed');
    } catch (err) {
      console.error('Sign up failed:', err);
      throw err;
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
      console.error('Add staff error:', err);
      throw err;
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
      if (res && res.success) {
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to fetch team members from backend:', err);
    }
    return [];
  };

  const isOwner = profile?.role === 'admin' || profile?.persona === 'owner';
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
    loginAsDemo,
    getTeamMembers,
    isOwner,
    isAdmin: isOwner,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
