// src/layouts/UsersLayout.tsx

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionContext';
import ResponsiveTabMenu from '../../components/ResponsiveTabMenu'; // <-- Nuevo componente
import './UsersLayout.css';

const UsersLayout = () => {
  const { hasPermission } = usePermissions();

 // Define las pestañas aquí
const tabs = [
  // 💡 Corrección: La ruta debe incluir el path del padre "administracion"
  { to: 'usuarioss/administracion/lista', label: 'Lista de Usuarios', permission: 'lista_usuarios' },
  { to: 'roles', label: 'Lista de Roles', permission: 'lista_roles' },
  { to: 'modulos', label: 'Lista de Módulos', permission: 'Lista_modulos' },
];

  return (
    <div className="users-layout-container">
      {/* Usamos el nuevo componente para mostrar las pestañas de forma responsiva */}
      <ResponsiveTabMenu>
        {tabs.map(tab =>
          hasPermission(tab.permission) && (
            <NavLink key={tab.to} to={tab.to}>
              {tab.label}
            </NavLink>
          )
        )}
      </ResponsiveTabMenu>
      <div className="users-content">
        <Outlet />
      </div>
    </div>
  );
};

export default UsersLayout;