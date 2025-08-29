// src/components/MenuList.tsx
/*
Este es un componente presentacional o de "vista". 
Recibe los datos ya preparados (la estructura de árbol del menú) 
y se encarga de renderizar la lista (<ul> y <li>) 
y de manejar la interactividad visual, como expandir y colapsar los submenús. 
Es el responsable de que la indentación funcione.
*/
// src/components/MenuList.tsx

import React from 'react';
import { getSidebarRoutes } from '../routes/routeUtils';
import MenuItem from './MenuItem'; // Importa el nuevo componente
import './Menu.css';

const MenuList: React.FC = () => {
    const routes = getSidebarRoutes();

    return (
        <ul className="menu-list">
            {routes
                .filter(route => route.tipo_elemento === 'Modulo' || route.tipo_elemento === 'Ventana')
                .map((route, index) => (
                    <MenuItem key={route.path || index} route={route} level={0} />
                ))}
        </ul>
    );
};

export default MenuList;