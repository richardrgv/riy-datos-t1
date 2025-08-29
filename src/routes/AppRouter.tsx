// src/routes/AppRouter.tsx

/* Es el MOTOR - se encarga del enrutamiento
El objetivo de AppRouter es ser el orquestador central de la navegación de tu aplicación. 
🧭 Su única responsabilidad es definir la estructura de las rutas, 
asegurando que los componentes correctos se muestren en las URLs adecuadas, 
y que se apliquen las reglas de protección (como la autenticación) de manera uniforme.
*/

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import { useUser } from '../contexts/UserContext';
import { PermissionProvider, usePermissions } from '../contexts/PermissionContext';
import { permissionsMap } from '../../src-tauri/src/shared/config/permissions';
import { generateRoutesFromMap } from './routeUtils';

/* Importa todos tus componentes de página aquí
import Dashboard from '../pages/Dashboard';
import ListaDeUsuarios from '../pages/Usuarios/ListaDeUsuarios';
import RolesYPermisos from '../pages/Usuarios/RolesYPermisos';
*/
const AppRouter: React.FC = () => {
    const { user } = useUser();
    const userPermissions = usePermissions();

    // 1. Usamos el mapa de permisos para generar las rutas dinámicamente
    const protectedRoutes = generateRoutesFromMap(permissionsMap, userPermissions);

    return (
        <BrowserRouter>
            <Routes>
                {/* 1. Ruta pública de inicio de sesión */}
                <Route path="/login" element={<Login />} />
                
                {/* 2. Ruta principal protegida */}
                <Route element={user ? (
                    <PermissionProvider permissions={user.permissions}>
                        <MainLayout />
                    </PermissionProvider>
                ) : (
                    <Navigate to="/login" />
                )}>
                    {/* ⭐ Añadimos las rutas generadas dinámicamente aquí */}
                    {protectedRoutes}
                </Route>
                
                {/* 3. Ruta de fallback (404) */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;