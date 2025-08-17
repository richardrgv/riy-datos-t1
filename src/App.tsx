// src/App.tsx

import { useState, useEffect } from 'react';
//import { invoke } from '@tauri-apps/api/tauri';
import CredentialScreen from './components/CredentialScreen';
import LoginScreen from './components/LoginScreen';
import { LicenseCheckResult, LicenseStatus } from './types/license';
import MainLayout from './components/MainLayout';
import './App.css';
import { HashRouter } from 'react-router-dom';
import { PermissionProvider } from './contexts/PermissionContext';
import { UserProvider } from './contexts/UserContext'; // <-- Agregado
// web
//import { apiService } from './utils/api-service'; // <-- ¡Cambio clave aquí!
// Importa la función 'userLogin' directamente desde el módulo
import {checkLicenseStatus } from './utils/api-service';

type AppState = 'checking_db' | 'checking_license' | 'needs_credentials' | 'needs_login' | 'app_ready' | 'critical_error';

function App(): JSX.Element | null {
  const [appState, setAppState] = useState<AppState>('checking_db');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [licenseCheckResult, setLicenseCheckResult] = useState<LicenseCheckResult | null>(null);
  // no hay que quitar isLicenseValid
  const [isLicenseValid, setIsLicenseValid] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setErrorMessage('');
        console.log('Backend conectado a la DB. Procediendo con la lógica del frontend.');
        //const result = await invoke<LicenseCheckResult>('check_license_status_command');
        const result = await checkLicenseStatus();
        setLicenseCheckResult(result);

        if (result.status === LicenseStatus.Valid) {
          console.log('Licencia válida. Ir a Login.');
          setIsLicenseValid(true);
          setAppState('needs_login');
        } else {
          console.log('Licencia inválida o expirada. Solicitar credenciales.');
          setIsLicenseValid(false);
          setAppState('needs_credentials');
        }
      } catch (error: any) {
        console.error('Error durante la inicialización:', error);
        setErrorMessage(error.message || 'Error desconocido al iniciar la aplicación.');
        setAppState('critical_error');
      }
    };
    initializeApp();
  }, []);

  const handleCredentialsLoaded = (): void => {
    setAppState('needs_login');
  };

  const handleLoginSuccess = (): void => {
    setAppState('app_ready');
  };

  return (
    <HashRouter>
      <PermissionProvider>
        {/* Aquí va el UserProvider */}
        <UserProvider>
          {errorMessage && (
            <div className="app-loading-container">
              <div className="credential-form-card">
                <h2 className="credential-title app-error-title">Error Crítico</h2>
                <p>{errorMessage}</p>
                <p className="app-error-text">Por favor, revisa tu configuración o contacta al soporte.</p>
              </div>
            </div>
          )}
          {!errorMessage && (() => {
            switch (appState) {
              case 'checking_db':
              case 'checking_license':
                return (
                  <div className="app-loading-container">
                    <div className="credential-form-card">
                      <h2 className="credential-title">Cargando aplicación...</h2>
                      <p>Verificando conexión a base de datos y licencia.</p>
                    </div>
                  </div>
                );
              case 'needs_credentials':
                return <CredentialScreen licenseCheckResult={licenseCheckResult} onCredentialsLoaded={handleCredentialsLoaded} />;
              case 'needs_login':
                return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
              case 'app_ready':
                return <MainLayout />;
              default:
                return null;
            }
          })()}
        </UserProvider>
      </PermissionProvider>
    </HashRouter>
  );
}

export default App;