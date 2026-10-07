import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setSessionToken, tokenStore } from '../lib/api';

/**
 * Platform administrator session. The token comes from POST /auth/admin-login and is kept
 * under "crm_platform_token". Any 401 from the API signs out and shows `notice` on the
 * sign-in screen.
 */
const AuthContext = createContext(null);
const USER_KEY = 'crm_platform_user';

const readUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeUser = (user) => {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Storage blocked: the name is only used for display
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStore.get());
  const [user, setUser] = useState(() => (tokenStore.get() ? readUser() : null));
  const [notice, setNotice] = useState('');

  const signOut = useCallback((message = '') => {
    setSessionToken(null);
    writeUser(null);
    setToken(null);
    setUser(null);
    setNotice(message);
  }, []);

  const signIn = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    if (!data?.token) throw new Error('The server did not return a session. Please try again.');
    setSessionToken(data.token);
    writeUser(data.user || null);
    setToken(data.token);
    setUser(data.user || null);
    setNotice('');
    return data.user;
  }, []);

  useEffect(() => {
    const onUnauthorized = (e) => signOut(e.detail || 'Your session has ended. Please sign in again.');
    window.addEventListener('platform:unauthorized', onUnauthorized);
    return () => window.removeEventListener('platform:unauthorized', onUnauthorized);
  }, [signOut]);

  const value = useMemo(() => ({ token, user, notice, signIn, signOut, signedIn: !!token }), [token, user, notice, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
