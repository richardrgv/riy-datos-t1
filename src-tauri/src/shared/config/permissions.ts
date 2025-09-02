// src/shared/config/permissions.ts

import { FaHome, FaCogs, FaDatabase, FaQuestionCircle } from 'react-icons/fa';
import { IconType } from 'react-icons';

// Tipo para las acciones de permisos individuales (ej. 'read', 'create')
export type ActionType = 'read' | 'create' | 'update' | 'delete' | 'export' | 'help';

// Tipo para los permisos de acción que tienen un ID y un nombre
export interface PermissionAction {
    id: string;
    permissions: ActionType[];
}

// Tipo para los nodos de menú o módulos que pueden tener un path, icono, y acciones
export interface PermissionItem {
    id: string;
    name: string;
    path?: string;
    icon?: IconType; // ⭐ El tipo ahora es IconType
    permissions: ActionType[];
    children?: { [key: string]: PermissionItem };
    actions?: { [key: string]: PermissionAction };
}


// Estructura adaptada para un menú de primer nivel más directo y escalable

export const permissionsMap = {
    //
    // MENÚ PRINCIPAL (PUNTOS DE ENTRADA DIRECTOS)
    //
    'dashboard': {
        id: 'dashboard',
        name: 'Inicio',
        path: '/dashboard',
        icon: FaHome, // ⭐ ¡Ahora es un componente!
        permissions: ['inicio', 'read'],
    },
    'system_administration_menu': {
        id: 'system_administration_menu',
        name: 'Administración del Sistema',
        path: '/administracion',
        icon: FaCogs, // ⭐ ¡Ahora es un componente!
        permissions: ['administracion'],
        children: {
            'users_module': {
                id: 'users_module',
                name: 'Usuarios',
                path: '/administracion/usuarios',
                //icon: 'FaUsers',
                permissions: ['lista_usuarios', 'create', 'update', 'delete', 'export'],
                actions: {
                    'button_add_user': { id: 'button_add_user', permissions: ['agregar_usuario'] },
                    'action_edit_user': { id: 'action_edit_user', permissions: ['editar_usuario'] },
                    'action_delete_user': { id: 'action_delete_user', permissions: ['delete'] },
                    'action_reset_password': { id: 'action_reset_password', permissions: ['update'] },
                    'action_export_users': { id: 'action_export_users', permissions: ['export'] },
                }
            },
            'roles_module': {
                id: 'roles_module',
                name: 'Roles',
                path: '/administracion/roles',
                //icon: 'FaUserTie',
                permissions: ['read', 'create', 'update', 'delete'],
            },
            'permissions_module': {
                id: 'permissions_module',
                name: 'Permisos',
                path: '/administracion/permisos',
                //icon: 'FaShieldAlt',
                permissions: ['read', 'update'],
            }
        }
    },
    'views_menu': {
        id: 'views_menu',
        name: 'Vistas de Datos',
        path: '/vistas',
        icon: FaDatabase, // ⭐ ¡Ahora es un componente!
        permissions: ['vistas'],
        children: {
            'views_management': {
                id: 'views_management',
                name: 'Gestión de Vistas',
                path: '/vistas/gestion',
                permissions: ['read', 'create', 'update', 'delete'],
            },
            'view_assignment': {
                id: 'view_assignment',
                name: 'Asignación de Vistas',
                path: '/vistas/asignacion',
                permissions: ['read', 'update'],
            },
            'row_security': {
                id: 'row_security',
                name: 'Seguridad de Fila',
                path: '/vistas/seguridad-fila',
                permissions: ['read', 'update'],
            },
            'ad_hoc_queries': {
                id: 'ad_hoc_queries',
                name: 'Consultas Ad-Hoc',
                path: '/vistas/consultas-ad-hoc',
                permissions: ['read', 'create'],
            },
        }
    },
    'help_menu': {
        id: 'help_menu',
        name: 'Ayuda y Soporte',
        path: '/help',
        icon: FaQuestionCircle, // ⭐ ¡Ahora es un componente!
        permissions: ['ayuda'],
        children: {
            'conceptual_help': {
                id: 'conceptual_help',
                name: 'Gestión de Ayudas',
                path: '/help/gestion',
                permissions: ['read', 'create', 'update', 'delete'],
            }
        }
    }
};
