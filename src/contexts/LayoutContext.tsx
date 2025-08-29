// src/context/LayoutContext.tsx

/*
La funcionalidad clave del LayoutContext es que crea un canal de comunicación global 
entre el MainLayout (el padre) y sus componentes hijos, como el AdministracionUsuariosLayout.

useLayoutContext(): Este es el "gancho" (hook) que usarás en cualquier componente hijo 
que necesite acceder a la información del contexto. 

En tu caso, el AdministracionUsuariosLayout usa useLayoutContext() 
para enviar la información de las pestañas al LayoutContext,
*/

// src/context/LayoutContext.tsx
import React, { createContext, useContext } from 'react';

const LayoutContext = createContext({
    tabs: [], // ⭐ Valor inicial para evitar el error
    setTabs: () => {},
});



export const useLayoutContext = () => useContext(LayoutContext);

export const LayoutProvider = ({ children }) => {
    const [tabs, setTabs] = useState([]);
    
    const value = { tabs, setTabs };

    return (
        <LayoutContext.Provider value={value}>
            {children}
        </LayoutContext.Provider>
    );
};