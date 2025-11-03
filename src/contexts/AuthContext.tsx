// src/contexts/AuthContext.tsx (Versión Modificada para Múltiples Proveedores)

/*
será el motor de la sesión, 
manejando el estado de autenticación, 
la comunicación con el Backend de Rust y 
la persistencia del JWT.
*/
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus, AccountInfo } from '@azure/msal-browser';
import { useLocation, useNavigate } from 'react-router-dom'; // 🚨 IMPORTACIÓN CRÍTICA PARA EL FLUJO GOOGLE/CALLBACK

// Importaciones de su arquitectura
import { UserProvider, useUser } from './UserContext';
import { loginRequest } from '../msalConfig';
// 🚨 CRÍTICO: Necesitarás estas funciones de tu api-client.ts, que deben ser creadas/actualizadas
import { processAuthCode, setAuthToken, clearAuthToken } from '../utils/api-client';
//import { LoggedInUser } from '../types/api-types'; 

// ------------------------------------------
// 1. DEFINICIÓN DE TIPOS Y CONTEXTO
// ------------------------------------------

// 1. Define el límite máximo de reintentos
const MAX_RETRIES = 5; // Un valor razonable para evitar la sobrecarga

type AuthState = 'loading' | 'needs_login' | 'app_ready' | 'error';

