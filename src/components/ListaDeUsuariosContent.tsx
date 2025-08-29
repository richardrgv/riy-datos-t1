// src/pages/Usuarios/ListaDeUsuariosContent.tsx
import React, { useState, useEffect } from 'react';
import { getUsers, addUser, updateUser } from '../utils/api-service';
import { usePermissions } from '../contexts/TemporaryPermissionContext';
import './ListaDeUsuariosContent.css';
import ActionMenu from './ActionMenu';
//import ActionDropdown from './AdministracionUsuarios/ActionDropdown';
import ERPUserSearch from './ERPUserSearch';
import DataForm from './DataForm';
import DetailsModal from './DetailsModal';
import { CustomApiError } from '../utils/api-client';
import { useUser } from '../contexts/UserContext';

// Define la estructura de datos del usuario
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

// Define la estructura de datos para la búsqueda en ERP
interface UserSearchResult {
    usuario: string;
    nombre: string;
}

const addFields = [
    { name: 'usuario', label: 'Usuario', type: 'text', disabled: true },
    { name: 'nombre', label: 'Nombre', type: 'text', disabled: true },
    { name: 'correo', label: 'Correo', type: 'email', disabled: false },
    { name: 'estado', label: 'Estado', type: 'text', disabled: true },
];

const editFields = [
    { name: 'usuario', label: 'Usuario', type: 'text', disabled: true },
    { name: 'nombre', label: 'Nombre', type: 'text', disabled: true },
    { name: 'correo', label: 'Correo', type: 'email', disabled: false },
    {
        name: 'estado',
        label: 'Estado',
        type: 'select',
        options: [
            { value: 'Vigente', label: 'Vigente' },
            { value: 'Inactivo', label: 'Inactivo' }
        ],
        disabled: false
    },
];

type AddUserFlow = 'initial' | 'search_erp' | 'fill_data';

