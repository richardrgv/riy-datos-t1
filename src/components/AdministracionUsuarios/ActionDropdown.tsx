// src/components/AdministracionUsuarios/ActionDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { usePermissions } from '../../contexts/PermissionContext';
import './ActionDropdown.css';

// Define la estructura de datos del usuario, que coincide con tu modelo de Rust
interface Usuario {
  usuario_id: number;
  usuario: string;
  nombre: string;
  correo: string;
  estado: string;
  autor: string;
  fecha_creacion: string;
  modificado_por: string | null;
  fecha_modificacion: string | null;
  codigo_verificacion: number | null;
  fecha_codigo_verificacion: string | null;
}

interface ActionDropdownProps {
  user: Usuario;
  onEdit: (user: Usuario) => void; // <-- Debe existir esta línea
  onViewDetails: (user: Usuario) => void; // <-- NUEVO: Prop para abrir el modal de detalles
}

// CORRECCIÓN 1: Recibe la prop 'onEdit' en los parámetros
// CORRECCIÓN: Asegúrate de desestructurar todas las props que necesitas
const ActionDropdown: React.FC<ActionDropdownProps> = ({ user, onEdit, onViewDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const dropdownRef = useRef<HTMLDivElement>(null);


  //const toggleDropdown = () => setIsOpen(!isOpen);
  const toggleDropdown = () => {
  console.log("El botón de puntos suspensivos fue clickeado. Estado actual: ", isOpen);
    setIsOpen(!isOpen);
    };

  // Cierra el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Aquí iría la lógica para las acciones
  // CORRECCIÓN 2: Llama a la prop 'onEdit' al hacer clic
  const handleEdit = () => {
    onEdit(user); // <-- Esto es lo que abre el modal en el padre
    setIsOpen(false);
    console.log(`Editar usuario: ${user.usuario_id}`);
  };
  /*
  const handleView = () => {
    setIsOpen(false);
    console.log(`Ver usuario: ${user.usuario_id}`);
    // Aquí invocaremos el comando de Tauri para eliminar
  };
  */
  // NUEVO: Handler para ver los detalles del usuario
  const handleViewDetails = () => {
    onViewDetails(user);
    setIsOpen(false);
    console.log(`Ver detalles del usuario: ${user.usuario_id}`);
  };

  // Puedes añadir más funciones para otras acciones
  const handleRol = () => {
    setIsOpen(false);
    console.log(`Roles usuario: ${user.usuario_id}`);
    // Aquí invocaremos el comando de Tauri para roles
  };
  const handleViews = () => {
    setIsOpen(false);
    console.log(`Vistas usuario: ${user.usuario_id}`);
    // Aquí invocaremos el comando de Tauri para vistas
  };

  // No renderizar si el usuario no tiene permisos para ninguna acción
    // La condición para renderizar el botón debe incluir todos los permisos de fila
  const canPerformActions = (
    hasPermission('editar_usuario') ||
    hasPermission('ver_usuario') ||
    hasPermission('roles_usuario') ||
    hasPermission('vistas_usuario')
  );
  if (!canPerformActions) {
    return null;
  }

  return (
    <div className="action-dropdown-container" ref={dropdownRef}>
      <button className="action-toggle-button" onClick={toggleDropdown}>
        ...
      </button>
      {isOpen && (
        <div className="action-dropdown-menu">
          {hasPermission('editar_usuario') && (
            <button onClick={handleEdit}>Editar</button>
          )}
          {hasPermission('ver_usuario') && (
            /*<button onClick={handleView}>Ver</button>*/
            // NUEVO: Botón para ver los detalles del usuario
            <button onClick={handleViewDetails}>Ver Detalles</button>
          )}
          {hasPermission('roles_usuario') && (
            <button onClick={handleRol}>Roles</button>
          )}
          {hasPermission('vistas_usuario') && (
            <button onClick={handleViews}>Vistas</button>
          )}
          {/* Aquí irían los otros botones, como 'Resetear Contraseña' */}
        </div>
      )}
    </div>
  );
};

export default ActionDropdown;