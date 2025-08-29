// src/components/Menu.tsx 

/* Se encarga de la navegación

Piensa en el proceso como una llave y una cerradura.
La base de datos te da la llave. Durante el proceso de inicio de sesión, 
el backend verifica tus credenciales y te devuelve una "llave" (tus permisos) 
que dice lo que puedes y no puedes hacer. 
Esta llave se almacena en el UserContext y está disponible en toda tu aplicación.

routeUtils define las cerraduras. El archivo routeUtils es un mapa estático que dice: 
"Para acceder a la página de Usuarios, necesitas una llave con la etiqueta can_view_users." 
Esta configuración es fija y no cambia por usuario.

usePermissions es el mecanismo de verificación. 
Este hook compara tu llave (los permisos del UserContext) 
con la cerradura de la página (el permiso definido en routeUtils).
*/

// src/components/Menu.tsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { sidebarRoutes } from '../routes/routeUtils';
import './Menu.css';

interface MenuItemProps {
    item: any; // Ajusta el tipo de `item` según la estructura de `sidebarRoutes`
    isMenuOpen: boolean;
    level?: number; // Para controlar la indentación
}

// ⭐ Componente auxiliar para un solo elemento del menú
const MenuItem: React.FC<MenuItemProps> = ({ item, isMenuOpen, level = 0 }) => {
    const paddingLeft = (level * 20) + (level === 0 ? 0 : 20); // Ajusta la indentación según el nivel

    // Si el ítem tiene hijos, renderiza un submenú
    if (item.children && item.children.length > 0) {
        return (
            <li className="menu-item has-children" style={{ paddingLeft: `${paddingLeft}px` }}>
                <div
                    className="menu-parent"
                    title={item.name}
                >
                    {/* ⭐ Manejo del icono: si existe, se muestra. Si no, se mantiene un espacio */}
                    {item.icon && <span className="menu-icon">{item.icon}</span>}
                    {!item.icon && isMenuOpen && <span className="menu-icon-placeholder"></span>} {/* Espacio si no hay icono y menú abierto */}
                    {!item.icon && !isMenuOpen && <span className="menu-icon-hidden"></span>} {/* Espacio si no hay icono y menú cerrado (oculto) */}

                    <span className={`menu-text ${!isMenuOpen ? 'hidden' : ''}`}>{item.name}</span>
                </div>
                <ul className="submenu-list">
                    {/* Llamada recursiva, pasando la prop `isMenuOpen` y aumentando el nivel */}
                    {item.children.map((child, index) => (
                        <MenuItem key={index} item={child} isMenuOpen={isMenuOpen} level={level + 1} />
                    ))}
                </ul>
            </li>
        );
    }
  

    // Si no tiene hijos, renderiza un enlace con el ícono
    return (
        <li className="menu-item" style={{ paddingLeft: `${paddingLeft}px` }}>
            <NavLink
                to={item.path}
                className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
                title={item.name}
            >
                {/* ⭐ Manejo del icono: si existe, se muestra. Si no, se mantiene un espacio */}
                {item.icon && <span className="menu-icon">{item.icon}</span>}
                {!item.icon && isMenuOpen && <span className="menu-icon-placeholder"></span>}
                {!item.icon && !isMenuOpen && <span className="menu-icon-hidden"></span>}

                <span className={`menu-text ${!isMenuOpen ? 'hidden' : ''}`}>{item.name}</span>
            </NavLink>
        </li>
    );

};

// ⭐ El componente principal del menú
const Menu: React.FC<MenuProps> = ({ isMenuOpen }) => {
    return (
        <nav className="menu-container">
            <ul className="menu-list">
                {sidebarRoutes.map((route, index) => (
                    <MenuItem key={index} item={route} isMenuOpen={isMenuOpen} level={0} />
                ))}
            </ul>
        </nav>
    );
};

export default Menu;