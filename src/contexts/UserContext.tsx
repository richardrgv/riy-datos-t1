// src/contexts/UserContext.tsx

/* CAJA DE HERRAMIENTAS
Es un almacén de datos global para la información del usuario en tu aplicación React.

Su propósito es resolver el problema de pasar datos a través de múltiples niveles de componentes, 
un patrón conocido como "prop drilling".

Una vez que el usuario inicia sesión, la caja se llena con esta información y se vuelve accesible para
cualquier componente de la aplicación, sin importar cuán profundo esté en el árbol de componentes.
*/

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { LoggedInUser } from '../types/api-types';
import { clearAuthToken } from '../utils/api-client'; // <-- Importa la función aquí

// Define el estado inicial de tu contexto
interface UserState {
  user: LoggedInUser | null;
  permissions: string[] | null;
}

const initialState: UserState = {
  user: null,
  permissions: null,
};

// Define las acciones que el reducer puede manejar
type UserAction =
  | { type: 'LOGIN'; payload: { user: LoggedInUser; permissions: string[] } }
  | { type: 'LOGOUT' };

// El reductor que maneja las transiciones de estado
const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        permissions: action.payload.permissions,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        permissions: null,
      };
    default:
      return state;
  }
};

// Define el tipo de contexto
interface UserContextType {
  user: LoggedInUser | null;
  permissions: string[] | null;
  login: (user: LoggedInUser, permissions: string[]) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use `useReducer` para manejar el estado
  const [state, dispatch] = useReducer(userReducer, initialState);

  // ⭐ Arreglo de permisos temporales para desarrollo
  const TEMPORARY_PERMISSIONS = [
    'can_view_users',
    'can_view_users_list',
    'can_manage_roles',
    // Agrega aquí todos los permisos que necesites para las pruebas
  ];

  // Las funciones de login y logout ahora solo necesitan despachar acciones
  
  // ⭐ La función de login ahora recibe permisos como argumento opcional
  const login = (user: LoggedInUser, permissions?: string[]) => {
    // ⭐ Usa los permisos reales si se proveen, de lo contrario, usa los temporales
    const assignedPermissions = permissions && permissions.length > 0
      ? permissions
      : TEMPORARY_PERMISSIONS;

    dispatch({ type: 'LOGIN', payload: { user, permissions: assignedPermissions } });
    console.log('Usuario y permisos asignados en el contexto:', { user: user, permissions: assignedPermissions });
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
    clearAuthToken(); // <-- La función importada
  };

  // El valor del contexto ahora incluye las funciones y el estado del reductor
  const value = {
    user: state.user,
    permissions: state.permissions,
    login,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};