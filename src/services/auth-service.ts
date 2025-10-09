// auth-service.ts
import { callBackend, setAuthToken, isTauri} from '../utils/api-client'; // Importa la nueva función
import { LoginResponse, UserCredentials } from '../types/api-types';
import { PUBLIC_API_PATH } from '../api-config';


// Define la estructura de datos que esperamos que el backend de Rust nos devuelva.
// Ajusta esto para que coincida con tus tipos reales de User y Permissions
interface UserDataResponse {
    user: any; // El objeto de usuario para el UserContext
    permissions: string[]; // Los permisos del usuario
    token?: string; // Opcional: si Rust devuelve un token de sesión propio
}

// Define tus funciones de servicio


// -------------------------------------------------------------
// FUNCIÓN DE LOGIN TRADICIONAL (Mantener)
// -------------------------------------------------------------
export const userLogin = async (credentials: UserCredentials): Promise<LoginResponse> => {
    // Add this line to print the data to the browser console
    console.log('Sending login request with data:', credentials);
    // Define la ruta y el método para la web
    const webRoute = `${PUBLIC_API_PATH}/login`;
    const webMethod = 'POST';

    // Declara el payload que se enviará a callBackend
    let payload;

    // Si estamos en Tauri, envuelve las credenciales en un objeto.
    // Si no, usa las credenciales directamente para la web.
    if (isTauri) {
        payload = { credentials };
    } else {
        payload = credentials;
    }

    // Llama a la función centralizada con el payload ya formateado
    const response = await callBackend('user_login', payload, webRoute, webMethod);

    // Set the token globally after a successful login response.
    // This is the correct place for this logic.
    if (response && response.token) { // <-- Asegúrate de que la respuesta tenga un token
        setAuthToken(response.token);
        console.log('Sending response user login:', response);
    }

    return response;
};

// ... y el resto de tus funciones

// -------------------------------------------------------------
// FUNCIÓN DE LOGIN CON MICROSOFT MSAL (NUEVA)
// -------------------------------------------------------------

/**
 * Procesa el Access Token de MSAL enviándolo al backend de Rust 
 * para validación, verificación multi-tenant y carga de datos de usuario.
 * @param accessToken El token de acceso obtenido de MSAL.
 * @returns Los datos del usuario y sus permisos.
 */
export const processMSALLogin = async (accessToken: string): Promise<UserDataResponse> => {
    // 1. Definir la ruta del endpoint en Rust para la validación del token
    const webRoute = `${PUBLIC_API_PATH}/auth/msal-login`; 
    const webMethod: 'POST' = 'POST'; // Forzamos POST
    //    - tauriCommand: Nulo, ya que forzamos el modo Web/HTTP.
    const tauriCommand = null; 
    
    console.log(`[MSAL] Llamando a backend de Rust en ${webRoute}`);

    try {
        // 2. Ejecutar la llamada a callBackend:
        //    callBackend enviará el 'accessToken' como encabezado 'Authorization: Bearer <token>'
        //    gracias a la implementación que añadimos en la utilidad.
        const response = await callBackend(
            tauriCommand,    // null para usar la ruta web
            null,            // body (no es necesario, el token va en el encabezado)
            webRoute,        // /api/public/auth/msal-login
            webMethod,       // POST
            accessToken      // 👈 El Access Token de MSAL
        );

        // 🚨 AÑADE ESTE LOG CRÍTICO 🚨
        console.log("RAW RESPONSE DE BACKEND:", response);

        // 🚨 CORRECCIÓN CRÍTICA 1: Desestructurar el Array(2) 🚨
        // Asumimos que rawResponse es un array: [ [datos_usuario], [permisos] ]
        // Desestructuramos para obtener el objeto de usuario y el array de permisos
        const userRawData = response[0]; 
        const permissionsArray = response[1];
        
        // 🚨 CORRECCIÓN CRÍTICA 2: Mapear los campos del usuario 🚨
        const userObject = { 
            // Las claves vienen en el objeto userRawData, ¡pero minúsculas!
            usuario: userRawData.usuario, 
            nombre: userRawData.nombre,
            correo: userRawData.correo,
            // Agrega cualquier otra propiedad que tu LoggedInUser necesite.
        };

        console.log("✅ DATOS CONSTRUIDOS PARA CONTEXTO:", userObject);

        const userData: UserDataResponse = {
            user: userObject,           
            permissions: permissionsArray,
            // Nota: Aquí se asume que el token no viene en el rawResponse, 
            // si el backend lo devuelve, ajusta aquí.
        };

        // 3. La respuesta contiene el JWT de sesión, el objeto User y Permisos:
        //    { token: "...", user: { ... }, permissions: ["...", "..."] }
        return userData;

    } catch (error) {
        console.error("[MSAL Error] Fallo al procesar el token en el backend:", error);
        // Lanzar un error específico para que el componente de login lo maneje.
        throw new Error("Fallo en la autenticación MSAL. Verifique que su usuario existe en el sistema.");
    }
};