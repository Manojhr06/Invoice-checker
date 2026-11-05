import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerCompany: (payload: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  isAdmin: boolean;
  isFinanceManager: boolean;
  isFinanceEmployee: boolean;
  isAuditor: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignored if network fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const registerCompany = async (payload: any) => {
    const res = await api.post('/auth/register-company', payload);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  const roleName = user?.role?.name || '';
  const isAdmin = roleName === 'ADMIN';
  const isFinanceManager = roleName === 'ADMIN' || roleName === 'FINANCE_MANAGER';
  const isFinanceEmployee = roleName === 'ADMIN' || roleName === 'FINANCE_MANAGER' || roleName === 'FINANCE_EMPLOYEE';
  const isAuditor = roleName === 'ADMIN' || roleName === 'FINANCE_MANAGER' || roleName === 'AUDITOR';

  const hasRole = (roles: string[]) => {
    if (!user || !user.role) return false;
    return roles.includes(user.role.name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        registerCompany,
        refreshProfile,
        hasRole,
        isAdmin,
        isFinanceManager,
        isFinanceEmployee,
        isAuditor,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
