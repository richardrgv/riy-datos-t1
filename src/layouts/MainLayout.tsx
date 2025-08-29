// src/layouts/MainLayout.tsx

/* Se encarga del diseño visual

para que solo se encargue del diseño (encabezado, pie de página, menú y área de contenido) 
y delegue la responsabilidad de renderizar las páginas a la etiqueta <Outlet> de React Router.

El componente <Outlet /> es el que hace que las rutas anidadas funcionen. 
Cuando AppRouter renderiza el MainLayout para la ruta /, 
el <Outlet /> en MainLayout se llena con el componente de la ruta hija, como Home.tsx.
*/
// src/layouts/MainLayout.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import Menu from '../components/Menu';
import { findTitleByPath } from '../utils/titleUtils';
import './MainLayout.css';

const MainLayout: React.FC = () => {
    const [childTabs, setChildTabs] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 768);
    const [windowTitle, setWindowTitle] = useState('Mi Aplicación');
    const location = useLocation();
    const navigate = useNavigate();

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

    return (
        <div className="main-layout-container">
             {/* ⭐ El sidebar ahora es el contenedor principal del menú */}
            <aside className={`sidebar ${isMenuOpen ? '' : 'closed'}`}>
                {/* ⭐ Título condicional del menú */}
                <div className="menu-header">
                    {isMenuOpen ? 'Menú Principal' : 'Menú'}
                </div>
                {/* Pasamos el estado al componente Menu */}
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
                    {/* ⭐ Pasa el estado y las funciones al componente hijo */}
                    <Outlet context={{ setChildTabs, setSelectedValue }} />
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