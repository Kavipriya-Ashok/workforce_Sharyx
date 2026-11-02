import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';

export interface Tenant {
  id: string;
  name: string;
  email?: string;
  website?: string;
  address?: string;
  status?: boolean;
  country_id?: string;
  currency_id?: string;
}

interface TenantContextType {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  isLoadingTenants: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  switchTenant: (tenant: Tenant | null) => void;
  resetToAllTenants: () => void;
  refreshTenants: () => Promise<void>;
}

// Global Axios Request Interceptor for Tenant Scoping
if (typeof window !== 'undefined') {
  axios.interceptors.request.use((config) => {
    try {
      const activeTenantId = localStorage.getItem('sharyx_active_tenant_id');
      if (activeTenantId && activeTenantId !== 'all') {
        config.headers['x-tenant-id'] = activeTenantId;
      } else {
        delete config.headers['x-tenant-id'];
      }
    } catch {
      // ignore storage access errors
    }
    return config;
  });
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Real Database Seeded Tenants
export const DEFAULT_REAL_TENANTS: Tenant[] = [
  {
    id: '646b4abe-e6de-401b-ba33-46884bf3f6e6',
    name: 'Sharyx Enterprise Inc',
    email: 'enterprise@sharyx.com',
    status: true,
  },
  {
    id: '47541961-982c-44fd-886a-fb9e4475a12e',
    name: 'Alpha Global Logistics',
    email: 'ops@alphaglobal.com',
    status: true,
  },
];

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tenants, setTenants] = useState<Tenant[]>(DEFAULT_REAL_TENANTS);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // Determine if user has Super Admin clearance
  const roleName = (user?.role || '').toLowerCase();
  const userEmail = (user?.email || '').toLowerCase();
  const isSuperAdmin =
    roleName.includes('super') ||
    roleName === 'super_admin' ||
    roleName === 'whitelabel_admin' ||
    userEmail === 'admin@user.com' ||
    userEmail === 'admin@sharyx.com' ||
    userEmail.includes('priyashok');

  const refreshTenants = useCallback(async () => {
    setIsLoadingTenants(true);
    try {
      const userStr = localStorage.getItem('sharyx_user');
      let authHeaders: Record<string, string> = {};
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          const token = parsed?.api_token || parsed?.token;
          if (token) {
            authHeaders['Authorization'] = `Bearer ${token}`;
          }
        } catch {
          // ignore
        }
      }

      const res = await axios.get('/api/v1/Company/List', { headers: authHeaders });
      const data = res.data?.AddtionalData || res.data?.result || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setTenants(data);
      } else {
        setTenants(DEFAULT_REAL_TENANTS);
      }
    } catch {
      setTenants(DEFAULT_REAL_TENANTS);
    } finally {
      setIsLoadingTenants(false);
    }
  }, [user]);

  // Load tenants on mount and restore saved tenant selection
  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  useEffect(() => {
    const savedTenantId = localStorage.getItem('sharyx_active_tenant_id');
    if (savedTenantId && savedTenantId !== 'all') {
      const found = tenants.find((t) => t.id === savedTenantId);
      if (found) {
        setSelectedTenant(found);
      } else {
        const savedName = localStorage.getItem('sharyx_active_tenant_name') || 'Active Workspace';
        setSelectedTenant({ id: savedTenantId, name: savedName });
      }
    } else {
      setSelectedTenant(null); // All Tenants / Global
    }
  }, [tenants]);

  const switchTenant = (tenant: Tenant | null) => {
    if (tenant) {
      localStorage.setItem('sharyx_active_tenant_id', tenant.id);
      localStorage.setItem('sharyx_active_tenant_name', tenant.name);
      setSelectedTenant(tenant);
    } else {
      localStorage.setItem('sharyx_active_tenant_id', 'all');
      localStorage.removeItem('sharyx_active_tenant_name');
      setSelectedTenant(null);
    }

    // Invalidate React Query cache so active screens refetch data scoped to this tenant
    try {
      queryClient.invalidateQueries();
    } catch {
      // ignore
    }
  };

  const resetToAllTenants = () => {
    switchTenant(null);
  };

  const isImpersonating = Boolean(isSuperAdmin && selectedTenant !== null);

  return (
    <TenantContext.Provider
      value={{
        tenants,
        selectedTenant,
        isLoadingTenants,
        isSuperAdmin,
        isImpersonating,
        switchTenant,
        resetToAllTenants,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
