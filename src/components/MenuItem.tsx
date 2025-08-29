// src/components/MenuItem.tsx

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { FaAngleDown, FaAngleUp } from 'react-icons/fa';
import { RouteItem } from '../routes/routeUtils';

interface MenuItemProps {
    route: RouteItem;
    level: number;
}

const MenuItem: React.FC<MenuItemProps> = ({ route, level }) => {
    const { hasPermission } = usePermissions();
    const [isExpanded, setIsExpanded] = useState(false);

    // Filtra los hijos para ver cuáles son realmente visibles según los permisos
    const visibleChildren = route.children ? route.children.filter(child => hasPermission(child.permission)) : [];
    const hasVisibleChildren = visibleChildren.length > 0;

    // Solo muestra el elemento si el usuario tiene permiso para él
    if (!hasPermission(route.permission)) {
        return null;
    }

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const indentationStyle = {
        paddingLeft: `${level * 20 + 15}px`,
    };

    // Si el elemento tiene hijos visibles, renderiza un contenedor expandible
    if (hasVisibleChildren) {
        return (
            <li className="menu-item">
                <div
                    className="menu-item-parent"
                    onClick={toggleExpand}
                    style={indentationStyle}
                >
                    <span className="menu-item-name">{route.name}</span>
                    <span className="menu-item-icon">
                        {isExpanded ? <FaAngleUp /> : <FaAngleDown />}
                    </span>
                </div>
                {isExpanded && (
                    <ul className="sub-menu">
                        {visibleChildren.map((childRoute, index) => (
                            <MenuItem 
                                key={childRoute.path || index}
                                route={childRoute}
                                level={level + 1}
                            />
                        ))}
                    </ul>
                )}
            </li>
        );
    }

    // Si no tiene hijos visibles, es un simple NavLink
    return (
        <li className="menu-item">
            <NavLink
                to={route.path}
                style={indentationStyle}
                className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}
            >
                {route.name}
            </NavLink>
        </li>
    );
};

export default MenuItem;