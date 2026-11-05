import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email: string;
  mobile?: string;
  company_name?: string;
  role?: string;
  tenant_id?: string;
  tenantId?: string;
  onboarding_completed?: boolean;
  onboardingCompleted?: boolean;
  onboarding_step?: number;
  avatar?: string;
  api_token?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: any) => Promise<boolean>;
  sendSignupOtp: (email: string, name?: string) => Promise<{ success: boolean; message: string; debugOtp?: string; previewUrl?: string }>;
  resendSignupOtp: (email: string) => Promise<{ success: boolean; message: string; debugOtp?: string; previewUrl?: string }>;
  verifySignupOtp: (payload: any) => Promise<boolean>;
  googleAuth: (payload: { code?: string; redirect_uri?: string; credential?: string }) => Promise<boolean>;
  /** Re-reads the tenant's onboarding state from the server (source of truth). */
  refreshOnboarding: () => Promise<void>;
  /** Marks onboarding complete ON THE SERVER, then updates the local session. */
  completeOnboarding: () => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = 'sharyx_user';

const isSuperRole = (role?: string) => (role || '').toLowerCase().includes('super');

export function checkUserOnboarded(rawUser: any): boolean {
  if (!rawUser) return false;
  const u = rawUser.user || rawUser;
  if (isSuperRole(u.role)) return true;
  const isCompleted =
    u.onboardingCompleted === true ||
    u.onboardingCompleted === 'true' ||
    u.onboarding_completed === true ||
    u.onboarding_completed === 'true';
  return isCompleted && Boolean(u.tenantId || u.tenant_id);
}

const readStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

