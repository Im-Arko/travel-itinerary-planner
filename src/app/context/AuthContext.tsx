import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, clearAccessToken, getAccessToken, setAccessToken, User } from '../services/api';

const USER_KEY = 'user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) as User : null;
  });
  const [loading, setLoading] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    authApi.me()
      .then(currentUser => {
        if (cancelled) return;
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        clearAccessToken();
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const token = await authApi.login(email, password);
    setAccessToken(token.access_token);
    const currentUser = await authApi.me();
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    setUser(currentUser);
  };

  const register = async (email: string, username: string, password: string, fullName: string) => {
    await authApi.register({
      email,
      username,
      password,
      full_name: fullName,
    });
    await login(email, password);
  };

  const logout = () => {
    clearAccessToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
