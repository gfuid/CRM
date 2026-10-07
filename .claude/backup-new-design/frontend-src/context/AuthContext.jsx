import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../lib/api';

/**
 * Session state. The server is the only source of truth: nothing about users or
 * passwords is kept in the browser except the session token.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'signed-out'));
  const [notice, setNotice] = useState('');

  const applySession = useCallback((data) => {
    if (data.token) tokenStore.set(data.token);
    setUser(data.user);
    if (data.company) setCompany(data.company);
    setStatus('signed-in');
  }, []);

  const signOut = useCallback((message = '') => {
    tokenStore.clear();
    setUser(null);
    setCompany(null);
    setNotice(message);
    setStatus('signed-out');
  }, []);

  const refresh = useCallback(async () => {
    const data = await api.me();
    setUser(data.user);
    setCompany(data.company);
    setStatus('signed-in');
    return data;
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    refresh().catch((err) => {
      if (err.status === 401 || err.status === 403) signOut(err.message);
      else setStatus('offline');
    });
  }, [refresh, signOut]);

  useEffect(() => {
    const onUnauthorized = (e) => signOut(e.detail || 'Your session has ended. Please sign in again.');
    window.addEventListener('crm:unauthorized', onUnauthorized);
    return () => window.removeEventListener('crm:unauthorized', onUnauthorized);
  }, [signOut]);

  const value = useMemo(
    () => ({
      user,
      company,
      status,
      notice,
      clearNotice: () => setNotice(''),
      isOwner: user?.role === 'owner',
      can: (perm) => user?.permissions?.[perm] === true,
      perms: user?.permissions || {},
      login: async (email, password) => applySession(await api.login(email, password)),
      register: async (data) => applySession(await api.register(data)),
      signOut,
      refresh,
      setUser,
      setCompany,
      applySession,
    }),
    [user, company, status, notice, applySession, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
