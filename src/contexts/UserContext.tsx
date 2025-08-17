// UserContext.tsx

// Importa useState y ReactNode
import { createContext, useContext, useState, ReactNode } from 'react';
import { LoggedInUser } from '../../src-tauri/src/shared/models';



interface UserContextType {
  user: LoggedInUser | null;
  token: string | null;
  permissions: string[]; // <--- Agrega la propiedad de permisos
  login: (userData: LoggedInUser, userPermissions: string[], userToken: string) => void;
  logout: () => void;
  setPermissions: (newPermissions: string[]) => void; // <--- Agrega la función setPermissions
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]); // <--- Crea el estado de permisos

  const login = (userData: LoggedInUser, userPermissions: string[], userToken: string) => {
    setUser(userData);
    setToken(userToken);
    setPermissions(userPermissions); // <--- Llama a la función setPermissions aquí
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPermissions([]);
  };

  // ⚠️ Asegúrate de que `setPermissions` esté en el objeto de valor del proveedor
  const value = { user, token, permissions, login, logout, setPermissions };

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