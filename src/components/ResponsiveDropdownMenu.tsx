// src/components/ResponsiveDropdownMenu.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './ResponsiveDropdownMenu.css';

interface Tab {
    path: string;
    name: string;
}

interface DropdownProps {
    tabs: Tab[];
    currentTabName?: string;
    isOpen: boolean; // ⭐ Nueva prop para el estado del dropdown
    setIsOpen: (isOpen: boolean) => void; // ⭐ Nueva prop para la función de cambio de estado
}

const ResponsiveDropdownMenu: React.FC<DropdownProps> = ({ tabs, currentTabName, isOpen, setIsOpen }) => {
    return (
        <div className="dropdown-menu">
            {/* El botón ahora utiliza la función setIsOpen que viene de MainLayout */}
            <button onClick={() => setIsOpen(!isOpen)} className="dropdown-toggle">
                {currentTabName || 'Seleccionar...'}
                <span className="dropdown-arrow">▼</span>
            </button>
            {/* El menú se muestra u oculta basándose en la prop isOpen */}
            {isOpen && (
                <div className="dropdown-content">
                    {tabs.map(tab => (
                        <NavLink key={tab.path} to={tab.path} onClick={() => setIsOpen(false)} className="dropdown-item">
                            {tab.name}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResponsiveDropdownMenu;