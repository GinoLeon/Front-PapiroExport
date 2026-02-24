import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getAuthToken, registerUnauthorizedHandler, setAuthToken } from "../api/axios";
import { getCurrentUser, loginRequest, logoutRequest, registerRequest } from "../service/authService";
import type { AuthUser } from "../types/auth";

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  const logout = () => {
    logoutRequest();
    setAuthToken(null);
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const currentToken = getAuthToken();
      if (!currentToken) {
        setLoading(false);
        return;
      }

      try {
        setToken(currentToken);
        const me = await getCurrentUser();
        setUser(me);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await loginRequest(username, password);
    setToken(response.access_token);
    const me = await getCurrentUser();
    setUser(me);
  };

  const register = async (nombre: string, email: string, password: string) => {
    await registerRequest({ nombre, email, password });
    await login(nombre, password);
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.rol.nombre);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      hasRole,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};
