// src/components/ActionMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import './ActionMenu.css'; // Asegúrate de crear este archivo para los estilos

interface Action {
    label: string;
    onClick: () => void;
}

interface ActionMenuProps {
    actions: Action[];
}

const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="action-menu-container" ref={menuRef}>
            <button onClick={toggleMenu} className="action-menu-button">
                ...
            </button>
            {isOpen && (
                <div className="action-menu-list">
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                action.onClick();
                                setIsOpen(false); // Cierra el menú después de seleccionar
                            }}
                            className="action-menu-item"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActionMenu;