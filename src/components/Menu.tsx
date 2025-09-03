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
    // ⭐ Definimos la propiedad para recibir la función
    toggleMenu: () => void;
}

const Menu: React.FC<MenuProps> = ({ isMenuOpen, toggleMenu }) => {
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
            // ⭐ CERRAMOS EL MENÚ SOLO SI ES UN ENLACE DE NAVEGACIÓN
            if (isMenuOpen && window.innerWidth <= 768) {
                toggleMenu();
            }
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
                                // ⭐ USAMOS EL HANDLER DE CLIC PARA CERRAR EL MENÚ
                                onClick={() => {
                                    if (isMenuOpen && window.innerWidth <= 768) {
                                        toggleMenu();
                                    }
                                }}
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