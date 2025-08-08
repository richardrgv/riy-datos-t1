// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(requiredPermission)) {
    // Si el usuario no tiene el permiso, lo redirigimos a la página de acceso denegado
    return <Navigate to="/acceso-denegado" replace />;
  }
  
  // Si el usuario tiene el permiso, mostramos la página solicitada
  return <>{children}</>;
};

export default ProtectedRoute;