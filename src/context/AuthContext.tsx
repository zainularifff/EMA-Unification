import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { getMe } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('ema_token'),
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Auto-authenticate with a default user
    const defaultUser: User = {
      id: '1',
      email: 'admin@emauni.com',
      name: 'Administrator',
    };
    setState({
      user: defaultUser,
      token: 'auto_token',
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('ema_token', token);
    localStorage.setItem('ema_user', JSON.stringify(user));
    setState({ user, token, isAuthenticated: true, isLoading: false });
  };

  const logout = () => {
    localStorage.removeItem('ema_token');
    localStorage.removeItem('ema_user');
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  };

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
