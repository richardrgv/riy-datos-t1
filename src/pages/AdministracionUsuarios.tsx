// src/pages/AdministracionUsuarios.tsx
import React from 'react';
//import Tabs from '../components/Tabs';
import DropdownSubmenu from '../components/DropdownSubmenu'; // <-- IMPORTA el nuevo componente

import ListaDeUsuariosContent from './ListaDeUsuariosContent';
import ListaDeModulosContent from './ListaDeModulosContent';
import ListaDeRolesContent from './ListaDeRolesContent';

// Los datos de las pestañas apuntan a los nuevos componentes
//const administracionTabsData = [
const administracionSubmenuData = [
  { id: 'usuarios', title: 'Lista de Usuarios', component: <ListaDeUsuariosContent />,
    permission: 'lista_usuarios' // <-- Permiso para esta pestaña
   },
  { id: 'modulos', title: 'Lista de Módulos', component: <ListaDeModulosContent />,
    permission: 'lista_modulos' // <-- Permiso para esta pestaña
   },
  { id: 'roles', title: 'Lista de Roles', component: <ListaDeRolesContent />,
    permission: 'lista_roles' // <-- Permiso para esta pestaña
   },
];

const AdministracionUsuarios = () => {
  //return <Tabs tabsData={administracionTabsData} />;
  return <DropdownSubmenu submenuData={administracionSubmenuData} />;
};

export default AdministracionUsuarios;