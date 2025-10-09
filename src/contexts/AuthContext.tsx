// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useMsal } from '@azure/msal-react'; 
import { InteractionStatus, AccountInfo } from '@azure/msal-browser'; 

// 🚨 1. IMPORTACIÓN CRÍTICA: Tu UserContext ya existente
import { UserProvider, useUser } from './UserContext'; 
import { loginRequest } from '../msalConfig'; 
// 🚨 Asegúrate de que tu función de backend esté importada correctamente
import { processMSALLogin } from '../services/auth-service'; 
// 🚨 AÑADE ESTA IMPORTACIÓN (ajusta la ruta si es necesario)
import { LoggedInUser } from '../types/api-types'; 
// ------------------------------------------
// 1. DEFINICIÓN DE TIPOS Y CONTEXTO
// ------------------------------------------

// Los estados que App.tsx usará para renderizar
type AuthState = 'loading' | 'needs_login' | 'app_ready' | 'error';

interface AuthContextType {
    authState: AuthState;
    handleLogin: () => void; // Para el botón 'Iniciar Sesión'
    handleLogout: () => void; // Para el botón 'Cerrar Sesión'
    // Puedes agregar aquí el estado del usuario si no quieres usar useUser() directamente en App.tsx
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------
// 2. EL COMPONENTE DE LÓGICA (AuthLogicProvider)
// ------------------------------------------
// Este componente contiene la lógica de MSAL y el flujo asíncrono.

const AuthLogicProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    // 🚨 MOVER ESTADOS DE App.tsx AQUÍ
    const [authState, setAuthState] = useState<AuthState>('loading');
    // Hooks de MSAL y tu UserContext
    const { instance, inProgress, accounts } = useMsal();
    const { login, logout } = useUser(); // Usa los métodos de tu UserContext

    // 🚨 Inicializa el estado con VALOR FIJO, sin leer localStorage
    const [user, setUser] = useState<LoggedInUser | null>(null);
    const [permissions, setPermissions] = useState<string[] | null>(null);

    // Mueve tu función de ÉXITO de MSAL aquí (Se llama después de la redirección)
    const handleMsalSuccess = useCallback(async (account: AccountInfo) => {
        // 🚨 1. Iniciar en loading (ya lo tienes)
        setAuthState('loading'); // Pantalla de carga (blanco temporal)
        
        try {
            /*
            // 🚨 SIMULACIÓN PURA (SIN IMPORTACIÓN DE RED)
            console.log("BYPASS: (A) SIMULACIÓN PURA FINAL. DEBE SALIR ESTE LOG."); 
            
            // Simular la respuesta esperada por tu contexto de usuario
            const SIMULATED_USER_DATA = {
                user: { usuario: account.username || "testuser", nombre: account.username },
                permissions: ["ADMIN", "USER"] 
            };
            // 🚨 LOG C: Contexto (Si esto sale, el bloqueo se ha roto)
            console.log("TRY: (C) Simulación exitosa. Llenando contexto.");
            // Llenar el Contexto con datos simulados
            login(SIMULATED_USER_DATA.user, SIMULATED_USER_DATA.permissions); 
            setAuthState('app_ready');
            */
            
            // 1. Obtener Token de Acceso Silencioso (para llamar a tu API)
            const response = await instance.acquireTokenSilent({ 
                ...loginRequest,
                account: account 
            });
            // 🚨 SOLUCIÓN DE DESBLOQUEO: Usamos el ID token de la cuenta en caché (Saltamos acquireTokenSilent)
            const msalAccessToken = response.accessToken; 
            if (!msalAccessToken) throw new Error("ID Token no encontrado post-redirección.");
            // 💡 ASEGÚRATE DE QUE ESTE LOG ESTÉ ACTIVO:
            console.log("Access Token (JWT puro):", msalAccessToken); 
            
            // 2. LLAMADA ASÍNCRONA AL BACKEND (Espera hasta que termine)
            // 🚨 LLAMADA CRÍTICA AL BACKEND: Verifica licencia, consulta DB, obtiene permisos
            console.log("TRY: Iniciando llamada a backend y chequeo de licencia.");
            const userData = await processMSALLogin(msalAccessToken);
            console.log("TRY: Backend OK. Llenando contexto y finalizando.");
            
            // 3. 🚨 PASO DE ESTADO 1: Llenar el contexto de usuario (SINCRÓNICO)
            // Llenar el Contexto de Usuario con los datos y permisos del backend
            login(userData.user, userData.permissions); 

             // 4. 🚨 PASO DE ESTADO 2: AUTENTICACIÓN COMPLETA (CRÍTICO)
            // Pasar al estado final
            setAuthState('app_ready');
            

        } catch (error) {
            // 5. Si algo falla (Token o Backend), regresa a login.
            console.error("🛑 FALLO DE BACKEND/TOKEN. Detalle:", error); 
            // Vuelve al login o a la pantalla de error si la licencia falla
            setAuthState('needs_login'); 
        }
        
    }, [login, instance]); // Dependencias: login (de useUser)

    // 🚨 useEffect CRÍTICO: Maneja el Flujo de Estado (Tu antiguo useEffect 1 y 2 combinados)
    useEffect(() => {
        // Log de diagnóstico
        console.log("AUTH_PROVIDER: Estado MSAL:", inProgress, "Cuentas:", accounts.length, "Auth Estado:", authState);
        
        // 1. LÓGICA DE POST-REDIRECCIÓN/CUENTA EN CACHÉ
        // CRÍTICO: Si la interacción ha terminado (None), hay cuentas, Y el estado NO es estable.
        if (inProgress === InteractionStatus.None && accounts.length > 0 && authState !== 'app_ready') {
            
            console.log("✅ REDIRECCIÓN/CUENTA EN CACHÉ DETECTADA. Procesando cuenta.");
            // Llama a la simulación sincrónica que pondrá 'app_ready'
            handleMsalSuccess(accounts[0]);
            
            // No necesitamos 'return' si la siguiente lógica es estricta.
        }
        
        // 2. LÓGICA DE INICIO Y MOVIMIENTO A LOGIN
        // SÓLO se ejecuta si estamos en 'loading' Y no hay cuentas.
        // Esto evita que se dispare accidentalmente si ya hemos llegado a 'app_ready'.
        if (authState === 'loading' && inProgress === InteractionStatus.None && accounts.length === 0) {
            
            console.log("🟡 No hay cuentas. Moviendo a needs_login.");
            setAuthState('needs_login');
        }


    }, [inProgress, accounts.length, authState, handleMsalSuccess]); 
    
    // Funciones que se exponen a los botones de LoginMSALPage
   // 🚨 MODIFICACIÓN CRÍTICA: Volver a loginRedirect
    const handleLogin = () => { 
        console.log("Iniciando flujo de login con REDIRECT...");
        instance.loginRedirect(loginRequest); 
    };
    
    
    const handleLogout = () => { instance.logoutRedirect(); };


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

// 🚨 ESTE ES EL COMPONENTE QUE SE IMPORTA EN main.tsx (El envoltorio final)
export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    return (
        // ⚠️ ENCAPSULAMIENTO: UserProvider debe envolver la lógica para que useUser() esté disponible
        <UserProvider> 
            <AuthLogicProvider>{children}</AuthLogicProvider>
        </UserProvider>
    );
};

// Hook para que los componentes (como App.tsx) usen la autenticación
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};