import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, tokenStorage, User, Company } from '../services/api';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { company_name: string; company_slug: string; admin_name: string; admin_email: string; password: string; industry?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSession = async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setUser(null);
      setCompany(null);
      setLoading(false);
      return;
    }
    try {
      const [userData, companyData] = await Promise.all([
        api.getMe(),
        api.getCompanyMe().catch(() => null),
      ]);
      setUser(userData);
      if (companyData) setCompany(companyData);
    } catch {
      tokenStorage.clearTokens();
      setUser(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const tokens = await api.login({ email, password });
      tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
      await fetchSession();
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { company_name: string; company_slug: string; admin_name: string; admin_email: string; password: string; industry?: string }) => {
    setLoading(true);
    try {
      const tokens = await api.registerCompany(data);
      tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);
      await fetchSession();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    tokenStorage.clearTokens();
    setUser(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, register, logout, refreshUser: fetchSession }}>
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
