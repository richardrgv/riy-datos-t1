// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus, AccountInfo, AuthenticationResult } from '@azure/msal-browser';
import { useLocation, useNavigate } from 'react-router-dom';

// Importaciones de su arquitectura
import { UserProvider, useUser } from './UserContext';
// 🚨 CRÍTICO: Importar la nueva petición silenciosa
import { tokenAcquisitionRequest } from '../msalConfig'; 

// CRÍTICO: Necesitarás estas funciones de tu api-client.ts
// Usamos fetchUserPermissions en lugar del antiguo processAuthCode
import { fetchUserPermissions, setAuthToken, clearAuthToken } from '../utils/api-client';
import { LoggedInUser } from '../types/api-types'; // Assuming this type exists

// ------------------------------------------
// 1. TYPE AND CONTEXT DEFINITION
// ------------------------------------------

const MAX_RETRIES = 5; 

type AuthState = 'loading' | 'needs_login' | 'app_ready' | 'error';

interface AuthContextType {
    authState: AuthState;
    handleLogin: () => void;
    handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------
// 2. PROVIDER CORE LOGIC
// ------------------------------------------

const AuthLogicProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const { instance, accounts, inProgress } = useMsal();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Internal states
    const [authState, setAuthState] = useState<AuthState>('loading');
    const [retries, setRetries] = useState(0);
    
    // UserContext functions
    const { user, setUser, clearUser } = useUser();
    
    // Cleanup function
    const logout = useCallback(() => {
        clearAuthToken(); // Clears the token stored in the API client
        clearUser();      // Clears user info from the context
    }, [clearUser]);

    // 🚨 CORE FUNCTION: Gets the Token and sends it to Rust
    const handleMsalTokenProcess = useCallback(async (account: AccountInfo) => {
        
        // Prevent repeated calls if already processing or ready
        if (authState !== 'loading' && authState !== 'needs_login') return; 
        
        console.log(`[AuthContext] Processing MSAL token. Attempt: ${retries + 1}`);
        setAuthState('loading');

        try {
            // CRITICAL: Request the access token with the Rust API scope silently
            const tokenResponse: AuthenticationResult = await instance.acquireTokenSilent({
                ...tokenAcquisitionRequest, // Uses the silent request with the RUST_API_SCOPE
                account: account,
            });

            const accessToken = tokenResponse.accessToken;

            if (accessToken) {
                // 1. Store the token for future authenticated calls
                setAuthToken(accessToken); 

                // 2. Call the Rust Backend with the JWT for validation and permission extraction
                // Rust will verify 'groups' claims and return the complete LoggedInUser object
                const userPermissions: LoggedInUser = await fetchUserPermissions(accessToken); 
                
                // 3. Update the UserContext
                setUser(userPermissions);
                setAuthState('app_ready');
                setRetries(0); // Reset retries
                console.log("[AuthContext] User authenticated and permissions loaded. State: app_ready.");
                
                // Redirect if currently on the login page
                if (location.pathname === '/login') {
                    navigate('/'); 
                }
            } else {
                throw new Error("Access Token not available.");
            }
        } catch (error) {
            console.error("[AuthContext] Error acquiring token or permissions:", error);

            if (retries < MAX_RETRIES) {
                setRetries(r => r + 1);
                // Allow useEffect to retry
            } else {
                // Force login screen after max retries
                logout();
                setAuthState('needs_login'); 
                navigate('/login');
            }
        }
    }, [instance, navigate, setUser, retries, authState, logout, location.pathname]);


    // ------------------------------------------
    // 3. MAIN EFFECT (Orchestrator)
    // ------------------------------------------

    useEffect(() => {
        // Ignore if MSAL is busy (e.g., during login redirect processing)
        if (inProgress !== InteractionStatus.None) {
            setAuthState('loading');
            return;
        }

        // 1. If MSAL has accounts and the user is not loaded, process the token
        if (accounts.length > 0 && !user) {
            // Check for max retries to prevent infinite loops
            if (retries < MAX_RETRIES) {
                handleMsalTokenProcess(accounts[0]);
            } else {
                 setAuthState('needs_login');
            }
            return;
        }
        
        // 2. If user is loaded and MSAL is ready, the app is ready
        if (user && accounts.length > 0) {
            setAuthState('app_ready');
            return;
        }

        // 3. If MSAL has no accounts, the app needs login
        if (accounts.length === 0) {
            setAuthState('needs_login');
            return;
        }

        // Initial loading case
        setAuthState('loading');

    }, [inProgress, accounts.length, user, handleMsalTokenProcess, retries]);


    // Exposed functions
    const handleLogin = useCallback(() => {
        console.warn("handleLogin called. Login redirection should be handled in LoginPage.tsx.");
    }, []);


    const handleLogout = useCallback(() => {
        clearAuthToken(); 
        clearUser();      
        instance.logoutRedirect(); // Initiates logout in B2C/MSAL
    }, [instance, clearUser]);


    // Expose values
    const contextValue: AuthContextType = {
        authState,
        handleLogin, 
        handleLogout,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// ------------------------------------------
// 4. EXPORTED HOOKS AND PROVIDER
// ------------------------------------------

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    return (
        <UserProvider>
            <AuthLogicProvider>{children}</AuthLogicProvider>
        </UserProvider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};