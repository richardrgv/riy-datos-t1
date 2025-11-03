// src/utils/api-client.ts
/*
2025-08-12  RichardG    La lógica en tu frontend (api-client.ts) está construyendo una URL basada en 
                        el nombre de tu comando de Tauri (check_license_status_command). 
                        Sin embargo, tu backend de Actix-web no tiene una ruta configurada  
                        para check_license_status_command.
2025-08-14  RichardG    Manejo de errores
*/

import { PUBLIC_API_PATH } from '../api-config'; // 🚨 IMPORTAR LA CONSTANTE

import { LoggedInUser } from '../types/api-types';
//import { API_BASE_URL } from '../api-config';
// Define una interfaz para el error estructurado que esperas
export interface ApiErrorResponse {
    code: string;
    message: string;
}
// Detecta si estamos en el entorno de Tauri o en un navegador
export const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

// Si estamos en Tauri, importamos `invoke`
let tauriInvoke: ((...args: any[]) => Promise<any>) | null = null;
if (isTauri) {
    const tauriApi = await import('@tauri-apps/api/tauri');
    tauriInvoke = tauriApi.invoke;
}

// URL base de la API, codificada para que funcione de inmediato
//const API_BASE_URL: string = 'http://localhost:3000/api';


// Access the variable using the new name
const API_BASE_URL: string = import.meta.env.VITE_REACT_APP_API_BASE_URL;
if (!API_BASE_URL) {
  // Handle the case where the variable isn't defined
  console.error("VITE_REACT_APP_API_BASE_URL is not defined. Please check your .env file.");
}
console.log("api_base_url", API_BASE_URL);

// token
// Use a variable to store the token globally.
// You will need to set this after a successful login.
let currentToken: string | null = null;

// New function to set the token after a successful login
export const setAuthToken = (token: string) => {
    currentToken = token;
};

// New function to clear the token on logout
export const clearAuthToken = () => {
    currentToken = null;
};

// Nueva función que lanza un error estructurado
export class CustomApiError extends Error {
    public readonly code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'CustomApiError';
        this.code = code;
        Object.setPrototypeOf(this, CustomApiError.prototype);
    }
}

// Función centralizada para llamar a cualquier comando del backend
// Ahora acepta un argumento 'method'
export const callBackend = async (
    commandName: string | null, // 👈 ¡CORREGIDO! Ahora acepta null
    args: any = {}, 
    webRoute?: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    // ⚠️ NUEVO PARÁMETRO: Token externo para usos como MSAL
    externalToken?: string 
): Promise<any> => {
    if (isTauri) {
        if (tauriInvoke) {
            return tauriInvoke(commandName, args);
        }
     } else {
        // Lógica para la web
        const isGETorDELETE = method === 'GET' || method === 'DELETE';
        
        let url = `${API_BASE_URL}${webRoute}`;
        
        // Use query parameters only for GET requests
        if (method === 'GET' && Object.keys(args).length > 0) {
            url += `?${new URLSearchParams(args).toString()}`;
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        
        // ⚠️ Lógica de Autorización Modificada
        if (externalToken) {
            // Usa el token de MSAL (Bearer Token) para esta llamada
            headers['Authorization'] = `Bearer ${externalToken}`;
        } else if (currentToken) {
            // Usa el token de sesión normal si no hay token externo
            headers['Authorization'] = `Bearer ${currentToken}`;
        }

    
        const options: RequestInit = {
            method,
            headers,
            // Send the body only for POST and PUT requests
            body: (isGETorDELETE) ? undefined : JSON.stringify(args),
        };

        console.log("url", url);
        console.log("options", options);
        console.log("currentToken", currentToken);
        const response = await fetch(url, options);

        // --- NEW LOGIC FOR HANDLING EMPTY RESPONSES ---
        // Check if the response is ok and has a body to parse as JSON
        if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null; // Return null or a default value for empty responses
        }
        console.log("response", response);

        // Lógica para manejar errores de la API
        if (!response.ok) {
            let errorData: ApiErrorResponse | undefined;
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
            }

            if (errorData && typeof errorData.message === 'string') {
                throw new CustomApiError(errorData.message, errorData.code);
            }
        }

        return await response.json();
    }
};

// 🚨 Define el tipo esperado de la respuesta final del backend de Rust
export interface AuthResponse {
    app_jwt: string; 
    user: LoggedInUser; // El tipo LoggedInUser de tu UserContext
    permissions: string[];
}

// ⚠️ FUNCIÓN UNIFICADA DE AUTENTICACIÓN
export const processAuthCode = async (
    // Es el CÓDIGO de Google o el ACCESS TOKEN de MSAL
    codeOrToken: string, 
    // Identifica el flujo
    provider: 'google' | 'msal-corp' | 'msal-personal', 
    // URI necesaria para el intercambio de código (solo para Google)
    redirectUri: string 
): Promise<AuthResponse> => {
    
    // 🚨 El endpoint en Rust que manejará los 3 flujos
    // 🚨 CORRECCIÓN CRÍTICA: Construir el webRoute completo
    const webRoute = `${PUBLIC_API_PATH}/auth/process-auth`; 
    // webRoute ahora es "/api/public/auth/process-auth"
    const method = 'POST';
    
    // Payload que el backend de Rust espera
    const payload = {
        proof_of_identity: codeOrToken, // El código o el token
        provider: provider,
        redirect_uri: redirectUri, // Para Google, será la URL completa
    };

    console.log(`[API CLIENT] Enviando solicitud a Rust para el proveedor: ${provider}`);

    try {
        // Llama a tu función de comunicación con el backend (Web o Tauri)
        const response: AuthResponse = await callBackend(
            // Nombre del comando Tauri, ej: 'process_auth_code_command'
            'process_auth_code_command', 
            payload, 
            webRoute, 
            method
        );
        
        // El AuthContext espera una respuesta que cumpla con AuthResponse
        return response; 
        
    } catch (error) {
        // Captura y relanza el error para que AuthContext lo maneje
        console.error(`[API ERROR] Falló la autenticación con ${provider}:`, error);
        throw error;
    }
};