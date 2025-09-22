// src/routes/AppRouter.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import { useUser } from '../contexts/UserContext';
import { PermissionProvider } from '../contexts/PermissionContext';
import { TitleProvider } from '../contexts/TitleContext'; // ⭐ Nuevo
import { generateRoutesFromMap } from './routeUtils';
import { permissionsMap } from '../../src-tauri/src/shared/config/permissions';
import Home from '../pages/Home'; // ⭐ Importa el componente de Inicio

const AppRouter: React.FC = () => {
    const { user, permissions } = useUser();

    // ⭐⭐ PUNTO DE DEBUG: VERIFICA EL CONTENIDO DE `permissions` ⭐⭐
    console.log("Permisos del usuario:", permissions); 
    
    const userPermissions = permissions || [];
    const dynamicRoutes = generateRoutesFromMap(permissionsMap, userPermissions);
    // ⭐ Nuevo punto de depuración:
    console.log("Rutas dinámicas generadas:", dynamicRoutes);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    // ⭐ CAMBIE ESTA LÍNEA "/" A "/*" ⭐
                    path="/*"  
                    element={user ? (
                        <PermissionProvider permissions={userPermissions}>
                            {/* ⭐ Aquí envolvemos el MainLayout con el proveedor del título ⭐ */}
                            <TitleProvider>
                                <MainLayout />
                            </TitleProvider>
                        </PermissionProvider>
                    ) : (
                        <Navigate to="/login" />
                    )}
                >
                    {/* Y un index route para la página de inicio */}
                    <Route index element={<Home />} />
                    
                    {/* Ahora, todas las rutas dinámicas son hijas de esta ruta principal */}
                    {dynamicRoutes}
                </Route>
                
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;