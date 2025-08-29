// src/App.tsx

/*
1. Orquestador de Inicialización: Controla el flujo de inicio de la aplicación, 
verificando pasos críticos como la conexión a la base de datos o el estado de la licencia.

2. Muestra Pantallas de Estado: Renderiza diferentes componentes (CredentialScreen, 
una pantalla de carga o una pantalla de error) dependiendo del estado de la aplicación 
(checking_db, needs_credentials, error).

3. Encapsula la Aplicación: Una vez que todas las verificaciones iniciales son exitosas (app_ready), 
envuelve toda la aplicación con proveedores de contexto clave, como UserProvider, 
y luego le cede el control al enrutador principal, AppRouter.
*/

// src/App.tsx

import React, { useState, useEffect } from 'react';
import AppRouter from './routes/AppRouter';
import CredentialScreen from './components/CredentialScreen';
import { UserProvider } from './contexts/UserContext';
import { checkLicenseStatus } from './utils/api-service';
import { LicenseCheckResult, LicenseStatus } from './types/license';
import './App.css';

type AppState = 'checking_db' | 'needs_credentials' | 'needs_login' | 'app_ready' | 'error';

const App = () => {
    const [appState, setAppState] = useState<AppState>('checking_db');
    const [licenseCheckResult, setLicenseCheckResult] = useState<LicenseCheckResult | null>(null);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const result = await checkLicenseStatus();
                setLicenseCheckResult(result);
                if (result.status === LicenseStatus.Valid) {
                    // Si la licencia es válida, el siguiente paso es el login
                    setAppState('app_ready');
                } else {
                    setAppState('needs_credentials');
                }
            } catch (error) {
                console.error('Error durante la inicialización:', error);
                setAppState('error');
            }
        };
        initializeApp();
    }, []);

    const handleCredentialsLoaded = () => setAppState('app_ready');

    switch (appState) {
        case 'checking_db':
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
        
        // ⭐ Este es el cambio más importante: app_ready ahora renderiza el AppRouter
        case 'app_ready':
            return (
                <UserProvider>
                    <AppRouter />
                </UserProvider>
            );

        case 'error':
            return (
                <div className="app-error-container">
                    <div className="credential-form-card">
                        <h2 className="credential-title app-error-title">Error Crítico</h2>
                        <p>No se pudo conectar al backend o verificar la licencia.</p>
                        <p className="app-error-text">Por favor, revisa tu configuración o contacta al soporte.</p>
                    </div>
                </div>
            );
        default:
            return null;
    }
};

export default App;