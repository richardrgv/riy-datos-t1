// src/components/LoginPage.tsx

import React from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../msalConfig'; // Importamos los scopes de la configuración

export const LoginPage = () => {
  // Obtener la instancia de MSAL
  const { instance } = useMsal();

  const handleLogin = () => {
    // Inicia el flujo de redirección al portal de Microsoft
    instance.loginRedirect(loginRequest)
      .catch(e => {
        console.error("Error al iniciar sesión:", e);
      });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Bienvenido a RIY-DATOS</h2>
        <p>Por favor, usa tu cuenta de Microsoft 365 para continuar.</p>
        <button 
          onClick={handleLogin} 
          className="login-button"
        >
          Iniciar Sesión con Microsoft
        </button>
      </div>
    </div>
  );
};