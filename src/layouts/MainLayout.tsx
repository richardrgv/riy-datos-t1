// src/layouts/MainLayout.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import Menu from '../components/Menu';
import { findTitleByPath } from '../utils/titleUtils';
import { usePermissions } from '../contexts/PermissionContext';
import { useTitle } from '../contexts/TitleContext'; // ⭐ Nuevo
import './MainLayout.css';
import { FaBars } from 'react-icons/fa';
import ReactDOM from 'react-dom'; // ⭐ Importamos ReactDOM ⭐

const MainLayout: React.FC = () => {
    const [childTabs, setChildTabs] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 768);
    //const [windowTitle, setWindowTitle] = useState('Mi Aplicación');
    const location = useLocation();
    const navigate = useNavigate();
    const { permissions } = usePermissions();
    const { title, setTitle } = useTitle(); // ⭐ Obtenemos el título y la función del contexto
    const [selectedValue, setSelectedValue] = useState('');
    // ⭐ Nuevo estado para el tooltip del botón ⭐
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    // ⭐ Referencia para el botón del menú ⭐
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });


    useEffect(() => {
        const newDocTitle = findTitleByPath(location.pathname);
        document.title = newDocTitle; // Puedes usarlo para el título de la pestaña del navegador
        //setWindowTitle(newTitle);
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

    // ⭐ Manejadores del mouse para el botón del menú ⭐
    const handleMouseEnter = () => {
        setIsButtonHovered(true);
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Posicionamos el tooltip a la derecha del botón
            setTooltipPosition({
                top: rect.top + rect.height / 2,
                left: rect.left + rect.width + 10 // 10px de separación
            });
        }
    };

    const handleMouseLeave = () => {
        setIsButtonHovered(false);
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
            <aside className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
                <div className="menu-header">
                    {isMenuOpen ? 'Menú Principal' : 'Menú'}
                </div>
                <Menu isMenuOpen={isMenuOpen} toggleMenu={toggleMenu} />
            </aside>
            <main className="content-area">
                <header className="content-header">
                    {/* ⭐ Añadimos ref y manejadores de eventos al botón ⭐ */}
                    <button
                        ref={buttonRef}
                        onClick={toggleMenu}
                        className="menu-toggle-button"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <FaBars />
                    </button>
                    {/* ⭐ Condición para mostrar el tooltip con Portal ⭐ */}
                    {isButtonHovered && ReactDOM.createPortal(
                        <span 
                            className="toggle-button-tooltip" 
                            style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
                        >
                            {isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                        </span>,
                        document.body
                    )}
                    <h1>{title}</h1>
                    {showDropdown && (
                        <div className="header-right-content-wrapper">
                            {selectDropdown}
                        </div>
                    )}
                </header>
                <div className="content-body">
                    <Outlet />
                </div>
                <footer className="app-footer">
                    © 2025 RIY Datos | Todos los derechos reservados.
                    <span className="footer-separator">|</span>
                    <a href="#" className="footer-link">Acerca del aplicativo</a>
                </footer>
            </main>
        </div>
    );
};

export default MainLayout;