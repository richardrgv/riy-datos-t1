// src/contexts/PermissionContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Definimos la interfaz del valor que proveerá el contexto
interface PermissionContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
}

// 2. Creamos el contexto con un valor por defecto (será nulo si no hay provider)
const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// 3. Creamos el componente proveedor que envolverá a toda la app
interface PermissionProviderProps {
  children: React.ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  // Aquí es donde simularemos los permisos que vendrían del backend
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    // Simulamos la carga de permisos después del login
    // En el futuro, esta lista vendrá del backend
    const mockPermissions = [
      'mis_consultas',
      'todas_las_consultas',
      'administrar_usuarios', // <-- Permiso para ver el menú principal
      'lista_usuarios',
      'agregar_usuario',
      'editar_usuario',
      'ver_usuario',
      'roles_usuario',
      'lista_menus',
      //'vistas_usuario',
      'lista_roles',
      'ver_modulos',
      'ver_mis_vistas',
      'ver_todas_vistas',
      'insertar_vista',
      'modificar_vista',
      'ver_seguridad_por_fila',
      'ver_conceptos',
      'crear_concepto'
    ];
    //setPermissions(mockPermissions);
  }, []);
  
  // Función para verificar si el usuario tiene un permiso específico
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

// 4. Creamos un hook personalizado para un fácil acceso al contexto
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};