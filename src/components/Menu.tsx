// src/components/Menu.tsx 

/* Se encarga de la navegación

Piensa en el proceso como una llave y una cerradura.
La base de datos te da la llave. Durante el proceso de inicio de sesión, 
el backend verifica tus credenciales y te devuelve una "llave" (tus permisos) 
que dice lo que puedes y no puedes hacer. 
Esta llave se almacena en el UserContext y está disponible en toda tu aplicación.

routeUtils define las cerraduras. El archivo routeUtils es un mapa estático que dice: 
"
*/

// src/components/Menu.tsx

import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { permissionsMap, PermissionItem } from '../../src-tauri/src/shared/config/permissions';
import { usePermissions } from '../contexts/PermissionContext';
import { useTitle } from '../contexts/TitleContext';
import './Menu.css';
import { IconType } from 'react-icons';
import { FaAngleLeft, FaHome, FaCog, FaDatabase, FaQuestionCircle } from 'react-icons/fa';
import ReactDOM from 'react-dom';

const iconComponentMap: { [key: string]: IconType } = {
    'dashboard': FaHome,
    'system_administration_menu': FaCog,
    'views_menu': FaDatabase,
    'help_menu': FaQuestionCircle
};

interface MenuProps {
    isMenuOpen: boolean;
    toggleMenu: () => void;
}

const Menu: React.FC<MenuProps> = ({ isMenuOpen, toggleMenu }) => {
    const { permissions } = usePermissions();
    const { setTitle } = useTitle();
    const navigate = useNavigate();
    const location = useLocation();

    const getAccessibleItems = (items: PermissionItem[]) => {
        return items.filter(
            item => item.permissions.some(perm => permissions.includes(perm))
        );
    };

    const initialMenuItems: PermissionItem[] = getAccessibleItems(Object.values(permissionsMap));
    const [menuHistory, setMenuHistory] = useState<{ items: PermissionItem[], parentTitle: string }[]>([
        { items: initialMenuItems, parentTitle: 'Inicio' }
    ]);
    const currentMenu = menuHistory[menuHistory.length - 1];
    const isSubMenu = menuHistory.length > 1;

    const [showTooltip, setShowTooltip] = useState<boolean>(false);
    const [tooltipContent, setTooltipContent] = useState<string | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number, left: number } | null>(null);

    const findParentPath = (item: PermissionItem): string => {
        for (const parent of Object.values(permissionsMap)) {
            if (parent.children && Object.values(parent.children).some(child => child.id === item.id)) {
                return parent.path || '';
            }
        }
        return '';
    };

    const handleItemClick = (item: PermissionItem) => {
        const accessibleChildren = item.children ? getAccessibleItems(Object.values(item.children)) : [];
        if (accessibleChildren.length > 0) {
            setMenuHistory([...menuHistory, { items: accessibleChildren, parentTitle: item.name }]);
            setTitle(item.name);
            navigate(`/${item.path}`); 
        } else {
            const parentPath = findParentPath(item);
            const fullPath = parentPath ? `/${parentPath}/${item.path}` : `/${item.path}`;

            setTitle(item.name);
            navigate(fullPath);
            
            if (window.innerWidth <= 768) {
                toggleMenu();
            }
        }
    };

    const handleBackClick = () => {
        if (menuHistory.length > 1) {
            // ⭐ Lógica corregida para regresar al nivel superior adecuado.
            // Si el historial tiene 2 elementos, se regresa a 'Inicio'.
            if (menuHistory.length === 2) {
                const previousMenu = menuHistory[0];
                setMenuHistory([previousMenu]);
                setTitle(previousMenu.parentTitle);
                navigate('/');
            } else {
                // Si el historial tiene más de 2 elementos, se regresa al menú padre.
                const newHistory = menuHistory.slice(0, -1);
                const previousMenu = newHistory[newHistory.length - 1];
                setMenuHistory(newHistory);
                setTitle(previousMenu.parentTitle);
                const currentPathSegments = location.pathname.split('/').filter(Boolean);
                const newPathSegments = currentPathSegments.slice(0, -1);
                const newPath = `/${newPathSegments.join('/')}`;
                navigate(newPath);
            }
        }
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

    const accessibleCurrentMenu = currentMenu.items.filter(
        item => item.permissions.some(perm => permissions.includes(perm))
    );

    const menuItemsWithIcons = accessibleCurrentMenu.map(item => ({
        ...item,
        icon: item.icon || iconComponentMap[item.id] || undefined,
    }));
    
    const parentName = currentMenu.parentTitle;

    return (
        <nav className="menu-container">
            <ul className="menu-list">
                {isSubMenu && (
                    <li onClick={handleBackClick} className="menu-back-header">
                        <FaAngleLeft />
                        <span>{parentName}</span>
                    </li>
                )}
                {menuItemsWithIcons.map(item => {
                    const accessibleChildren = item.children ? getAccessibleItems(Object.values(item.children)) : [];
                    const hasAccessibleChildren = accessibleChildren.length > 0;
                    const path = findParentPath(item) ? `/${findParentPath(item)}/${item.path}` : `/${item.path}`;

                    return (
                        <li key={item.id} className={`menu-item ${!isMenuOpen ? 'compact' : ''}`}>
                            {hasAccessibleChildren ? (
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
                                    to={path}
                                    className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
                                    onClick={() => {
                                        setTitle(item.name);
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
                    );
                })}
            </ul>
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