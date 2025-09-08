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

import React, { useState, useRef } from 'react'; // ⭐ Importamos useRef ⭐
import { NavLink } from 'react-router-dom';
import { permissionsMap, PermissionItem } from '../../src-tauri/src/shared/config/permissions';
import { usePermissions } from '../contexts/PermissionContext';
import './Menu.css';
import { IconType } from 'react-icons';
import { FaHome, FaCog, FaDatabase, FaQuestionCircle } from 'react-icons/fa'; 
import ReactDOM from 'react-dom';

// Mapeo de IDs a componentes de iconos
const iconComponentMap: { [key: string]: IconType } = {
    'dashboard': FaHome,
    'administration_module': FaCog, 
    'views_module': FaDatabase,     
    'help_module': FaQuestionCircle
};

interface SubMenuPopupProps {
    parentItem: PermissionItem;
    userPermissions: string[];
    onClose: () => void;
    toggleMenu: () => void;
}

const SubMenuPopup: React.FC<SubMenuPopupProps> = ({ parentItem, userPermissions, onClose, toggleMenu }) => {
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
                            onClick={() => {
                                onClose();
                                if (window.innerWidth <= 768) {
                                    toggleMenu();
                                }
                            }}
                        >
                            <span className="submenu-text">{child.name}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </div>
    );
};

interface MenuProps {
    isMenuOpen: boolean;
    toggleMenu: () => void;
}

const Menu: React.FC<MenuProps> = ({ isMenuOpen, toggleMenu }) => {
    const { permissions } = usePermissions();
    const [openPopup, setOpenPopup] = useState<PermissionItem | null>(null);
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
    // ⭐ Nuevo estado para la posición del tooltip ⭐
    const [tooltipTop, setTooltipTop] = useState<number>(0);

    // ⭐ Referencia para obtener la posición de cada ítem del menú ⭐
    const menuItemRefs = useRef<{ [key: string]: HTMLLIElement | null }>({});


    let menuItems = Object.values(permissionsMap).filter(
        item => item.permissions.some(perm => permissions.includes(perm))
    );
    
    const dashboardItemIndex = menuItems.findIndex(item => item.id === 'dashboard');
    if (dashboardItemIndex === -1) {
        const homeItem: PermissionItem = {
            id: 'dashboard',
            name: 'Inicio',
            path: '/dashboard',
            permissions: [],
            icon: iconComponentMap['dashboard'],
        };
        menuItems = [homeItem, ...menuItems];
    } else {
        const existingDashboardItem = menuItems[dashboardItemIndex];
        existingDashboardItem.icon = iconComponentMap['dashboard'];
        if (dashboardItemIndex !== 0 && existingDashboardItem.path === '/dashboard') {
            menuItems.splice(dashboardItemIndex, 1);
            menuItems.unshift(existingDashboardItem);
        }
    }

    menuItems = menuItems.map(item => ({
        ...item,
        icon: item.icon || iconComponentMap[item.id] || undefined,
    }));

    // ⭐ Función para manejar el hover y calcular la posición ⭐
    const handleMouseEnter = (item: PermissionItem) => {
        setHoveredItemId(item.id);
        if (menuItemRefs.current[item.id]) {
            const rect = menuItemRefs.current[item.id]!.getBoundingClientRect();
            // Calcula la mitad de la altura del ítem para centrar el tooltip
            setTooltipTop(rect.top + rect.height / 2);
        }
    };

    const handleMouseLeave = () => {
        setHoveredItemId(null);
        setTooltipTop(0); // Resetea la posición
    };


    return (
        <nav className="menu-container">
            <ul className="menu-list">
                {menuItems.map(item => (
                    <li
                        key={item.id}
                        className={`menu-item ${!isMenuOpen ? 'compact' : ''}`}
                        ref={el => menuItemRefs.current[item.id] = el} // ⭐ Asigna la referencia ⭐
                        onMouseEnter={() => handleMouseEnter(item)} // ⭐ Usa el nuevo manejador ⭐
                        onMouseLeave={handleMouseLeave} // ⭐ Usa el nuevo manejador ⭐
                    >
                        {item.children ? (
                            <button
                                onClick={() => setOpenPopup(item)}
                                className="menu-link"
                            >
                                {item.icon && <span className="menu-icon"><item.icon /></span>}
                                <span className="menu-text">{item.name}</span>
                                {hoveredItemId === item.id && !isMenuOpen && ReactDOM.createPortal(
                                    <span className="menu-tooltip" style={{ top: tooltipTop + 'px' }}>{item.name}</span>, // ⭐ Pasa la posición 'top' ⭐
                                    document.body
                                )}
                            </button>
                        ) : (
                            <NavLink
                                to={item.path || '#'}
                                className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    if (isMenuOpen && window.innerWidth <= 768) {
                                        toggleMenu();
                                    }
                                }}
                            >
                                {item.icon && <span className="menu-icon"><item.icon /></span>}
                                <span className="menu-text">{item.name}</span>
                                {hoveredItemId === item.id && !isMenuOpen && ReactDOM.createPortal(
                                    <span className="menu-tooltip" style={{ top: tooltipTop + 'px' }}>{item.name}</span>, // ⭐ Pasa la posición 'top' ⭐
                                    document.body
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
                    toggleMenu={toggleMenu} 
                />
            )}
        </nav>
    );
};

export default Menu;