// ---- Axios wiring (registered once) ---------------------------------------------------------
// 1. Every request carries the session's JWT.
// 2. An expired/invalid session (401 from a protected API) clears the session and returns to login.
if (typeof window !== 'undefined' && !(axios as any).__sharyxAuthWired) {
  (axios as any).__sharyxAuthWired = true;
  axios.interceptors.request.use((config) => {
    const token = readStoredUser()?.api_token;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  axios.interceptors.response.use(
    (r) => r,
    (error) => {
      const url: string = error?.config?.url || '';
      if (error?.response?.status === 401 && !url.includes('/Auth/') && readStoredUser()?.api_token) {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('sharyx_active_tenant_id');
          localStorage.removeItem('sharyx_active_tenant_name');
        } catch {
          /* ignore */
        }
        if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
      }
      return Promise.reject(error);
    }
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const persist = (u: User | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  /** Pulls the real onboarding state for the signed-in tenant from the database. */
  const fetchOnboardingState = async (token: string) => {
    const res = await axios.get('/api/v1/Onboarding/State', { headers: { Authorization: `Bearer ${token}` } });
    return res.data as { onboarding_completed: boolean; onboarding_step: number; company?: { name?: string } };
  };

  const applySession = async (data: any): Promise<boolean> => {
    const userData = data?.user || data;
    const token = data?.api_token || data?.token;
    if (!userData || !token) throw new Error('Invalid response from server');
    const tenantId = userData.tenant_id || userData.tenantId;
    let loggedUser: User = { ...userData, tenant_id: tenantId, tenantId, api_token: token };
    // The server's stored onboarding state is authoritative (login payload is only a hint).
    try {
      const state = await fetchOnboardingState(token);
      loggedUser = {
        ...loggedUser,
        onboarding_completed: isSuperRole(loggedUser.role) ? true : !!state.onboarding_completed,
        onboarding_step: state.onboarding_step,
        company_name: state.company?.name || loggedUser.company_name,
      };
    } catch {
      /* keep the login payload values */
    }
    persist(loggedUser);
    return true;
  };

  // Restore the session and re-validate it against the server.
  useEffect(() => {
    const saved = readStoredUser();
    if (!saved?.api_token) {
      setIsLoading(false);
      return;
    }
    setUser(saved);
    fetchOnboardingState(saved.api_token)
      .then((state) => {
        persist({
          ...saved,
          onboarding_completed: isSuperRole(saved.role) ? true : !!state.onboarding_completed,
          onboarding_step: state.onboarding_step,
          company_name: state.company?.name || saved.company_name,
        });
      })
      .catch(() => {
        /* a 401 is handled by the response interceptor; network errors keep the cached session */
      })
      .finally(() => setIsLoading(false));
  }, []);

  // NOTE: login / verifySignupOtp / googleAuth deliberately do NOT toggle the global `isLoading`.
  // PublicOnlyRoute swaps the whole page for a spinner while it is true, which unmounted the form and
  // wiped what the user had typed after every wrong password / wrong code. Each page has its own loading state.
  const login = async (credentials: any): Promise<boolean> => {
    const cleanEmail = (credentials.email || credentials.username || '').toLowerCase().trim();
    // No offline/"fallback" login and no client-side role guessing: the server decides who you are.
    const res = await axios.post('/api/v1/Auth/Login', { email: cleanEmail, password: credentials.password });
    queryClient.clear(); // a new session must never reuse another account's cached data
    return await applySession(res.data?.result || res.data);
  };

  const sendSignupOtp = async (email: string, name?: string) => {
    const res = await axios.post('/api/v1/Auth/SendSignupOtp', { email, name });
    const data = res.data?.result || res.data;
    return {
      success: true,
      message: res.data?.Message || data?.message || `Verification code sent to ${email}`,
      debugOtp: data?.debugOtp,
      previewUrl: data?.previewUrl,
    };
  };

  const resendSignupOtp = async (email: string) => {
    const res = await axios.post('/api/v1/Auth/ResendSignupOtp', { email });
    const data = res.data?.result || res.data;
    return {
      success: true,
      message: res.data?.Message || data?.message || `A new verification code has been sent to ${email}`,
      debugOtp: data?.debugOtp,
      previewUrl: data?.previewUrl,
    };
  };

  const verifySignupOtp = async (payload: any): Promise<boolean> => {
    const res = await axios.post('/api/v1/Auth/VerifySignupOtp', payload);
    return await applySession(res.data?.result || res.data);
  };

  const googleAuth = async (payload: { code?: string; redirect_uri?: string; credential?: string }): Promise<boolean> => {
    // Only Google-verifiable proof is sent; the server never trusts an email we could pass here.
    const res = await axios.post('/api/v1/Auth/GoogleAuth', {
      code: payload.code,
      redirect_uri: payload.redirect_uri,
      credential: payload.credential,
    });
    return await applySession(res.data?.result || res.data);
  };

  const refreshOnboarding = useCallback(async () => {
    const saved = readStoredUser();
    if (!saved?.api_token) return;
    const state = await fetchOnboardingState(saved.api_token);
    persist({
      ...saved,
      onboarding_completed: isSuperRole(saved.role) ? true : !!state.onboarding_completed,
      onboarding_step: state.onboarding_step,
      company_name: state.company?.name || saved.company_name,
    });
  }, []);

  const completeOnboarding = async (): Promise<boolean> => {
    const saved = readStoredUser();
    if (!saved?.api_token) return false;
    setIsLoading(true);
    try {
      const res = await axios.post('/api/v1/Onboarding/Complete', {}, { headers: { Authorization: `Bearer ${saved.api_token}` } });
      const state = res.data;
      persist({
        ...saved,
        onboarding_completed: !!state?.onboarding_completed,
        onboarding_step: state?.onboarding_step,
        company_name: state?.company?.name || saved.company_name,
      });
      return !!state?.onboarding_completed;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Best-effort server-side revoke (bumps token_version) BEFORE the token is forgotten locally.
    // A network failure must never stop the user from signing out on this device.
    const token = readStoredUser()?.api_token;
    if (token) {
      axios.post('/api/v1/Auth/Logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    persist(null);
    // Drop every cached API response so the next account never sees the previous tenant's data.
    queryClient.clear();
    try {
      localStorage.removeItem('sharyx_active_tenant_id');
      localStorage.removeItem('sharyx_active_tenant_name');
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, sendSignupOtp, resendSignupOtp, verifySignupOtp, googleAuth, refreshOnboarding, completeOnboarding, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
