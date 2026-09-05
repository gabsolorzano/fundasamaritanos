import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppRole, ApiMeResponse } from '../types';
import { authApi } from '../api/endpoints';
import {
  TOKEN_STORAGE_KEY,
  ROLE_STORAGE_KEY,
  USER_STORAGE_KEY,
  getStoredToken,
  getStoredRole,
  clearAuthStorage,
  setUnauthorizedHandler
} from '../api/client';

interface AuthContextType {
  user: ApiMeResponse | null;
  token: string | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isLector: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  isReadOnly: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (targetRole: AppRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiMeResponse | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [role, setRole] = useState<AppRole | null>((getStoredRole() as AppRole) || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hook 401 handler from HTTP client
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, []);

  // Fetch session on startup if token exists
  useEffect(() => {
    const initAuth = async () => {
      const existingToken = getStoredToken();
      if (!existingToken) {
        setIsLoading(false);
        return;
      }

      try {
        const meData = await authApi.getMe();
        setUser(meData);
        setRole(meData.rol);
        setToken(existingToken);
        localStorage.setItem(ROLE_STORAGE_KEY, meData.rol);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(meData));
      } catch (err) {
        console.warn('Sesión no recuperable, requiriendo nuevo ingreso:', err);
        clearAuthStorage();
        setUser(null);
        setToken(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    // 1. POST /login (application/x-www-form-urlencoded)
    const loginResp = await authApi.login(username, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, loginResp.access_token);
    localStorage.setItem(ROLE_STORAGE_KEY, loginResp.rol);
    setToken(loginResp.access_token);
    setRole(loginResp.rol);

    // 2. GET /me (Authorization: Bearer <token>)
    const meResp = await authApi.getMe();
    setUser(meResp);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(meResp));
  };

  const logout = () => {
    clearAuthStorage();
    setUser(null);
    setToken(null);
    setRole(null);
  };

  /**
   * Permite alternar rápidamente entre Administrador, Editor y Lector para
   * verificar el renderizado condicional RBAC en vivo.
   */
  const switchDemoRole = async (targetRole: AppRole) => {
    setIsLoading(true);
    try {
      let username = 'admin';
      let password = 'admin123';
      if (targetRole === 'Editor') {
        username = 'editor';
        password = 'editor123';
      } else if (targetRole === 'Lector') {
        username = 'lector';
        password = 'lector123';
      }

      await login(username, password);
    } finally {
      setIsLoading(false);
    }
  };

  // RBAC Permissions
  const currentRole = role || user?.rol || null;
  const isAdmin = currentRole === 'Administrador';
  const isEditor = currentRole === 'Editor';
  const isLector = currentRole === 'Lector';

  const canEdit = isAdmin || isEditor;
  const canDelete = isAdmin;
  const canManageUsers = isAdmin;
  const isReadOnly = isLector;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: currentRole,
        isLoading,
        isAdmin,
        isEditor,
        isLector,
        canEdit,
        canDelete,
        canManageUsers,
        isReadOnly,
        login,
        logout,
        switchDemoRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
