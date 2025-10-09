// src/msalConfig.ts

import { Configuration, PublicClientApplication } from "@azure/msal-browser";
import { CacheOptions, LogLevel } from '@azure/msal-browser';

// --- 1. Definición de Scopes y URIs ---
// Obtén el Client ID de las variables de entorno
const API_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID as string;
const API_URI = `api://${API_CLIENT_ID}`;

// El Scope Delegado que creaste en Azure (access_as_user)
const API_SCOPE = `${API_URI}/access_as_user`; 

// 🚨 DEFINIR OPCIONES DE CACHE
const cacheConfig: CacheOptions = {
    cacheLocation: "localStorage", // CRÍTICO: Asegurarse de usar localStorage
    storeAuthStateInCookie: false, // No necesario, pero evita complicaciones
};

// --- 2. Configuración de MSAL (Configuration) ---
export const msalConfig: Configuration = {
    auth: {
        clientId: API_CLIENT_ID, 
        authority: "https://login.microsoftonline.com/common", 
        
        // 🚨 CRUCIAL: URI de redirección Nativo/Desktop (tal como está en Azure)
        redirectUri: "http://localhost:1423/",
        //redirectUri: "https://login.microsoftonline.com/common/oauth2/nativeclient", 
    },
    // 🚨 AÑADIR LA CONFIGURACIÓN DE CACHE
    cache: cacheConfig, 
    // ..
   /*system: {
        // 🚨 CRÍTICO 1: Evita que MSAL intente limpiar la URL o redirigir de forma inesperada.
        // Esto es necesario para que el router de React (si lo usas) o Tauri tomen el control.
        //navigateToLoginRequestUrl: false,
        
        // 🚨 CRÍTICO 2: Soluciona el 'response: null'
        // Permite que MSAL lea el fragmento de URL (#code=...) incluso si está siendo manipulado
        // por el entorno o el router (Tauri/Vite).
        allowHash: true
    }*/
};

// --- 3. Definición de Permisos para la petición de login ---
export const loginRequest = {
    // openid y profile son estándar. API_SCOPE pide permiso para tu API.
    scopes: ["openid", "profile", API_SCOPE],  
};

// --- 4. Crear instancia ---
export const msalInstance = new PublicClientApplication(msalConfig);