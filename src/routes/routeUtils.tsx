// src/utils/routeUtils.tsx

/* EL MAPA - lo toma permissions

=================
Lee el permissionsMap.ts (compartido) y lo procesa para generar las rutas dinámicas para el enrutador de React. 
Es una utilidad exclusiva del frontend.
=================



*/

import { permissionsMap, PermissionItem, ActionType } from '../../shared/config/permissions';
import { Fragment } from 'react'; // Necesario para envolver rutas anidadas
import { Route } from 'react-router-dom';

//import AdministracionUsuariosLayout from '../layouts/AdministracionUsuariosLayout';
import Home from '../pages/Home';
import ListaDeUsuarios from '../pages/Usuarios/ListaDeUsuarios';
import RolesYPermisos from '../pages/Usuarios/RoleList';

/**
 * Mapea los IDs de rutas a sus componentes correspondientes.
 * Esto evita importar componentes en el archivo de permisos.
 */
const routeComponentMap: { [key: string]: React.FC } = {
    'dashboard': Home,
    'users_module': ListaDeUsuarios,
    'roles_module': RolesYPermisos,
    // ... Agregar aquí todos los IDs de rutas del permissionsMap
    // y sus respectivos componentes.
};

/**
 * Genera recursivamente un árbol de rutas a partir del mapa de permisos.
 * Las rutas anidadas se renderizarán dentro de sus padres.
 * @param map El mapa de permisos, puede ser el principal o un sub-mapa.
 * @param userPermissions El array de permisos del usuario.
 */
export const generateRoutesFromMap = (map: { [key: string]: PermissionItem }, userPermissions: ActionType[]): JSX.Element[] => {
    return Object.keys(map).flatMap(key => {
        const item = map[key];
        const Component = routeComponentMap[item.id];
        
        // 1. Verificar si el usuario tiene permiso para ver el ítem
        const hasPermission = item.permissions.some(perm => userPermissions.includes(perm));
        if (!hasPermission || !item.path) {
            return []; // No tiene permiso o no es una ruta renderizable
        }

        // 2. Si tiene hijos, generar las rutas anidadas
        const nestedRoutes = item.children 
            ? generateRoutesFromMap(item.children, userPermissions) 
            : [];
        
        // 3. Devolver el componente <Route> correspondiente
        // Nota: se usa Fragment para devolver múltiples rutas en un array
        return (
            <Route key={item.id} path={item.path} element={<Component />}>
                {nestedRoutes}
            </Route>
        );
    });
};