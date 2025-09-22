// src/utils/routeUtils.tsx

/* EL MAPA - lo toma permissions

=================
Lee el permissionsMap.ts (compartido) y lo procesa para generar las rutas dinámicas para el enrutador de React. 
Es una utilidad exclusiva del frontend.
=================


*/
// src/routes/routeUtils.tsx

import React from 'react';
import { Route } from 'react-router-dom'; // ⭐ Importamos Outlet
import { PermissionItem, ActionType } from '../../src-tauri/src/shared/config/permissions';

// Importa todos los componentes que usarás en tus rutas
import Home from '../pages/Home';
import ListaDeUsuarios from '../pages/Usuarios/ListaDeUsuarios';
import RolesYPermisos from '../pages/Usuarios/RoleList';
import GenericPage from '../pages/GenericPage';
import GenericPage2 from '../pages/GenericPage2';
import GenericPage3 from '../pages/GenericPage3';
import GenericPage4 from '../pages/GenericPage4';
import GenericPage5 from '../pages/GenericPage5'; //
import EmptyPage from '../pages/EmptyPage';

/* ⭐ Nueva función de ayuda para obtener un path relativo ⭐
const getRelativePath = (path: string | undefined): string | undefined => {
    if (path && path.startsWith('/')) {
        return path.substring(1);
    }
    return path;
};
*/

/**
 * Mapea los IDs de rutas a sus componentes correspondientes.
 */
const routeComponentMap: { [key: string]: React.ComponentType<any> } = {
    'dashboard': Home,
    'system_administration_menu': EmptyPage,
    'users_module': ListaDeUsuarios,
    'roles_module': RolesYPermisos,
    'views_menu': GenericPage,
    'views_management': GenericPage2,
    'view_assignment': GenericPage3,
    'row_security': GenericPage4,
    'ad_hoc_queries': GenericPage5,
    'help_menu': GenericPage,
};

/**
 * Genera recursivamente un árbol de rutas a partir del mapa de permisos.
 * @param map El mapa de permisos, puede ser el principal o un sub-mapa.
 * @param userPermissions El array de permisos del usuario.
 */
export const generateRoutesFromMap = (map: { [key: string]: PermissionItem }, userPermissions: ActionType[]): JSX.Element[] => {
    return Object.keys(map).flatMap(key => {
        const item = map[key];
        const Component = routeComponentMap[item.id];
        
        // La condición de permiso debe ser flexible para padres sin path
        const hasPermission = item.permissions.some(perm => userPermissions.includes(perm)) || (item.children && Object.values(item.children).some(child => child.permissions.some(perm => userPermissions.includes(perm))));
        
        if (!hasPermission) {
            return []; // No tiene permiso para este ítem ni para sus hijos
        }

        const nestedRoutes = item.children 
            ? generateRoutesFromMap(item.children, userPermissions) 
            : [];
        
        // Si el ítem no tiene un path, solo devolvemos las rutas anidadas.
        if (!item.path || !Component) {
            return nestedRoutes;
        }

        let element;
        /* if (item.id === 'views_menu' || item.id === 'views_management' || item.id === 'view_assignment' || item.id === 'row_security' || item.id === 'ad_hoc_queries') {
            element = <Component title={item.name} />;
        } else {
            element = <Component />;
        } */
        element = <Component />;
        // ⭐ AÑADE ESTE CONSOLE.LOG ⭐
        console.log(`RUTA GENERADA: path='${item.path}', id='${item.id}', component='${Component.name}', tiene hijos: ${nestedRoutes.length > 0}`);


        // El path es absoluto, ya que la ruta padre en AppRouter es /*
        return (
            <Route key={item.id} path={item.path} element={element}>
                {nestedRoutes}
            </Route>
            /*<Route 
                key={item.id} 
                // ⭐ AHORA USAMOS LA FUNCIÓN PARA HACER EL PATH RELATIVO ⭐
                path={getRelativePath(item.path)} 
                element={element}
            ></Route>*/
        );
    });
};