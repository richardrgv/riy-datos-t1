// src/components/LoginMSALPage.tsx

import React,  { useState } from 'react';
import { useMsal } from '@azure/msal-react';
// 🚨 Importa el estado de la interacción
import { InteractionStatus } from '@azure/msal-browser'; 
import { loginRequest } from '../msalConfig'; 

// 🚨 1. DEFINE LA INTERFAZ DE PROPS
interface LoginMSALPageProps {
    handleLogin: () => void; // Especifica que es una función sin argumentos que no devuelve nada
}

//export const LoginMSALPage = () => {
export const LoginMSALPage: React.FC<LoginMSALPageProps> = ({ handleLogin }) => {
     // 1. Destructurar 'inProgress' (el estado de interacción)
    const { instance, inProgress } = useMsal(); 
    
    // 2. Use instance.getAllAccounts() to get the actual accounts array
    const accounts = instance.getAllAccounts();
    const isAuthenticated = accounts.length > 0;

    // 🚨 NUEVO ESTADO PARA EL CAMPO DE TEXTO
    const [redirectUrl, setRedirectUrl] = useState('');
    
    // Función para manejar el cierre de sesión
    const handleLogout = () => {
        console.log("Iniciando cierre de sesión para limpiar caché...");
        // Llama a logoutRedirect sin parámetros o sin postLogoutRedirectUri
        instance.logoutRedirect(); 
        /*instance.logoutRedirect({
            // ✅ CRÍTICO: La URL que debe coincidir con la de "URL de cierre de sesión" en Azure.
            postLogoutRedirectUri: "http://localhost:1423/logout" 
        });*/
    };

    // 🚨 FUNCIÓN CRÍTICA: PROCESAR LA URL PEGA MANUALMENTE
    const handleProcessRedirect = () => {
        if (redirectUrl && redirectUrl.includes('#code=')) {
            try {
                // 1. Extraemos solo el hash (el #code=...) de la URL completa
                const hash = new URL(redirectUrl).hash; 
                
                // 2. Colocamos el hash en la URL actual de la aplicación
                window.location.hash = hash; 
                
                // 3. Forzamos una recarga. Esto activa el useEffect de AuthProvider
                //    para que MSAL intente leer el hash que acabamos de setear.
                window.location.reload(); 
            } catch (e) {
                console.error("Error al procesar la URL. Asegúrate de que la URL es válida.", e);
            }
        }
    };


    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Bienvenido a RIY-DATOS</h2>
                <p>Usa tu cuenta corporativa para iniciar sesión.</p>
                <button 
                  // Deshabilitado si el estado es 'Login', 'AcquireToken', 'Redirect', etc.
                  disabled={inProgress !== InteractionStatus.None} 
                  onClick={handleLogin} 
                  className="login-button"
                >
                  Iniciar Sesión con Microsoft
                </button>

                 {/* 🚨 NUEVO BLOQUE: Manejo manual para evitar el bloqueo */}
                <hr style={{margin: '20px 0'}} />
                <h3>Paso 2: Solución de Emergencia</h3>
                <p>Si la pantalla se queda en blanco, pega la URL completa de Microsoft aquí.</p>
                <input 
                    type="text"
                    placeholder="Pega aquí la URL completa con el #code=..."
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    style={{width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc'}}
                />
                <button 
                    onClick={handleProcessRedirect}
                    // Solo habilitado si el input parece contener una URL de código
                    disabled={!redirectUrl.includes('#code=')}
                    style={{backgroundColor: '#007bff', color: 'white', padding: '10px', border: 'none'}}
                >
                    Procesar URL de Autenticación
                </button>
                
                {/* 2. Botón de Cerrar Sesión (Condicional) */}
                {isAuthenticated && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                        <p className="small-text">Parece que hay una sesión activa. Si tienes problemas, intenta limpiarla:</p>
                        <button 
                            onClick={handleLogout} 
                            className="logout-button" // Usa una clase diferente si es posible
                            style={{ backgroundColor: '#dc3545', color: 'white' }}
                        >
                            Cerrar Sesión (Limpiar Cache)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};