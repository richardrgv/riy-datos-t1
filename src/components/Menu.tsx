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

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { permissionsMap, PermissionItem } from '../../src-tauri/src/shared/config/permissions';
import { usePermissions } from '../contexts/PermissionContext';
import './Menu.css';
import { IconType } from 'react-icons';

interface SubMenuPopupProps {
    parentItem: PermissionItem;
    userPermissions: string[];
    onClose: () => void;
}

const SubMenuPopup: React.FC<SubMenuPopupProps> = ({ parentItem, userPermissions, onClose }) => {
    const accessibleChildren = Object.values(parentItem.children || {}).filter(
        child => child.permissions.some(perm => userPermissions.includes(perm))
    );

    if (accessibleChildren.length === 0) {
        return null;
    }

    return (
        <div className="submenu-popup-container">
            <div className="submenu-popup-header">
                <h3>{parentItem.name}</h3>
                <button onClick={onClose}>&times;</button>
            </div>
            <ul className="submenu-list">
                {accessibleChildren.map(child => (
                    <li key={child.id}>
                        <NavLink
                            to={child.path || '#'}
                            className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            {child.name}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </div>
    );
};

interface MenuProps {
    isMenuOpen: boolean;
}

const Menu: React.FC<MenuProps> = ({ isMenuOpen }) => {
    const { permissions } = usePermissions();
    const [openPopup, setOpenPopup] = useState<PermissionItem | null>(null);
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

    const topLevelItems = Object.values(permissionsMap).filter(item => {
        const hasPermission = item.permissions.some(perm => permissions.includes(perm));
        return hasPermission;
    });

    const handleMenuItemClick = (item: PermissionItem) => {
        if (item.children) {
            setOpenPopup(item);
        } else {
            setOpenPopup(null);
        }
    };

    return (
        <nav className={`menu-container ${isMenuOpen ? 'open' : 'closed'}`}>
            <ul className="menu-list">
                {topLevelItems.map(item => (
                    <li
                        key={item.id}
                        className="menu-item"
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                    >
                        {item.children ? (
                            <button className="menu-link" onClick={() => handleMenuItemClick(item)}>
                                {item.icon && <span className="menu-icon"><item.icon /></span>}
                                <span className="menu-text">{item.name}</span>
                                {hoveredItemId === item.id && !isMenuOpen && (
                                    <span className="menu-tooltip">{item.name}</span>
                                )}
                            </button>
                        ) : (
                            <NavLink
                                to={item.path || '#'}
                                className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
                            >
                                {item.icon && <span className="menu-icon"><item.icon /></span>}
                                <span className="menu-text">{item.name}</span>
                                {hoveredItemId === item.id && !isMenuOpen && (
                                    <span className="menu-tooltip">{item.name}</span>
                                )}
                            </NavLink>
                        )}
                    </li>
                ))}
            </ul>
            {openPopup && (
                <SubMenuPopup
                    parentItem={openPopup}
                    userPermissions={permissions}
                    onClose={() => setOpenPopup(null)}
                />
            )}
        </nav>
    );
};

export default Menu;