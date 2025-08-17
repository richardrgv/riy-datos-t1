// src/utils/api-client.ts
/*
2025-08-12  RichardG    La lógica en tu frontend (api-client.ts) está construyendo una URL basada en 
                        el nombre de tu comando de Tauri (check_license_status_command). 
                        Sin embargo, tu backend de Actix-web no tiene una ruta configurada  
                        para check_license_status_command.
2025-08-14  RichardG    Manejo de errores
*/

// Define una interfaz para el error estructurado que esperas
export interface ApiErrorResponse {
    code: string;
    message: string;
}
// Detecta si estamos en el entorno de Tauri o en un navegador
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

// Si estamos en Tauri, importamos `invoke`
let tauriInvoke: ((...args: any[]) => Promise<any>) | null = null;
if (isTauri) {
    const tauriApi = await import('@tauri-apps/api/tauri');
    tauriInvoke = tauriApi.invoke;
}

// URL base de la API, codificada para que funcione de inmediato
const API_BASE_URL: string = 'http://localhost:3000';

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
    commandName: string, 
    args: any = {}, 
    webRoute?: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', // <-- El método por defecto es GET
    // ¡Añade el token como un argumento opcional!
    token?: string | null // <-- Cambia aquí para aceptar null 
): Promise<any> => {
    if (isTauri) {
        if (tauriInvoke) {
            return tauriInvoke(commandName, args);
        }
    } else {
        // Lógica para la web
        const isGET = method === 'GET';
        const url = isGET ? `${API_BASE_URL}/${webRoute}?${new URLSearchParams(args).toString()}` : `${API_BASE_URL}/${webRoute}`;
        
        // Crea los encabezados. Agrega el token si existe.
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options: RequestInit = {
            method,
            headers,
            body: (isGET || method === 'DELETE') ? undefined : JSON.stringify(args),
        };

        const response = await fetch(url, options);

        // Lógica para manejar errores de la API
        if (!response.ok) {
            let errorData: ApiErrorResponse | undefined;
            try {
                // Intenta leer el cuerpo del error como JSON
                errorData = await response.json();
            } catch (e) {
                // Si el cuerpo no es JSON, lanza un error genérico
                throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
            }

            // Si el cuerpo es JSON, lanza nuestro error personalizado
            if (errorData && typeof errorData.message === 'string') {
                throw new CustomApiError(errorData.message, errorData.code);
            }
        }

        // Retorna los datos si la respuesta es exitosa
        return await response.json();
    }
};