import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import { setToken, clearToken, getToken } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session

  // Restore session on first load
  useEffect(() => {
    const token = getToken();
    if (token) {
      authApi.me()
        .then((res) => setUser(res.data.data.user))
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const { user: u, token } = res.data.data;
    setToken(token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    const { user: u, token } = res.data.data;
    setToken(token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* best effort */ }
    clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await authApi.me();
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isAccountHolder = user?.role === 'ACCOUNT_HOLDER';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, isAdmin, isAccountHolder }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