interface AuthContextType {
    authState: AuthState;
    handleLogin: () => void; // Función de inicio (ya no usada por botones)
    handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------
// 2. EL COMPONENTE DE LÓGICA (AuthLogicProvider)
// ------------------------------------------

const AuthLogicProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {

    // 🚨 HOOKS AÑADIDOS
    const location = useLocation();
    const navigate = useNavigate();

    const [authState, setAuthState] = useState<AuthState>('loading');
    // 🚨 NUEVO ESTADO: Contador de fallos
    const [retryCount, setRetryCount] = useState(0);

    const { instance, inProgress, accounts } = useMsal();
    const { login, logout } = useUser();

    // =======================================================================
    // A. FUNCIÓN UNIFICADA: Procesa el CÓDIGO de Google
    // =======================================================================
    const handleGoogleCodeProcess = useCallback(async (code: string) => {
        setAuthState('loading');

        // El redirect URI debe ser el actual para el intercambio de código en Rust
        const redirectUri = window.location.origin + location.pathname;

        try {
            console.log("[AUTH] Procesando código de Google...");

            // 1. Llama al Backend (Rust) con el código y el proveedor 'google'
            const response = await processAuthCode(code, 'google', redirectUri);

            // 2. Verifica la respuesta de Rust (esperamos el token de sesión y los datos)
            if (response && response.app_jwt && response.user && response.permissions) {

                // 3. Almacena el token de sesión de SU APLICACIÓN
                setAuthToken(response.app_jwt);

                // 4. Llenar el Contexto de Usuario 
                login(response.user, response.permissions);

                // 5. Finalizar
                setAuthState('app_ready');
                navigate(location.pathname.includes('/auth-callback') ? '/' : location.pathname, { replace: true });
            } else {
                throw new Error("Respuesta del Backend inválida después de procesar el código.");
            }
        } catch (error) {
            console.error("[AUTH ERROR] Falló el intercambio de código de Google con Rust:", error);
            clearAuthToken();
            logout();
            setAuthState('needs_login');
        }
    }, [location.pathname, login, navigate, logout]);


    // =======================================================================
    // B. FUNCIÓN UNIFICADA: Procesa el TOKEN de MSAL (Flujo de cuenta en caché)
    // =======================================================================
    // Reemplaza handleMsalSuccess
    const handleMsalTokenProcess = useCallback(async (account: AccountInfo) => {

        // 🚨 1. GUARDRAIL: Si excedimos el límite, pasamos a estado de error y paramos
        if (retryCount >= MAX_RETRIES) {
            console.error("🛑 Límite de reintentos de backend excedido para MSAL. Forzando estado de error.");
            setAuthState('error'); // Estado terminal, rompe el bucle del useEffect
            return; // 🛑 Detiene la ejecución
        }
        setAuthState('loading');

        // 🚨 SOLUCIÓN AL ERROR: Usar 'iss' (Issuer) de los claims para obtener la autoridad
        const issuerUrl = account.idTokenClaims?.iss || '';

        // Si la URL del emisor contiene el segmento '/consumers', es una cuenta personal.
        const provider = issuerUrl.includes('/consumers') ? 'msal-personal' : 'msal-corp';

        try {
            // 1. Obtener Token de Acceso Silencioso (su lógica actual)
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: account
            });

            const msalAccessToken = response.accessToken;
            if (!msalAccessToken) throw new Error("Access Token no encontrado.");

            console.log(`TRY: Iniciando llamada a backend para MSAL (${provider}).`);
            console.log(`Token MSAL longitud: ${msalAccessToken.length}`);

            // 2. LLAMADA AL BACKEND UNIFICADA
            // El backend de Rust debe saber que si le enviamos un Access Token, es MSAL.
            const userData = await processAuthCode(msalAccessToken, provider, '');


            // 🚨 CORRECCIÓN CLAVE: Verificar el JWT del backend inmediatamente 🚨
            if (!userData || !userData.app_jwt) {
                // Si el backend no devuelve el token esperado, lanzamos un error
                throw new Error("El Backend no devolvió el token de sesión (app_jwt).");
            }

            // 🚨 Resetear el contador de reintentos al tener éxito
            setRetryCount(0);

            console.log("TRY: Backend OK. Llenando contexto y finalizando.");

            // 3. Obtener el token de sesión de la aplicación
            setAuthToken(userData.app_jwt);

            // 4. Llenar el Contexto de Usuario 
            login(userData.user, userData.permissions);

            // 5. Pasar al estado final
            setAuthState('app_ready');

        } catch (error) {
            // 🚨 4. LÓGICA DE FALLO Y REINTENTO 🚨
            // 🚨 BLOQUE DE CAPTURA ACTUALIZADO 🚨
            console.error("🛑 FALLO DE MSAL/BACKEND. Detalle:", error);
            clearAuthToken();
            logout(); // Limpia el UserContext

            // 🚨 Incrementar el contador de fallos
            setRetryCount(prev => prev + 1);

            // ⚠️ CORRECCIÓN CLAVE: Eliminar la cuenta para romper la condición del useEffect ⚠️
            if (accounts.length > 0) {
                // Llama a la función logout que debería limpiar el estado de la cuenta local de MSAL
                // Usamos logoutPopup() o logoutRedirect() para forzar la limpieza del caché de MSAL.
                // Si quieres un logout sin redirección, usa instance.logout(logoutRequest)
                // Ya que accounts[0] es la cuenta que causó el problema, la eliminamos del caché:
                instance.setActiveAccount(null); // Establece la cuenta activa a nula (método correcto)
                //instance.logoutRedirect({ account: accounts[0] }); // Forzar logout y limpieza
            }

            setAuthState('needs_login'); // Fuerza el estado de login
        }

    }, [login, instance, logout, accounts.length, retryCount]); // 🚨 Asegúrate de incluir 'accounts.length' en las dependencias


    // =======================================================================
    // C. EFECTO PRINCIPAL: MANEJO DE ESTADOS
    // =======================================================================
    useEffect(() => {
        console.log("AUTH_PROVIDER: Estado MSAL:", inProgress, "Cuentas:", accounts.length, "Auth Estado:", authState);

        // --- 1. MANEJO DE CALLBACKS (Google) ---
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');

        // ⚠️ CRÍTICO: Detectar código de Google en la URL
        if (code && authState !== 'app_ready') {
            console.log("✅ CÓDIGO DE GOOGLE DETECTADO. Iniciando flujo de backend.");
            handleGoogleCodeProcess(code);
            return; // Detiene el resto del useEffect
        }

        // --- 2. LÓGICA DE POST-REDIRECCIÓN/CUENTA EN CACHÉ (MSAL) ---
        // Se ejecuta si MSAL terminó, hay cuentas, y no estamos en un estado final.
        if (inProgress === InteractionStatus.None && accounts.length > 0 && authState !== 'app_ready' && authState !== 'error') {
            // 🚨 NOTA: La verificación del contador de reintentos ocurre DENTRO de handleMsalTokenProcess
            console.log("✅ CUENTA MSAL DETECTADA. Procesando token.");
            handleMsalTokenProcess(accounts[0]);
            return; // Detiene el resto del useEffect
        }

        // --- 3. LÓGICA DE INICIO Y MOVIMIENTO A LOGIN ---
        // SÓLO se ejecuta si estamos en 'loading' Y no hay cuentas, Y la interacción MSAL terminó.
        if (authState === 'loading' && inProgress === InteractionStatus.None && accounts.length === 0) {

            console.log("🟡 No hay cuentas. Moviendo a needs_login.");
            setAuthState('needs_login');
        }

    }, [inProgress, accounts.length, authState, handleMsalTokenProcess, handleGoogleCodeProcess, location.search]);

    // Funciones que se exponen

    // 🚨 handleLogin ya no tiene lógica de redirección
    const handleLogin = useCallback(() => {
        console.warn("handleLogin llamado. La redirección de login ahora se gestiona en LoginPage.tsx.");
    }, []);


    const handleLogout = useCallback(() => {
        clearAuthToken();
        logout(); // Limpia el contexto de usuario
        instance.logoutRedirect();
    }, [instance, logout]);


    // Exponer valores
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
// 3. ENCAPSULAMIENTO Y HOOKS EXPORTADOS
// ------------------------------------------

// El componente que se importa en main.tsx
export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    return (
        <UserProvider>
            <AuthLogicProvider>{children}</AuthLogicProvider>
        </UserProvider>
    );
};

// Hook de consumo
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};