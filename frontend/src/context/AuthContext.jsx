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
            setCompany(res.data.company || { name: 'Stellarsync Enterprise', plan: 'growth' });
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Stored token validation error, falling back to demo session:', err.message);
          localStorage.removeItem('crm_token');
        }
      }

      // Default demo profile for seamless experience
      loginAsDemo();
      setLoading(false);
    };

    initAuth();
  }, []);

  // Demo profile fallback
  const loginAsDemo = () => {
    const demoUser = {
      id: 'usr_admin_1',
      name: 'Sarah Connor (Owner)',
      email: 'owner@stellarsync.io',
      role: 'admin',
      persona: 'owner',
      department: 'Founder & CEO',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    };
    const demoCompany = {
      id: 'comp_stellarsync_1',
      name: 'Stellarsync Enterprise',
      plan: 'growth',
      maxStaff: 15,
    };
    setUser(demoUser);
    setProfile({ ...demoUser, full_name: demoUser.name });
    setCompany(demoCompany);
  };

  // Sign in with email & password via MongoDB Backend
  const signIn = async ({ email, password }) => {
    try {
      const res = await api.login({ email, password });
      if (res && res.success) {
        const { user: u, token } = res.data;
        if (token) {
          localStorage.setItem('crm_token', token);
        }
        setUser(u);
        setProfile({ ...u, full_name: u.name });
        setCompany(res.data.company || { name: 'Stellarsync Enterprise', plan: 'growth' });
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

  // Add staff member (admin only)
  const addStaffMember = async ({ email, fullName, role, department, phone }) => {
    try {
      const res = await api.createUser({
        name: fullName,
        email,
        role: role || 'agent',
        department: department || 'Sales Outreach',
        phone: phone || '',
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

  // Sign out
  const signOut = () => {
    localStorage.removeItem('crm_token');
    loginAsDemo();
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
    isOwner: profile?.role === 'admin' || profile?.persona === 'owner',
    isAdmin: profile?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
