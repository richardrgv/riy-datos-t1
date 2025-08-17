// src/components/Menu.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { menuStructure, MenuItem } from '../data/menuStructure.tsx';
import { usePermissions } from '../contexts/PermissionContext';
import './Menu.css';

const Menu = () => {
  const { hasPermission } = usePermissions();
  const [openTitles, setOpenTitles] = useState<string[]>([]);

  const toggleTitle = (id: string) => {
    setOpenTitles(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const renderMenuItem = (item: MenuItem) => {
    // Si es un "titulo" (un menú con sub-ítems)
    if (item.isTitle && item.children) {
      // Filtramos los hijos para mostrar solo los que tienen permiso
      const visibleChildren = item.children.filter(child => 
        // ¡Cambiamos la lógica aquí! Solo se muestra si tiene un permiso Y el usuario lo tiene.
        !!child.permission && hasPermission(child.permission)
      );

      // Si no hay hijos visibles, no mostramos el menú padre
      if (visibleChildren.length === 0) {
        return null;
      }

      const isOpen = openTitles.includes(item.id);
      return (
        <div key={item.id}>
          <div className="menu-item-title" onClick={() => toggleTitle(item.id)}>
            <span>{item.title}</span>
            <span>{isOpen ? '▲' : '▼'}</span>
          </div>
          {isOpen && (
            <div className="sub-menu">
              {visibleChildren.map(child => renderMenuItem(child))}
            </div>
          )}
        </div>
      );
    }
    // Si es un enlace directo
    else if (!item.isTitle) {
      // Aplicamos la misma lógica estricta
      if (!!item.permission && hasPermission(item.permission)) {
        return (
          <Link key={item.id} to={item.path || '#'} className="menu-item">
            {item.title}
          </Link>
        );
      }
    }
    
    // Cualquier otro caso (un ítem sin permiso) no se renderiza
    return null;
  };

  return (
    <nav className="menu-nav">
      {menuStructure.map(renderMenuItem)}
    </nav>
  );
};

export default Menu;