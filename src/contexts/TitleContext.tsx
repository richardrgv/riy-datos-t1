// src/contexts/TitleContext.tsx

import React, { createContext, useState, useContext, ReactNode } from 'react';

// 1. Define el tipo de dato que guardará el contexto
interface TitleContextType {
    title: string;
    setTitle: (newTitle: string) => void;
}

// 2. Crea el contexto con un valor inicial
const TitleContext = createContext<TitleContextType | undefined>(undefined);

// 3. Crea un proveedor que envolverá a toda tu aplicación
export const TitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [title, setTitle] = useState<string>('RIY DATOS'); // Valor inicial
    
    return (
        <TitleContext.Provider value={{ title, setTitle }}>
            {children}
        </TitleContext.Provider>
    );
};

// 4. Crea un hook personalizado para usar el contexto fácilmente
export const useTitle = () => {
    const context = useContext(TitleContext);
    if (context === undefined) {
        throw new Error('useTitle debe ser usado dentro de un TitleProvider');
    }
    return context;
};