// src/layouts/AdministracionUsuariosLayout.tsx

import React, { useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import './AdministracionUsuariosLayout.css';

const AdministracionUsuariosLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // 💡 Definimos las pestañas con sus rutas
    const childTabs = [
        { name: 'Lista de Usuarios', path: '/usuarios/administracion/lista' },
        { name: 'Roles y Permisos', path: '/usuarios/administracion/roles' },
    ];

    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newPath = event.target.value;
        navigate(newPath); // Navega a la nueva ruta
    };

    return (
        <div className="administracion-usuarios-layout-container">
            {/* ⭐ Este contenedor agrupa el título y el dropdown */}
            <div className="header-tabs-container">
                <h2>Contenido de Administración de Usuarios</h2>
                <select value={location.pathname} onChange={handleSelectChange} className="tabs-dropdown">
                    {childTabs.map(tab => (
                        <option key={tab.path} value={tab.path}>{tab.name}</option>
                    ))}
                </select>
            </div>

            <div className="administracion-content-body">
                {/* 💡 Aquí se renderizarán los componentes hijos como ListaDeUsuarios */}
                <Outlet />
            </div>
        </div>
    );
};

export default AdministracionUsuariosLayout;