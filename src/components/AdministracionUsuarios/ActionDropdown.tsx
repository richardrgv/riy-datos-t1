// src/components/AdministracionUsuarios/ActionDropdown.tsx
import React, { useState } from 'react';
import { usePermissions } from '../../contexts/PermissionContext';
import './ActionDropdown.css';

interface Props {
    user: any;
    onEdit: (user: any) => void;
    onViewDetails: (user: any) => void;
}

const ActionDropdown: React.FC<Props> = ({ user, onEdit, onViewDetails }) => {
    const { hasPermission } = usePermissions();
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleEdit = () => {
        onEdit(user);
        setIsOpen(false);
    };

    const handleViewDetails = () => {
        onViewDetails(user);
        setIsOpen(false);
    };

    // Permisos simulados para la demostración
    const canEdit = hasPermission('editar_usuario');
    const canView = hasPermission('ver_detalle_usuario');
    const canDelete = hasPermission('eliminar_usuario');

    return (
        <div className="action-dropdown">
            <button className="action-toggle-button" onClick={toggleDropdown}>
                ...
            </button>
            {isOpen && (
                <div className="dropdown-menu">
                    {canEdit && <div onClick={handleEdit}>Editar</div>}
                    {canView && <div onClick={handleViewDetails}>Detalles</div>}
                    {canDelete && <div>Eliminar</div>}
                </div>
            )}
        </div>
    );
};

export default ActionDropdown;