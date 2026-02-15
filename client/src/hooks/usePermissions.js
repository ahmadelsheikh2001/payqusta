import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Permissions Hook
export const usePermissionsStore = create(
  persist(
    (set, get) => ({
      permissions: [],
      
      setPermissions: (permissions) => set({ permissions }),
      
      hasPermission: (resource, action) => {
        const { permissions } = get();
        const permission = permissions.find(p => p.resource === resource);
        return permission && permission.actions.includes(action);
      },
      
      canCreate: (resource) => get().hasPermission(resource, 'create'),
      canRead: (resource) => get().hasPermission(resource, 'read'),
      canUpdate: (resource) => get().hasPermission(resource, 'update'),
      canDelete: (resource) => get().hasPermission(resource, 'delete'),
      
      clearPermissions: () => set({ permissions: [] }),
    }),
    {
      name: 'permissions-storage',
    }
  )
);

// Custom hook for easier usage
export const usePermissions = () => {
  const store = usePermissionsStore();
  
  return {
    permissions: store.permissions,
    hasPermission: store.hasPermission,
    canCreate: store.canCreate,
    canRead: store.canRead,
    canUpdate: store.canUpdate,
    canDelete: store.canDelete,
  };
};
