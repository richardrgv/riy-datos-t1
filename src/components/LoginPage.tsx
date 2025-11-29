// src/components/LoginPage.tsx (Reemplaza a LoginMSALPage.tsx)

import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus, PublicClientApplication } from '@azure/msal-browser';
import { loginRequest } from '../msalConfig'; 
import { isTauri } from '../utils/api-client'; // Importamos el detector de plataforma

// --- NUEVAS DEPENDENCIAS DE GOOGLE ---
// ⚠️ Nota: Necesitas instalar una librería como 'react-google-login' o usar el @react-oauth/google
// Por simplicidad en este ejemplo, usaremos un flujo de redirección simple.

interface LoginPageProps {
    handleLogin: (provider: 'google' | 'msal-corp' | 'msal-personal') => void; 
    handleLogout: () => void;
}

// ⚠️ FUNCIONES AUXILIARES PARA REDIRECCIÓN DE GOOGLE (Necesita Client ID configurado)
// Asume que tienes un GOOGLE_CLIENT_ID en tus variables de entorno.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_REACT_APP_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_REACT_APP_GOOGLE_REDIRECT_URI;
const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${GOOGLE_REDIRECT_URI}` +
    `&response_type=code` + // Usaremos el flujo de código para enviarlo al backend (más seguro)
    `&scope=openid profile email`;

// ⚠️ FUNCIONES AUXILIARES PARA REDIRECCIÓN MSAL PERSONAL (Necesita Entra ID configurado para MSA)
const getMsalPersonalLoginRequest = () => ({
    ...loginRequest,
    authority: 'https://login.microsoftonline.com/consumers', // Endpoint MSA Personal
});


export const LoginPage: React.FC<LoginPageProps> = () => {
    const { instance, inProgress } = useMsal(); 
    const accounts = instance.getAllAccounts();
    const isAuthenticated = accounts.length > 0;
    
        
    // ...
    // Ya no necesitas las funciones auxiliares de Google/MSAL Personal/Corporativo

    const handleB2CLogin = () => {
        // Llama al flujo de redirección de B2C configurado en msalConfig.ts
        // MSAL te redirigirá a la URL del Flujo de Usuario que definiste en el paso 1.
        instance.loginRedirect(loginRequest); 
    };

// ...

    // 4. Logout (Unificado)
    const handleLogout = () => {
        // En una app real, debería llamar a su backend para invalidar el JWT propio
        // Luego, limpia el token de sesión y la caché de MSAL.
        instance.logoutRedirect();
    };


    // 5. Renderizado Condicional de Botones
    // Reemplazar renderLoginButtons() con:
    const renderLoginButton = () => {
        return (
            <button 
                disabled={inProgress !== InteractionStatus.None} 
                onClick={handleB2CLogin} 
                className="login-button b2c-button"
                style={{ backgroundColor: '#0078D4' }} // Color de Microsoft
            >
                Iniciar Sesión con RIY Clientes
            </button>
        );
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Bienvenido a RIY-DATOS</h2>
                <p>Selecciona tu método de autenticación:</p>
                
                {renderLoginButton()}

                {/* Bloque de Cierre de Sesión y Emergencia (Mantenemos la solución de emergencia) */}
                {/* ... (Puede mantener el bloque de emergencia si lo considera necesario) ... */}
                {isAuthenticated && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                        <p className="small-text">Sesión Activa. Si tiene problemas, intente limpiar:</p>
                        <button onClick={handleLogout} className="logout-button">
                            Cerrar Sesión (Limpiar Cache)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};