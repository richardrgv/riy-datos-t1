// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react'; // Importar MsalProvider
import App from './App.tsx';

import { msalInstance } from './msalConfig.ts'; // Asume que msalConfig.ts está correcto
//import { UserProvider } from './contexts/UserContext.tsx'; // 👈 Import the Provider
// 🚨 NUEVA IMPORTACIÓN: Tu capa de lógica encapsulada
import { AuthProvider } from './contexts/AuthContext'; 
import { BrowserRouter } from 'react-router-dom'; // 

// 1. Obtener el elemento DOM
const rootElement = document.getElementById('root');

if (rootElement) {
    msalInstance.initialize().then(() => { 
        
        // 🚨 BLOQUE CRÍTICO AÑADIDO: MANEJO DE REDIRECCIÓN
        // Esto le dice a MSAL que revise la URL en busca del token.
        msalInstance.handleRedirectPromise().catch((error) => {
            // Manejar errores si MSAL no pudo procesar la redirección (ej. token expirado)
            console.error("Error al procesar la redirección en main.tsx:", error);
        }).finally(() => {
            
            // 2. Renderizar React SÓLO después de que MSAL ha terminado de procesar la redirección
            ReactDOM.createRoot(rootElement).render(
                <React.StrictMode>
                    <BrowserRouter> {/* ✅ ÚNICO LUGAR DEL ROUTER */}
                        <MsalProvider instance={msalInstance}>
                            <AuthProvider>
                                <App /> 
                            </AuthProvider>
                        </MsalProvider>
                    </BrowserRouter>
                </React.StrictMode>,
            );
        }); // Cierre del .finally()

    }).catch((error) => {
        console.error("Error FATAL al inicializar MSAL:", error);
    });
}
  