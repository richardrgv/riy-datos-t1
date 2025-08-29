// api-service.ts
import { callBackend} from '../utils/api-client'; // Importa la nueva función
import { UserSearchResult } from '../types/user';
import { PROTECTED_API_PATH } from '../api-config';

// Define tus funciones de servicio



// Modifica cada función que necesite autenticación para que reciba el token.
export const getUsers = async (): Promise<UserSearchResult[]> => {
    // Pasa el token a callBackend
    return await callBackend('get_users', {}, `${PROTECTED_API_PATH}/users`, 'GET'); 
};

/**
 * Busca usuarios del ERP según un término de búsqueda.
 * @param searchTerm El término de búsqueda.
 * @returns Una promesa que resuelve con una lista de usuarios.
 */
export const searchErpUsers = async (searchTerm: string): Promise<UserSearchResult[]> => {
    // La función callBackend manejará la llamada a Tauri o a la API web
    // `search_erp_users` es el nombre del comando de Tauri y de la ruta web
    // La clave debe ser 'searchTerm' para que Tauri la convierta a 'search_term' en Rust
    return await callBackend('search_erp_users', { searchTerm: searchTerm }, 
        `${PROTECTED_API_PATH}/erp-users`, 'GET');
};

export const addUser = async (
    user: { usuario: string, nombre: string, correo: string }
): Promise<any> => {
    // Pasa el token a callBackend
    return await callBackend('add_user', user, `${PROTECTED_API_PATH}/users`, 'POST');
};

export const updateUser = async (data: any): Promise<any> => {
    const userId = data.usuarioId;
    return await callBackend(
        'update_user', 
        data, 
        `${PROTECTED_API_PATH}/users/${userId}`, 
        'PUT'
    );
};

// ... y el resto de tus funciones