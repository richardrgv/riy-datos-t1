import { callBackend } from './api-client'; // Importa la nueva función
import { LicenseCheckResult } from '../types/license';
import { UserSearchResult } from '../types/user';
import { LoginResponse, UserCredentials } from '../types/api-types';
// Define tus funciones de servicio

export const checkLicenseStatus = async (token: string): Promise<LicenseCheckResult> => {
    return await callBackend('check_license_status_command', {}, 'license/status', 'GET', token);
};


// userLogin ahora acepta un objeto, no dos strings.
export const userLogin = async (credentials: UserCredentials): Promise<LoginResponse> => {
    // La función callBackend manejará la llamada a Tauri o a la API web
    // `user_login` es el nombre del comando de Tauri y de la ruta web
    return await callBackend('user_login', { credentials }, 'login', 'POST');
};

// Modifica cada función que necesite autenticación para que reciba el token.
export const getUsers = async (token: string | null): Promise<UserSearchResult[]> => {
    // Pasa el token a callBackend
    return await callBackend('get_users', {}, 'users', 'GET', token); 
};

/**
 * Busca usuarios del ERP según un término de búsqueda.
 * @param searchTerm El término de búsqueda.
 * @returns Una promesa que resuelve con una lista de usuarios.
 */
export const searchErpUsers = async (searchTerm: string, token: string | null): Promise<UserSearchResult[]> => {
    // La función callBackend manejará la llamada a Tauri o a la API web
    // `search_erp_users` es el nombre del comando de Tauri y de la ruta web
    // La clave debe ser 'searchTerm' para que Tauri la convierta a 'search_term' en Rust
    return await callBackend('search_erp_users', { searchTerm: searchTerm }, 'erp-users', 'GET', token);
};

export const addUser = async (
    user: { usuario: string, nombre: string, correo: string }, 
    token: string | null // <-- Agrega el token aquí
): Promise<any> => {
    // Pasa el token a callBackend
    return await callBackend('add_user', user, 'users', 'POST', token);
};

export const updateUser = async (data: any, token: string | null): Promise<any> => {
    const userId = data.usuarioId;
    return await callBackend(
        'update_user', 
        data, 
        `users/${userId}`, 
        'PUT',
        token // <-- Pasa el token
    );
};

// ... y el resto de tus funciones