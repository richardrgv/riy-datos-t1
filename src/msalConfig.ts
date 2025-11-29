// src/msalConfig.ts

import { 
    Configuration, 
    PublicClientApplication, 
    CacheOptions, 
    RedirectRequest,
    PopupRequest,
    SilentRequest // Essential for silently acquiring tokens in AuthContext
} from "@azure/msal-browser";


// --- 1. Scope and URI Definitions ---

// Client ID for the Frontend Application (used by MSAL itself)
const API_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID as string;
// Client ID (GUID) for the Backend Rust API Application (used to build the scope URI)
const RUST_API_CLIENT_ID = import.meta.env.VITE_RUST_API_CLIENT_ID as string;

// CRITICAL: The URI of your Rust API is its GUID, as defined in Azure
const RUST_API_URI = `api://${RUST_API_CLIENT_ID}`;

// CRITICAL: The Delegated Scope you defined in Azure for your Rust API ('app.access')
// This permission is requested by the Frontend to talk to the Backend.
export const RUST_API_SCOPE = `${RUST_API_URI}/app.access`; // <-- EXPORTED for use in AuthContext

// Cache configuration
const cacheConfig: CacheOptions = {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
};

// --- 2. MSAL Configuration (Configuration) ---
export const msalConfig: Configuration = {
    auth: {
        clientId: API_CLIENT_ID, 
        
        // CRITICAL B2C: Authority must point to your B2C User Flow
        // Replace 'riyappclientes' and 'B2C_1_signin_signup_RIY' with your actual values if different
        authority: "https://riyappclientes.b2clogin.com/riyappclientes.onmicrosoft.com/B2C_1_signin_signup_RIY", 
        
        // CRITICAL: The exact Redirect URI registered in Azure for Tauri/Desktop
        redirectUri: "http://localhost:1423/",
    },
    
    // Cache settings
    cache: cacheConfig, 
    
    // System settings recommended for Tauri/Vite environments
    /*system: {
        allowHash: true, 
        navigateToLoginRequestUrl: false, 
    }*/
};

// --- 3. Request Definitions ---

// Request for LOGIN (redirects to B2C)
export const loginRequest: RedirectRequest | PopupRequest = {
    // openid, offline_access, and your Rust API scope
    scopes: ["openid", "offline_access", RUST_API_SCOPE] 
};

// Request for SILENT TOKEN ACQUISITION (used by AuthContext to get JWT with groups)
export const tokenAcquisitionRequest: SilentRequest = {
    scopes: [RUST_API_SCOPE]
};


// --- 4. Create MSAL Instance ---
export const msalInstance = new PublicClientApplication(msalConfig);