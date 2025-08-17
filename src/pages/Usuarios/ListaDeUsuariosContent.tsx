// src/pages/ListaDeUsuariosContent.tsx
import React, { useState, useEffect } from 'react';
//import { invoke } from '@tauri-apps/api/tauri';
import { getUsers, addUser, updateUser } from '../../utils/api-service'; // <-- Agrega esta línea
import { usePermissions } from '../../contexts/PermissionContext';
import './ListaDeUsuariosContent.css';
import ActionDropdown from '../../components/AdministracionUsuarios/ActionDropdown';
import ERPUserSearch from '../../components/ERPUserSearch'; // <-- Importar el modal de búsqueda
import DataForm from '../../components/DataForm';         // <-- Importar el formulario genérico
import DetailsModal from '../../components/DetailsModal'; // <-- Importar el nuevo modal
import { CustomApiError } from '../../utils/api-client'; // <-- ¡Añade esta línea!
// Token
import { useUser } from '../../contexts/UserContext';

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

    // Obtienes el token del contexto
    const { token } = useUser();

  
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
    // manejo de errores
    const [apiError, setApiError] = useState('');
    // NUEVO: Estado para los datos del formulario de agregar
    const [addFormData, setAddFormData] = useState<Partial<Usuario>>({});

    // 1. Modifica fetchUsers para que reciba 'token' como argumento
    const fetchUsers = async () => {
        try {
            setLoading(true);
            // ⭐ EL CONTROL CLAVE ⭐
            // Si el token existe, se lo pasas a la función.
            // Si no existe (en Tauri), la función lo ignorará.
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
    
    // Esto se ejecutará cada vez que el componente se monte.
    // Dado que el router ya verificó la autenticación, 
    // sabemos que el token existirá si llegamos aquí.
    useEffect(() => {
        fetchUsers();
    }, []);  
   
    // Handlers para el flujo de agregar usuario
    const handleAddUser = () => {
        // 1. Limpia el estado de error antes de abrir el modal
        setApiError(null); 
        // Reinicia el estado del formulario de agregar antes de mostrar el modal
        setAddFormData({}); 
        setAddUserFlow('search_erp');
    };

    const handleERPUserSelected = (erpUser: UserSearchResult) => {
        setSelectedERPUser(erpUser);
        setAddUserFlow('fill_data');

        // Inicializa el estado del formulario del padre aquí
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

        // Limpia el estado del formulario cuando se cancela
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
        // Agrega aquí más validaciones específicas...
        // if (data.estado && data.estado !== 'Vigente') {
        //     errors.push("El estado inicial debe ser 'Vigente'.");
        // }

        return errors;
    };

    // Aquí es donde está el cambio: relanzamos el error
    const handleAddFormSave = async (formData: Partial<Usuario>) => {
        setApiError(null); // Limpiamos errores anteriores
        try {
            // 1. Validación previa
            const validationErrors = validateFormData(formData);
            if (validationErrors.length > 0) {
                throw validationErrors.join('\n');
            }
            console.error("paso validación:");
            // 2. Llama al servicio. Si la promesa falla, el error se propaga.
            //    Si tiene éxito, la función continúa.
            await addUser({
                usuario: formData.usuario,
                nombre: formData.nombre,
                correo: formData.correo
            });
            console.error("paso INSERT:");
            // 3. Si no hubo errores, recarga la lista.
            await fetchUsers();
            console.error("paso validación:");
            // 4.vEl modal se cierra en el padre después de un éxito.
            // 3. Cierra la ventana modal.
            setAddUserFlow('initial');
            setSelectedERPUser(null);
            setAddFormData({}); // Limpia el estado del formulario
            //setShowAddModal(false); 
        } catch (e) {
            // AHORA podemos ver el error real en la consola
            console.error("Error en handleAddFormSave:", e); 
            // Manejo de errores centralizado
            if (e instanceof CustomApiError) {
                setApiError(e.message);
            } else if (typeof e === 'string') {
                setApiError(e);
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

    // Editar
    const handleEditUser = (user: Usuario) => {
        // 1. Limpia el estado de error antes de abrir el modal
        setApiError(null); 
        console.log("Se ha seleccionado el usuario para editar:", user); // <-- Añade esta línea para depurar
        setUserToEdit(user);
    };

    const handleCloseEditModal = () => {
        setUserToEdit(null);
    };
    
    const handleUpdateUserSave = async (data: Partial<Usuario>) => {
    // 1. Limpiamos errores anteriores y comenzamos el bloque de manejo de errores
    setApiError(null); 
    try {
        // Validación previa
        const validationErrors = validateFormData(data);
        if (validationErrors.length > 0) {
            // Si hay errores de validación, los lanzamos para que el bloque `catch` los atrape
            throw validationErrors.join('\n');
        }

        // 2. Llamada a la API
        // Si la promesa falla (por ejemplo, usuario no encontrado), el error se propaga al `catch`
        await updateUser({
            usuarioId: data.usuario_id, 
            correo: data.correo,
            estado: data.estado
        });
        
        // 3. Si no hubo errores, recargamos la lista y cerramos el modal
        await fetchUsers();
        // Cerramos el modal solo después de que la operación sea exitosa
        handleCloseEditModal(); 

    } catch (e) {
        // 4. Manejamos el error
        // Reutilizamos la misma lógica de manejo de errores que en handleAddFormSave
        if (e instanceof CustomApiError) {
            setApiError(e.message);
        } else if (typeof e === 'string') {
            setApiError(e);
        } else {
            setApiError("Ocurrió un error inesperado.");
        }
    }
};
    
    
    // NUEVO: Handler para abrir el modal de detalles
    const handleViewDetails = (user: Usuario) => {
        setUserToViewDetails(user);
    };

    // NUEVO: Handler para cerrar el modal de detalles
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
            
            {/* Aquí se renderizan los modales condicionalmente OJO aqui menciona ERPUserSearch.tsx*/}
            {addUserFlow === 'search_erp' && (
                <ERPUserSearch
                    onUserSelected={handleERPUserSelected}
                    onCancel={handleCancelAddUser}
                />
            )}
            {/* OJO aqui menciona DataForm.tsx*/}
            {addUserFlow === 'fill_data' && (
                <DataForm
                    fields={addFields}
                    title="Agregar Usuario"
                    formData={addFormData} // <-- ¡Pasa el estado aquí!
                    setFormData={setAddFormData} // <-- ¡Y la función para actualizarlo!
                    onSave={handleAddFormSave}
                    apiError={apiError} // <-- Ya lo tienes, ¡perfecto!
                    onClose={handleCancelAddUser}
                    onClearError={handleClearApiError} // <-- Pasa la nueva función
                />
            )}

            {/* Renderizado del modal de Editar DataForm.tsx*/}
            {userToEdit && (
                <DataForm
                    fields={editFields}
                    title="Editar Usuario"
                    formData={userToEdit} // <-- Pasa el estado del usuario a editar
                    setFormData={setUserToEdit} // <-- Y la función para actualizarlo
                    onSave={handleUpdateUserSave}
                    apiError={apiError} // <-- Ya lo tienes, ¡perfecto!
                    onClose={handleCloseEditModal}
                    onClearError={handleClearApiError} // <-- ¡Añade esta línea!
                />
            )}

            {/* NUEVO: Renderizado del modal de detalles DetailsModal.tsx*/}
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