// src/components/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Menu from './Menu';
import ProtectedRoute from './ProtectedRoute';
import Forbidden from '../pages/Forbidden';
import { getProtectedRoutes } from '../utils/routeUtils';
import { findTitleByPath } from '../utils/titleUtils';
import './MainLayout.css';

const MainLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [windowTitle, setWindowTitle] = useState('Mi Aplicación');
  
  const location = useLocation();
  
  const protectedRoutes = getProtectedRoutes();
  const forbiddenRoute = { path: '/acceso-denegado', element: <Forbidden /> };

  useEffect(() => {
    const newTitle = findTitleByPath(location.pathname);
    setWindowTitle(newTitle);
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="main-layout-container">
      {isMenuOpen && (
        <aside className="sidebar">
          <div className="menu-header">Menú Principal</div>
          <Menu />
        </aside>
      )}

      <main className="content-area">
        <header className="content-header">
          <button onClick={toggleMenu} className="menu-toggle-button">
            {isMenuOpen ? 'Cerrar Menú' : 'Abrir Menú'}
          </button>
          <h1>{windowTitle}</h1>
        </header>

        <div className="content-body">
          <Routes>
            {protectedRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute requiredPermission={route.permission!}>
                    {route.element}
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path={forbiddenRoute.path} element={forbiddenRoute.element} />
            <Route path="*" element={<div>Selecciona una opción del menú.</div>} />
          </Routes>
        </div>

        <footer className="app-footer">
          © 2025 Mi Aplicación | Todos los derechos reservados.
          <span className="footer-separator">|</span>
          <a href="#" className="footer-link">Acerca del aplicativo</a>
        </footer>
      </main>
    </div>
  );
};

export default MainLayout;