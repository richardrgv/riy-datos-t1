// src/layouts/WindowLayout.tsx

import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { usePermissions } from '../contexts/TemporaryPermissionContext';
import { getProtectedRoutes } from '../routes/routeUtils';
import ResponsiveTabMenu from '../components/ResponsiveTabMenu'; // Importa el componente
import './WindowLayout.css';

const WindowLayout = () => {
    const location = useLocation();
    const permissions = usePermissions();

    const allRoutes = getProtectedRoutes();
    const findCurrentWindow = (routes: any[], path: string): any | null => {
        // Busca la ruta de la ventana actual, ya que el 'path' de la locación puede ser de una sub-pestaña
        const baseRoute = path.split('/')[2];
        for (const route of routes) {
            if (route.path === baseRoute) {
                return route;
            }
        }
        return null;
    };
    
    const currentWindow = findCurrentWindow(allRoutes, location.pathname);

    if (!currentWindow) {
        return <div>Ventana no encontrada.</div>;
    }

    const tabs = currentWindow.children?.filter(
        (child: any) => child.tipo_elemento === 'Pestaña' && permissions.hasPermission(child.permission)
    ) || [];

    return (
        <div className="window-layout-container">
            <ResponsiveTabMenu>
                {tabs.map((tab: any) => (
                    <NavLink
                        key={tab.path}
                        to={`${currentWindow.path}/${tab.path}`}
                        className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}
                    >
                        {tab.name}
                    </NavLink>
                ))}
            </ResponsiveTabMenu>
            <main className="window-content">
                <Outlet />
            </main>
        </div>
    );
};

export default WindowLayout;