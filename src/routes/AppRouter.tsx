// src/routes/AppRouter.tsx

/* 
Antes de usar Micrsoft 365 lo logic esra que por aca caia allogin
=====
Entiendo perfectamente tu configuración. 
Tu AppRouter utiliza un flujo tradicional de autenticación basada en el estado de React 
(user del UserContext) y redirige a la ruta /login si el usuario no está autenticado.

2025-09-25
==========
pero ahora con la inclusión de MSAL seria:
El desafío ahora es unificar el flujo de MSAL (Microsoft 365)
con tu flujo existente de AppRouter de la siguiente manera:
1. El App.tsx debe mostrar el botón de Login de Microsoft.
2. Una vez el usuario se autentica con Microsoft, el AppRouter debe tomar el control.
3. Pero el AppRouter solo conoce el usuario si está en el UserContext.
*/

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // BrowserRouter
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
        //<BrowserRouter>
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
        //</BrowserRouter>
    );
};

export default AppRouter;