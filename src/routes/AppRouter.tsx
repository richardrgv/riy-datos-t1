// src/routes/AppRouter.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import { useUser } from '../contexts/UserContext';
import { PermissionProvider } from '../contexts/PermissionContext';
import { generateRoutesFromMap } from './routeUtils';
import { permissionsMap } from '../../src-tauri/src/shared/config/permissions';

const AppRouter: React.FC = () => {
    const { user, permissions } = useUser();
    
    const userPermissions = permissions || [];
    const dynamicRoutes = generateRoutesFromMap(permissionsMap, userPermissions);
    // ⭐ Nuevo punto de depuración:
    console.log("Rutas dinámicas generadas:", dynamicRoutes);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/" 
                    element={user ? (
                        <PermissionProvider permissions={userPermissions}>
                            <MainLayout />
                        </PermissionProvider>
                    ) : (
                        <Navigate to="/login" />
                    )}
                >
                    {dynamicRoutes}
                </Route>
                
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;