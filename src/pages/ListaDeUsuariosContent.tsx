// src/pages/ListaDeUsuariosContent.tsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { usePermissions } from '../contexts/PermissionContext';
import './ListaDeUsuariosContent.css';
import ActionDropdown from '../components/AdministracionUsuarios/ActionDropdown';
import ERPUserSearch from '../components/ERPUserSearch'; // <-- Importar el modal de búsqueda
import DataForm from '../components/DataForm';         // <-- Importar el formulario genérico
import DetailsModal from '../components/DetailsModal'; // <-- Importar el nuevo modal

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

// Campos para el formulario de agregar/editar
const addFields = [
    { name: 'usuario', label: 'Usuario', type: 'text', disabled: true },
    { name: 'nombre', label: 'Nombre', type: 'text', disabled: true },
    { name: 'correo', label: 'Correo', type: 'email', disabled: false },
    { name: 'estado', label: 'Estado', type: 'text', disabled: true },
];
// En tu caso 'userFields' es para 'add', así que lo renombramos a 'addFields' para mayor claridad.
// Si tuvieras campos para editar, crearías una constante `editFields`.

type AddUserFlow = 'initial' | 'search_erp' | 'fill_data';


const editFields = [
    { name: 'usuario', label: 'Usuario', type: 'text', disabled: true },
    { name: 'nombre', label: 'Nombre', type: 'text', disabled: true },
    { name: 'correo', label: 'Correo', type: 'email', disabled: false },
    // AQUI ESTÁ EL CAMBIO
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


const ListaDeUsuariosContent = () => {
    const { hasPermission } = usePermissions();
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
       
    // Estado para el flujo de agregar usuario
    const [addUserFlow, setAddUserFlow] = useState<AddUserFlow>('initial');
    const [selectedERPUser, setSelectedERPUser] = useState<UserSearchResult | null>(null);
    // Estado para Editar
    const [userToEdit, setUserToEdit] = useState<Usuario | null>(null); // <-- Nuevo estado para el usuario a editar
    const [userToViewDetails, setUserToViewDetails] = useState<Usuario | null>(null); // <-- NUEVO estado para el modal de detalles
  
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const result = await invoke<Usuario[]>('get_users');
            setUsers(result);
        } catch (e) {
            console.error("Error al obtener usuarios:", e);
            setError("Error al cargar la lista de usuarios.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchUsers();
    }, []);


   
    // Handlers para el flujo de agregar usuario
    const handleAddUser = () => {
        setAddUserFlow('search_erp');
    };

    const handleERPUserSelected = (erpUser: UserSearchResult) => {
        setSelectedERPUser(erpUser);
        setAddUserFlow('fill_data');
    };

    const handleCancelAddUser = () => {
        setAddUserFlow('initial');
        setSelectedERPUser(null);
    };

    const validateFormData = (data: Partial<Usuario>) => {
        const errors: string[] = [];

        if (!data.correo || data.correo.trim() === '') {
            errors.push("El correo es un campo obligatorio.");
        }
        if (data.correo && !data.correo.includes('@')) {
            errors.push("El formato del correo es inválido.");
        }
        // Agrega aquí más validaciones específicas...
        // if (data.estado && data.estado !== 'Vigente') {
        //     errors.push("El estado inicial debe ser 'Vigente'.");
        // }

        return errors;
    };

    const handleAddFormSave = async (formData: Partial<Usuario>) => {

        // Realiza validaciones antes de llamar al backend
        const validationErrors = validateFormData(formData);
        if (validationErrors.length > 0) {
            // Lanza un error para que DataForm lo capture y muestre
            throw validationErrors.join('\n');
        }

        // En lugar de un try/catch aquí, el padre delega el manejo del error al hijo
        const result = await invoke('add_user_from_erp', { 
            usuario: formData.usuario,
            nombre: formData.nombre,
            correo: formData.correo
        });
        // Si el invoke falla, la promesa se rechaza y el `catch` del hijo la captura
        // Si tiene éxito, no pasa nada y el padre cerrará el modal
        
        // No hay necesidad de un try/catch aquí. Solo esperamos la promesa

        if (result) {
            // Si el comando de Tauri es exitoso, actualizamos la lista
            await fetchUsers(); // <-- Aquí recargamos la lista de usuarios
        }
        
        return result; 
    };


    if (loading) {
        return <div>Cargando usuarios...</div>;
    }
    if (error) {
        return <div className="error">{error}</div>;
    }

    // Editar
    const handleEditUser = (user: Usuario) => {
         console.log("Se ha seleccionado el usuario para editar:", user); // <-- Añade esta línea para depurar
        setUserToEdit(user);
    };

    const handleCloseEditModal = () => {
        setUserToEdit(null);
    };
    
    const handleUpdateUserSave = async (data: Partial<Usuario>) => {
        const result = await invoke('update_user', {
            usuarioId: data.usuario_id,
            correo: data.correo,
            estado: data.estado
        });
        
        if (result) {
            await fetchUsers();
        }

        return result;
    };
    
    
    // NUEVO: Handler para abrir el modal de detalles
    const handleViewDetails = (user: Usuario) => {
        setUserToViewDetails(user);
    };

    // NUEVO: Handler para cerrar el modal de detalles
    const handleCloseDetailsModal = () => {
        setUserToViewDetails(null);
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
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Estado</th>
                            {/*<th>Autor</th>
                            <th>Fecha de Creación</th>*/}
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
                                {/*<td>{user.autor}</td>
                                <td>{user.fecha_creacion}</td>*/}
                                <td>
                                    {/* Aquí está el cambio: se pasa la función `handleEditUser` como prop */}
                                    <ActionDropdown 
                                        user={user} 
                                        onEdit={handleEditUser} 
                                        onViewDetails={handleViewDetails} // <-- This is where the function is passed
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            
            {/* Aquí se renderizan los modales condicionalmente */}
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
                    initialData={{
                        usuario: selectedERPUser?.usuario || '',
                        nombre: selectedERPUser?.nombre || '',
                        correo: '', 
                        estado: 'Vigente', 
                    } as Usuario}
                    onSave={handleAddFormSave}
                    onClose={handleCancelAddUser}
                />
            )}

            {/* Renderizado del modal de Editar */}
            {userToEdit && (
                <DataForm
                    fields={editFields}
                    title="Editar Usuario"
                    initialData={userToEdit}
                    onSave={handleUpdateUserSave}
                    onClose={handleCloseEditModal}
                />
            )}

            {/* NUEVO: Renderizado del modal de detalles */}
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