// src/contexts/TemporaryPermissionContext.tsx

import React, { createContext, useContext } from 'react';

// Create a mock context with a hardcoded permission check
const PermissionContext = createContext({
  hasPermission: (permissionCode: string) => true,
});

export const usePermissions = () => {
  return useContext(PermissionContext);
};

export const PermissionProvider = ({ children }) => {
  // For development, we always return true.
  const hasPermission = (permissionCode: string) => {
    console.log(`Checking permission: ${permissionCode}. Access granted (dev mode).`);
    return true; 
  };

  return (
    <PermissionContext.Provider value={{ hasPermission }}>
      {children}
    </PermissionContext.Provider>
  );
};