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

const isSuperRole = (role?: string) => (role || '').toLowerCase().includes('super');

// The tenant switcher header is only ever sent for a Super Admin. For everyone else the server
// takes the tenant from the signed JWT and ignores this header entirely.
if (typeof window !== 'undefined') {
  axios.interceptors.request.use((config) => {
    try {
      const stored = localStorage.getItem('sharyx_user');
      const role = stored ? JSON.parse(stored)?.role : undefined;
      const activeTenantId = localStorage.getItem('sharyx_active_tenant_id');
      if (isSuperRole(role) && activeTenantId) {
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

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

  // Role comes only from the server-issued session - never guessed from an email address.
  const isSuperAdmin = isSuperRole(user?.role);

  const refreshTenants = useCallback(async () => {
    if (!user?.api_token) {
      setTenants([]);
      return;
    }
    setIsLoadingTenants(true);
    try {
      // The server returns every tenant to a Super Admin and only the caller's own company to anyone else.
      const res = await axios.get('/api/v1/Company/List');
      const data = res.data?.AddtionalData || res.data?.result || res.data;
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    } finally {
      setIsLoadingTenants(false);
    }
  }, [user?.api_token]);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSelectedTenant(null);
      return;
    }
    const savedTenantId = localStorage.getItem('sharyx_active_tenant_id');
    if (savedTenantId && savedTenantId !== 'all') {
      const found = tenants.find((t) => t.id === savedTenantId);
      if (found) {
        setSelectedTenant(found);
      } else if (tenants.length > 0) {
        // The remembered tenant no longer exists: fall back to the global view.
        localStorage.setItem('sharyx_active_tenant_id', 'all');
        setSelectedTenant(null);
      }
    } else {
      setSelectedTenant(null); // All Tenants / Global
    }
  }, [tenants, isSuperAdmin]);

  const switchTenant = (tenant: Tenant | null) => {
    if (!isSuperAdmin) return; // only a Super Admin may switch tenants
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
