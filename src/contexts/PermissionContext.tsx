// src/contexts/PermissionContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PermissionContextType {
    permissions: string[];
    hasPermission: (permission: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// 1. Ahora el proveedor acepta un array de permisos como prop
interface PermissionProviderProps {
    children: ReactNode;
    permissions: string[]; // <-- Acepta la prop de permisos
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children, permissions }) => { // <-- Desestructura la prop
    // 2. Usamos directamente la prop 'permissions'
    // Ya no necesitas useState ni useEffect para la simulación
    
    const hasPermission = (permission: string): boolean => {
        return permissions.includes(permission);
    };

    const value = {
        permissions,
        hasPermission,
    };

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionProvider');
    }
    return context;
};