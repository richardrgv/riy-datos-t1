// src/data/menuStructure.ts
import MenuList from '../components/MenuList';
 //import AdministracionUsuarios from '../pages/Usuarios/AdministracionUsuarios';
// Importa aquí todos los demás componentes de páginas


export interface MenuItem {
  id: string;
  title: string;
  path?: string;
  isTitle?: boolean;
  children?: MenuItem[];
  permission?: string; // <-- Nuevo campo para el permiso
  element?: React.ReactNode; // <-- Nuevo: El componente a renderizar
} 

export const menuStructure: MenuItem[] = [];
/*  {
    id: 'usuarios',
    title: 'USUARIOS',
    isTitle: true,
    children: [
      { id: 'administracion_usuarios', title: 'Administración de usuarios', 
        path: '/usuarios/administracion',
        permission: 'administrar_usuarios', // <-- ¡Aquí está la conexión!
        element: <AdministracionUsuarios />,
      },
    ]
  },
  {
    id: 'vistas',
    title: 'VISTAS',
    isTitle: true,
    children: [
      { id: 'vistas.mis_vistas', title: 'Mis vistas', path: '/vistas/mis_vistas',
        permission: 'mis_vistas'
       },
      { id: 'vistas.todas_las_vistas', title: 'Todas las vistas', path: '/vistas/todas',
        permission: 'todas_las_vistas'
       }
    ]
  },
  {
    id: 'seguridad_fila',
    title: 'SEGURIDAD POR FILA',
    isTitle: true,
    children: [
      { id: 'seguridad_fila.valores', title: 'Valores por Concepto y Usuario', path: '/seguridad/valores',
        permission: 'sxf_valores'
       },
      { id: 'seguridad_fila.vistas', title: 'Vistas por Concepto', path: '/seguridad/vistas_concepto' },
      { id: 'seguridad_fila.conceptos', title: 'Lista de Conceptos', path: '/seguridad/conceptos' }
    ]
  },
  {
    id: 'consultas',
    title: 'CONSULTAS',
    isTitle: true,
    children: [
      { id: 'consultas.mis_consultas', title: 'Mis consultas', path: '/consultas/mis_consultas',
        permission: 'mis_consultas'
       },
      { id: 'consultas.todas_las_consultas', title: 'Todas las consultas', path: '/consultas/todas',
        permission: 'todas_las_consultas'
       }
    ]
  },
  {
    id: 'administrar_ayudas',
    title: 'ADMINISTRAR AYUDAS',
    isTitle: true,
    children: [
      { id: 'administrar_ayudas.lista', title: 'Lista de ayudas', path: '/ayudas/lista' }
    ]
  },
  {
    id: 'menus',
    title: 'ADMINISTRAR MENUS',
    isTitle: true,
    children: [
      { id: 'menus.lista_menus', title: 'Menú', path: '/menus/lista_menus',
        permission: 'lista_menus'
       },
    ]
  }
];
*/