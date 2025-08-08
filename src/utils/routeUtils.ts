// src/utils/routeUtils.ts
import { menuStructure, MenuItem } from '../data/menuStructure';
import { PermissionKey } from '../types/permissions'; // Asegúrate de que esta ruta sea correcta

// Define una interfaz más limpia para las rutas que se usarán en el router
export interface RouteDefinition {
  path: string;
  element: React.ReactNode;
  permission: PermissionKey;
}

// Función para aplanar el árbol de menú y obtener solo las rutas
const findRoutes = (items: MenuItem[], routes: RouteDefinition[]): void => {
  items.forEach(item => {
    // Solo si tiene path, element y permission, lo agregamos como ruta protegida
    if (item.path && item.element && item.permission) {
      routes.push({
        path: item.path,
        element: item.element,
        permission: item.permission as PermissionKey,
      });
    }
    // Si tiene hijos, recorre recursivamente
    if (item.children) {
      findRoutes(item.children, routes);
    }
  });
};

export const getProtectedRoutes = (): RouteDefinition[] => {
  const routes: RouteDefinition[] = [];
  findRoutes(menuStructure, routes);
  return routes;
};