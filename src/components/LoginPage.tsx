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
    
    // --- Handlers de Autenticación Unificados ---
    
    // 1. Google Login (Redirección simple, ya que no usamos el SDK)
    const handleGoogleLogin = () => {
        window.location.href = GOOGLE_AUTH_URL;
    };
    
    // 2. Microsoft Login Corporativo (Entra ID, su flujo actual)
    const handleMicrosoftCorpLogin = () => {
        // Su implementación actual de MSAL por redirección
        instance.loginRedirect(loginRequest).catch(e => {
            console.error("Error al iniciar login MSAL corporativo:", e);
        });
    };
    
    // 3. Microsoft Login Personal (MSA)
    const handleMicrosoftPersonalLogin = () => {
        const msalPersonalRequest = getMsalPersonalLoginRequest();
        instance.loginRedirect(msalPersonalRequest).catch(e => {
             console.error("Error al iniciar login MSAL personal:", e);
        });
    };
    
    // 4. Logout (Unificado)
    const handleLogout = () => {
        // En una app real, debería llamar a su backend para invalidar el JWT propio
        // Luego, limpia el token de sesión y la caché de MSAL.
        instance.logoutRedirect();
    };


    // 5. Renderizado Condicional de Botones
    const renderLoginButtons = () => {
        // Si estamos en Tauri, podríamos querer deshabilitar/cambiar los flujos MSAL (si no están configurados)
        const isMsalTauriReady = false; // 👈 Cambie a true cuando configure Azure para Tauri
        
        return (
            <div className="login-buttons-group">
                {/* Botón 1: Google (Funciona igual en Web y Tauri con el flujo de código) */}
                <button 
                  disabled={inProgress !== InteractionStatus.None} 
                  onClick={handleGoogleLogin} 
                  className="login-button google-button"
                  style={{ backgroundColor: '#DB4437' }}
                >
                  Iniciar Sesión con Google
                </button>

                {/* Botón 2: Microsoft Corporativo (Su actual Entra ID) */}
                <button 
                  disabled={inProgress !== InteractionStatus.None || (isTauri && !isMsalTauriReady)} 
                  onClick={handleMicrosoftCorpLogin} 
                  className="login-button microsoft-corp-button"
                  style={{ backgroundColor: '#0078D4' }}
                >
                  Iniciar Sesión con Microsoft 365 (Empresa)
                </button>
                
                 {/* Botón 3: Microsoft Personal (MSA) */}
                <button 
                  disabled={inProgress !== InteractionStatus.None || (isTauri && !isMsalTauriReady)} 
                  onClick={handleMicrosoftPersonalLogin} 
                  className="login-button microsoft-personal-button"
                  style={{ backgroundColor: '#FFB900' }}
                >
                  Iniciar Sesión con Cuenta Personal
                </button>
            </div>
        );
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Bienvenido a RIY-DATOS</h2>
                <p>Selecciona tu método de autenticación:</p>
                
                {renderLoginButtons()}

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