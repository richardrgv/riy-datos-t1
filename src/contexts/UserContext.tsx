// src/contexts/UserContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define la interfaz del usuario conectado
export interface LoggedInUser {
  usuario: string;
  nombre: string;
  // Puedes añadir más campos como rol, etc.
}

interface UserContextType {
  user: LoggedInUser | null;
  setUser: (user: LoggedInUser | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { ReactNode }) => {
  // El estado inicial es null, indicando que no hay un usuario conectado
  const [user, setUser] = useState<LoggedInUser | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser debe ser usado dentro de un UserProvider');
  }
  return context;
};