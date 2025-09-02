// src/layouts/MainLayout.tsx

/* Se encarga del diseño visual

para que solo se encargue del diseño (encabezado, pie de página, menú y área de contenido) 
y delegue la responsabilidad de renderizar las páginas a la etiqueta <Outlet> de React Router.

El componente <Outlet /> es el que hace que las rutas anidadas funcionen. 
Cuando AppRouter renderiza el MainLayout para la ruta /, 
el <Outlet /> en MainLayout se llena con el componente de la ruta hija, como Home.tsx.
*/

// src/layouts/MainLayout.tsx (Modificado)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Outlet, useNavigate, Routes, Route } from 'react-router-dom';
import Menu from '../components/Menu';
import { findTitleByPath } from '../utils/titleUtils';
import { usePermissions } from '../contexts/PermissionContext';
import { permissionsMap } from '../../src-tauri/src/shared/config/permissions';
import { generateRoutesFromMap } from '../routes/routeUtils';
import './MainLayout.css';

const MainLayout: React.FC = () => {
    const [childTabs, setChildTabs] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 768);
    const [windowTitle, setWindowTitle] = useState('Mi Aplicación');
    const location = useLocation();
    const navigate = useNavigate();
    const { permissions } = usePermissions(); // ⭐ Obtén los permisos aquí

    const [selectedValue, setSelectedValue] = useState('');

    useEffect(() => {
        const newTitle = findTitleByPath(location.pathname);
        setWindowTitle(newTitle);
    }, [location.pathname]);

    useEffect(() => {
        const handleResize = () => {
            setIsMenuOpen(window.innerWidth > 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const showDropdown = childTabs && childTabs.length > 0;
    
    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newPath = event.target.value;
        setSelectedValue(newPath);
        navigate(newPath);
    };

    const selectDropdown = (
        <select value={selectedValue} onChange={handleSelectChange}>
            {showDropdown && childTabs.map((tab: { name: string, path: string }) => (
                <option key={tab.path} value={tab.path}>{tab.name}</option>
            ))}
        </select>
    );

    // ⭐ Generamos las rutas protegidas para renderizar aquí
    const protectedRoutes = generateRoutesFromMap(permissionsMap, permissions);

    return (
        <div className="main-layout-container">
            <aside className={`sidebar ${isMenuOpen ? '' : 'closed'}`}>
                <div className="menu-header">
                    {isMenuOpen ? 'Menú Principal' : 'Menú'}
                </div>
                <Menu isMenuOpen={isMenuOpen} />
            </aside>
            <main className="content-area">
                <header className="content-header">
                    <button onClick={toggleMenu} className="menu-toggle-button">
                        {isMenuOpen ? 'Cerrar Menú' : 'Abrir Menú'}
                    </button>
                    <h1>{windowTitle}</h1>
                    {showDropdown && (
                        <div className="header-right-content-wrapper">
                            {selectDropdown}
                        </div>
                    )}
                </header>
                <div className="content-body">
                    {/* ⭐ Aquí se renderizarán las rutas dinámicas */}
                    <Routes>
                        {protectedRoutes}
                    </Routes>
                </div>
                <footer>
                    © 2025 RIY Datos | Todos los derechos reservados.
                    <span className="footer-separator">|</span>
                    <a href="#" className="footer-link">Acerca del aplicativo</a>
                </footer>
            </main>
        </div>
    );
};

export default MainLayout;