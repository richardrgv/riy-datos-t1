// ResponsiveTabMenu.tsx
/*
This component's job is to check the screen size and decide whether 
to show a row of tabs or a dropdown menu. 
It's a "presentational" component because it receives 
the navigation links (its children) and just handles how to display them.
*/

// src/components/ResponsiveTabMenu.tsx

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import './ResponsiveTabMenu.css';

interface Tab {
  path: string;
  name: string;
}

interface ResponsiveTabMenuProps {
  tabs: Tab[];
}

const ResponsiveTabMenu: React.FC<ResponsiveTabMenuProps> = ({ tabs }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // ⭐ Detecta si la pantalla es menor a 768px (tamaño de tableta/móvil)
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Se ejecuta al cargar el componente
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  if (isMobile) {
    // ⭐ Si es móvil, renderiza el menú desplegable
    return (
      <div className="dropdown-menu-container">
        <button onClick={toggleDropdown} className="dropdown-toggle">
          Navegación
        </button>
        {isOpen && (
          <div className="dropdown-list">
            {tabs.map(tab => (
              <NavLink key={tab.path} to={tab.path} onClick={() => setIsOpen(false)}>
                {tab.name}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ⭐ Si es de escritorio, renderiza la barra de pestañas
  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}
        >
          {tab.name}
        </NavLink>
      ))}
    </div>
  );
};

export default ResponsiveTabMenu;