import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokens } from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const LEVEL = { subscriber: 1, author: 2, editor: 3, admin: 4 };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokens.access);

  const logout = useCallback(() => { tokens.clear(); setUser(null); }, []);

  useEffect(() => {
    if (!tokens.access) return;
    api.get('/auth/me').then((r) => setUser(r.data.data)).catch(() => tokens.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokens.set(data.data);
    setUser(data.data.user);
    return data.data.user;
  };
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    tokens.set(data.data);
    setUser(data.data.user);
    return data.data.user;
  };

  const value = useMemo(() => ({
    user, loading, login, register, logout, setUser,
    can: (role) => !!user && LEVEL[user.role] >= LEVEL[role],
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
