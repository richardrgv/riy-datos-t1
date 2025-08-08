// src/components/DropdownSubmenu.tsx
import React, { useState, useEffect } from 'react';
import { usePermissions } from '../contexts/PermissionContext';
import './DropdownSubmenu.css';

interface SubmenuItem {
  id: string;
  title: string;
  component: React.ReactNode;
  permission?: string;
}

interface DropdownSubmenuProps {
  submenuData: SubmenuItem[];
}

const DropdownSubmenu: React.FC<DropdownSubmenuProps> = ({ submenuData }) => {
  const { hasPermission } = usePermissions();
  
  // ¡Cambiamos la lógica aquí! Filtramos para mostrar solo los que tienen permiso.
  const filteredData = submenuData.filter(item => 
    !!item.permission && hasPermission(item.permission)
  );
  
  const [activeItem, setActiveItem] = useState<SubmenuItem | null>(null);

  useEffect(() => {
    if (filteredData.length > 0 && !activeItem) {
      setActiveItem(filteredData[0]);
    } else if (filteredData.length === 0 && activeItem) {
        // Esto maneja el caso en que se quita el permiso de la pestaña activa
        setActiveItem(null);
    } else if (activeItem && !filteredData.find(item => item.id === activeItem.id)) {
        // Esto también maneja el caso en que la pestaña activa ya no está en la lista filtrada
        setActiveItem(filteredData[0] || null);
    }
  }, [filteredData, activeItem]);

  if (filteredData.length === 0) {
    return <div>No tienes permisos para ver ninguna opción en este menú.</div>;
  }

  if (filteredData.length === 1) {
    return (
      <>
        <h3>{filteredData[0].title}</h3>
        <div>{filteredData[0].component}</div>
      </>
    );
  }

  return (
    <div className="submenu-container">
      <select 
        value={activeItem?.id} 
        onChange={(e) => setActiveItem(filteredData.find(item => item.id === e.target.value) || null)}
        className="submenu-select"
      >
        {filteredData.map(item => (
          <option key={item.id} value={item.id}>{item.title}</option>
        ))}
      </select>
      <div className="submenu-content">
        {activeItem?.component}
      </div>
    </div>
  );
};

export default DropdownSubmenu;