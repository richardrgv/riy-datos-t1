// src/hooks/usePermissions.ts
/*
El hook usePermissions es el único componente que "se conecta" a UserContext para leer los permisos. 
Luego, expone una función (hasPermission) que puede ser utilizada en cualquier lugar 
de tu aplicación sin tener que importar el contexto directamente.
*/
import { useUser } from '../contexts/UserContext';
import { useCallback } from 'react';

export const usePermissions = () => {
    const { permissions } = useUser();

    const hasPermission = useCallback((requiredPermission: string): boolean => {
        if (!requiredPermission || requiredPermission === 'all') {
            return true;
        }
        return permissions.includes(requiredPermission);
    }, [permissions]);

    return { hasPermission };
};