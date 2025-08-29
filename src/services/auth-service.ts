// auth-service.ts
import { callBackend, setAuthToken, isTauri} from '../utils/api-client'; // Importa la nueva función
import { LoginResponse, UserCredentials } from '../types/api-types';
import { PUBLIC_API_PATH } from '../api-config';

// Define tus funciones de servicio




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