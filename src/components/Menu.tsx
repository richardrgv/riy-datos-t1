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
import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { permissionsMap, PermissionItem } from '../../src-tauri/src/shared/config/permissions';
import { usePermissions } from '../contexts/PermissionContext';
import './Menu.css';
import { IconType } from 'react-icons';
import { FaAngleLeft, FaHome, FaCog, FaDatabase, FaQuestionCircle } from 'react-icons/fa'; 
import ReactDOM from 'react-dom';

const iconComponentMap: { [key: string]: IconType } = {
    'dashboard': FaHome,
    'administration_module': FaCog, 
    'views_module': FaDatabase,     
    'help_module': FaQuestionCircle
};

interface MenuProps {
    isMenuOpen: boolean;
    toggleMenu: () => void;
}

const Menu: React.FC<MenuProps> = ({ isMenuOpen, toggleMenu }) => {
    const { permissions } = usePermissions();
    const navigate = useNavigate();

    const initialMenuItems: PermissionItem[] = Object.values(permissionsMap).filter(
        item => item.permissions.some(perm => permissions.includes(perm))
    );
    
    const [menuHistory, setMenuHistory] = useState<PermissionItem[][]>([initialMenuItems]);
    const currentMenu = menuHistory[menuHistory.length - 1];
    const isSubMenu = menuHistory.length > 1;

    const [showTooltip, setShowTooltip] = useState<boolean>(false);
    const [tooltipContent, setTooltipContent] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number, left: number } | null>(null);

    const accessibleCurrentMenu = currentMenu.filter(
        item => item.permissions.some(perm => permissions.includes(perm))
    );

    const menuItemsWithIcons = accessibleCurrentMenu.map(item => ({
        ...item,
        icon: item.icon || iconComponentMap[item.id] || undefined,
    }));

    const handleItemClick = (item: PermissionItem) => {
        if (item.children && Object.keys(item.children).length > 0) {
            const accessibleChildren = Object.values(item.children).filter(
                child => child.permissions.some(perm => permissions.includes(perm))
            );
            if (accessibleChildren.length > 0) {
                setMenuHistory([...menuHistory, accessibleChildren]);
            }
        } else if (item.path) {
            navigate(item.path);
            if (window.innerWidth <= 768) {
                toggleMenu();
            }
        }
    };
    
    const handleBackClick = () => {
        setMenuHistory(menuHistory.slice(0, -1));
    };

    const handleMouseEnter = (item: PermissionItem, targetElement: HTMLElement) => {
        if (!isMenuOpen) {
            setTooltipContent(item.name);
            const rect = targetElement.getBoundingClientRect();
            setTooltipPosition({
                top: rect.top + rect.height / 2,
                left: rect.right + 10 
            });
            setShowTooltip(true);
        }
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
        setTooltipContent(null);
        setTooltipPosition(null);
    };

    const parentItemOfSubMenu = menuHistory.length > 1 ? Object.values(permissionsMap).find(
        (permItem) => permItem.children && Object.values(permItem.children).some(
            (child) => child.id === accessibleCurrentMenu[0]?.id
        )
    ) : undefined;
    const parentName = parentItemOfSubMenu ? parentItemOfSubMenu.name : 'Volver';

    return (
        <nav className="menu-container">
            <ul className="menu-list">
                {isSubMenu && (
                    <li
                        onClick={handleBackClick}
                        className="menu-back-header"
                    >
                        <FaAngleLeft />
                        <span>{parentName}</span>
                    </li>
                )}
                {menuItemsWithIcons.map(item => (
                    <li
                        key={item.id}
                        className={`menu-item ${!isMenuOpen ? 'compact' : ''}`}
                    >
                        {item.children ? (
                            <button
                                onClick={() => handleItemClick(item)}
                                className="menu-link"
                                onMouseEnter={(e) => handleMouseEnter(item, e.currentTarget)}
                                onMouseLeave={handleMouseLeave}
                            >
                                {item.icon && <span className="menu-icon"><item.icon /></span>}
                                <span className="menu-text">{item.name}</span>
                            </button>
                        ) : (
                            <NavLink
                                to={item.path || '#'}
                                className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    if (window.innerWidth <= 768 && isMenuOpen) {
                                        toggleMenu();
                                    }
                                }}
                                onMouseEnter={(e) => handleMouseEnter(item, e.currentTarget)}
                                onMouseLeave={handleMouseLeave}
                            >
                                {item.icon && <span className="menu-icon"><item.icon /></span>}
                                <span className="menu-text">{item.name}</span>
                            </NavLink>
                        )}
                    </li>
                ))}
            </ul>
            {/* ⭐ CORRECCIÓN: El tooltip se renderiza una sola vez, fuera del map, con un Portal ⭐ */}
            {showTooltip && tooltipContent && tooltipPosition && ReactDOM.createPortal(
                <span 
                    className="menu-tooltip visible"
                    style={{ top: tooltipPosition.top + 'px', left: tooltipPosition.left + 'px' }}
                >
                    {tooltipContent}
                </span>,
                document.body
            )}
        </nav>
    );
};

export default Menu;