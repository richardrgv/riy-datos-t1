// src/utils/api-client.ts
/*
CRITICAL UPDATE:
1. Replaces the old 'processAuthCode' function (which handled Google/M365 redirects) 
with a direct 'fetchUserPermissions' function.
2. The new function sends the raw MSAL Access Token to the Rust backend.
3. The Rust backend is now responsible for validating the JWT and extracting the 'groups' claims.
*/

import { PUBLIC_API_PATH } from '../api-config'; 
import { LoggedInUser } from '../types/api-types'; // Assuming this interface exists

// --- Global Authentication State ---
let authToken: string | null = null;
export const setAuthToken = (token: string) => { authToken = token; };
export const clearAuthToken = () => { authToken = null; };
export const getAuthToken = () => authToken;

// --- Platform Detection ---
export const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

// --- Tauri Invoke Setup ---
let tauriInvoke: ((...args: any[]) => Promise<any>) | null = null;
if (isTauri) {
    // Dynamically import Tauri's invoke function
    const tauriApi = await import('@tauri-apps/api/tauri');
    tauriInvoke = tauriApi.invoke;
}

// --- Backend Communication Core Function ---

/**
 * Executes a call to the Rust backend (via Tauri or Web Fetch).
 * Automatically includes the authentication token if available.
 */
async function callBackend(
    tauriCommand: string, 
    payload: any, 
    webRoute: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST'
): Promise<any> {
    
    // 1. Determine payload and headers
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        // CRITICAL: Include the JWT if it exists
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }) 
    };

    // 2. Execute via Tauri
    if (isTauri && tauriInvoke) {
        // Tauri commands expect the payload as an object containing the expected arguments
        const tauriPayload = { ...payload, token: authToken }; 
        console.log(`[API CLIENT] Calling Tauri Command: ${tauriCommand}`, tauriPayload);
        try {
            return await tauriInvoke(tauriCommand, tauriPayload);
        } catch (error) {
            console.error(`Tauri Command Error (${tauriCommand}):`, error);
            // Tauri errors are usually strings/objects from the Rust side
            throw new Error(`Tauri Error: ${JSON.stringify(error)}`);
        }
    } 
    
    // 3. Execute via Web Fetch
    else {
        const fullUrl = `http://localhost:8080${webRoute}`; // Assuming Rust web server runs on 8080
        const config: RequestInit = {
            method: method,
            headers: headers,
            // Only include body for POST/PUT/PATCH
            ...(method !== 'GET' && { body: JSON.stringify(payload) }) 
        };
        
        console.log(`[API CLIENT] Calling Web API: ${method} ${fullUrl}`);

        try {
            const response = await fetch(fullUrl, config);

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ message: 'Error desconocido del servidor.' }));
                console.error(`Web API Error (${response.status}):`, errorBody);
                throw new Error(`API Error ${response.status}: ${errorBody.message || JSON.stringify(errorBody)}`);
            }

            return await response.json();
        } catch (error) {
            console.error("[API CLIENT] Network or Fetch Error:", error);
            throw new Error(`Error de conexión al API: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}


// --- API Functions ---

/**
 * 🚨 CRITICAL NEW FUNCTION FOR B2C FLOW 🚨
 * Sends the MSAL Access Token to the Rust Backend for JWT validation and
 * extraction of user permissions (groups).
 * * @param accessToken The raw JWT obtained from MSAL.
 * @returns A LoggedInUser object with permissions extracted by the backend.
 */
export const fetchUserPermissions = async (accessToken: string): Promise<LoggedInUser> => {
    
    // This is the endpoint where Rust will handle JWT validation and group extraction
    const webRoute = `${PUBLIC_API_PATH}/auth/verify-token`; 
    const method = 'POST';
    
    // Payload contains the raw token
    const payload = {
        access_token: accessToken,
    };

    console.log(`[API CLIENT] Sending Access Token to Rust for validation and permission check...`);

    try {
        // Call the backend endpoint/command
        const response: LoggedInUser = await callBackend(
            // New Tauri command name to be created in Rust
            'verify_token_command', 
            payload, 
            webRoute, 
            method
        );
        
        // Expected response is the LoggedInUser object
        return response; 
        
    } catch (error) {
        console.error("[API CLIENT] Error fetching user permissions from Rust:", error);
        throw error;
    }
};

// --- Old `processAuthCode` function has been removed as it is replaced by fetchUserPermissions ---