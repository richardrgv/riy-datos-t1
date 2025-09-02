// src/routes/AppRouter.tsx

/* Es el MOTOR - se encarga del enrutamiento
El objetivo de AppRouter es ser el orquestador central de la navegación de tu aplicación. 
🧭 Su única responsabilidad es definir la estructura de las rutas, 
asegurando que los componentes correctos se muestren en las URLs adecuadas, 
y que se apliquen las reglas de protección (como la autenticación) de manera uniforme.
*/

// src/routes/AppRouter.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import { useUser } from '../contexts/UserContext';
import { PermissionProvider } from '../contexts/PermissionContext';

const AppRouter: React.FC = () => {
    // ⭐ Obtén los permisos directamente del hook, ya que tu UserContext los provee
    const { user, permissions } = useUser();
 
    // ⭐ Punto de depuración: Aquí se reciben los permisos desde el contexto del usuario.
    console.log("Permisos asignados al usuario:", permissions);

    return (
        <BrowserRouter>
            <Routes>
                {/* 1. Ruta pública de inicio de sesión */}
                <Route path="/login" element={<Login />} />

                {/* 2. El proveedor de permisos envuelve el MainLayout */}
                <Route
                    path="/*" // ⭐ Captura todas las rutas bajo un solo punto de entrada
                    element={
                        user ? (
                            <PermissionProvider permissions={permissions}>
                                <MainLayout />
                            </PermissionProvider>
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
                
                {/* 3. Ruta de fallback (404) */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;