const ListaDeUsuariosContent = () => {
    const { token } = useUser();
    const { hasPermission } = usePermissions();
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [addUserFlow, setAddUserFlow] = useState<AddUserFlow>('initial');
    const [selectedERPUser, setSelectedERPUser] = useState<UserSearchResult | null>(null);
    const [userToEdit, setUserToEdit] = useState<Usuario | null>(null);
    const [userToViewDetails, setUserToViewDetails] = useState<Usuario | null>(null);
    const [apiError, setApiError] = useState('');
    const [addFormData, setAddFormData] = useState<Partial<Usuario>>({});

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const result = await getUsers(token);
            setUsers(result);
            setError(null);
        } catch (e) {
            console.error("Error al obtener usuarios:", e);
            setError("Error al cargar la lista de usuarios.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const handleAddUser = () => {
        setApiError(null);
        setAddFormData({});
        setAddUserFlow('search_erp');
    };

    const handleERPUserSelected = (erpUser: UserSearchResult) => {
        setSelectedERPUser(erpUser);
        setAddUserFlow('fill_data');
        setAddFormData({
            usuario: erpUser.usuario,
            nombre: erpUser.nombre,
            correo: '',
            estado: 'Vigente',
        });
    };

    const handleCancelAddUser = () => {
        setAddUserFlow('initial');
        setSelectedERPUser(null);
        setAddFormData({});
        setApiError(null);
    };

    const validateFormData = (data: Partial<Usuario>) => {
        const errors: string[] = [];
        if (!data.correo || data.correo.trim() === '') {
            errors.push("El correo es un campo obligatorio.");
        }
        if (data.correo && !data.correo.includes('@')) {
            errors.push("El formato del correo es inválido.");
        }
        return errors;
    };

    const handleAddFormSave = async (formData: Partial<Usuario>) => {
        setApiError(null);
        try {
            const validationErrors = validateFormData(formData);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join('\n'));
            }
            await addUser({
                usuario: formData.usuario,
                nombre: formData.nombre,
                correo: formData.correo
            });
            await fetchUsers();
            setAddUserFlow('initial');
            setSelectedERPUser(null);
            setAddFormData({});
        } catch (e) {
            console.error("Error en handleAddFormSave:", e);
            if (e instanceof CustomApiError) {
                setApiError(e.message);
            } else if (e instanceof Error) {
                setApiError(e.message);
            } else {
                setApiError("Ocurrió un error inesperado.");
            }
        }
    };

    if (loading) {
        return <div>Cargando usuarios...</div>;
    }
    if (error) {
        return <div className="error">{error}</div>;
    }

    const handleEditUser = (user: Usuario) => {
        setApiError(null);
        setUserToEdit(user);
    };

    const handleCloseEditModal = () => {
        setUserToEdit(null);
    };

    const handleUpdateUserSave = async (data: Partial<Usuario>) => {
        setApiError(null);
        try {
            const validationErrors = validateFormData(data);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join('\n'));
            }
            await updateUser({
                usuarioId: data.usuario_id,
                correo: data.correo,
                estado: data.estado
            });
            await fetchUsers();
            handleCloseEditModal();
        } catch (e) {
            if (e instanceof CustomApiError) {
                setApiError(e.message);
            } else if (e instanceof Error) {
                setApiError(e.message);
            } else {
                setApiError("Ocurrió un error inesperado.");
            }
        }
    };

    const handleViewDetails = (user: Usuario) => {
        setUserToViewDetails(user);
    };

    const handleCloseDetailsModal = () => {
        setUserToViewDetails(null);
    };

    const handleClearApiError = () => {
        setApiError(null);
    };

    return (
        <div className="user-list-container">
            <div className="table-header">
                {hasPermission('agregar_usuario') && (
                    <button className="add-user-button" onClick={handleAddUser}>
                        Agregar Usuario
                    </button>
                )}
            </div>

            {users.length === 0 ? (
                <div className="empty-state">
                    <p>No se encontraron usuarios.</p>
                </div>
            ) : (
                // ⭐ Agrega esta envoltura para el desplazamiento horizontal
                <div className="table-wrapper">
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuario</th>
                                <th>Nombre</th>
                                <th>Correo</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.usuario_id}>
                                    <td>{user.usuario_id}</td>
                                    <td>{user.usuario}</td>
                                    <td>{user.nombre}</td>
                                    <td>{user.correo}</td>
                                    <td>{user.estado === 'Vigente' ? 'Vigente' : 'Inactivo'}</td>
                                    <td>
                                        <ActionMenu
                                            actions={[
                                                { label: 'Editar Usuario', onClick: () => handleEditUser(user) },
                                                { label: 'Detalles', onClick: () => handleViewDetails(user) },
                                                // ... cualquier otra acción
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {addUserFlow === 'search_erp' && (
                <ERPUserSearch
                    onUserSelected={handleERPUserSelected}
                    onCancel={handleCancelAddUser}
                />
            )}
            {addUserFlow === 'fill_data' && (
                <DataForm
                    fields={addFields}
                    title="Agregar Usuario"
                    formData={addFormData}
                    setFormData={setAddFormData}
                    onSave={handleAddFormSave}
                    apiError={apiError}
                    onClose={handleCancelAddUser}
                    onClearError={handleClearApiError}
                />
            )}

            {userToEdit && (
                <DataForm
                    fields={editFields}
                    title="Editar Usuario"
                    formData={userToEdit}
                    setFormData={setUserToEdit}
                    onSave={handleUpdateUserSave}
                    apiError={apiError}
                    onClose={handleCloseEditModal}
                    onClearError={handleClearApiError}
                />
            )}

            {userToViewDetails && (
                <DetailsModal
                    title="Detalles del Usuario"
                    data={userToViewDetails}
                    onClose={handleCloseDetailsModal}
                />
            )}
        </div>
    );
};

export default ListaDeUsuariosContent;