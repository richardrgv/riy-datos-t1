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


import React from 'react';
// 🚨 NUEVA IMPORTACIÓN
import { useAuth } from './contexts/AuthContext'; 
import AppRouter from './routes/AppRouter';
import './App.css';


// 🚨 CAMBIO CRÍTICO: Importar el componente de login unificado
import { LoginPage } from './components/LoginPage'; 


const App = () => {
    const { authState, handleLogin, handleLogout } = useAuth(); // 👈 Asegúrese de exponer handleLogout
    
    // 🚨 Log para diagnóstico final
    console.log("APP.tsx RENDER: Estado de Autenticación:", authState); 

    switch (authState) {
        case 'loading':
            // Renderiza un spinner o pantalla de carga visible
            return <div className="app-loading-container"><h1>Cargando Aplicación...</h1></div>; 
        
        case 'needs_login':
               // 🚨 CAMBIO CRÍTICO: Usar LoginPage
            // Nota: handleLogin aquí ahora es una función que inicia el flujo de tu aplicación.
            return <LoginPage handleLogin={handleLogin} handleLogout={handleLogout} />; 
            
        case 'app_ready':
            // 3. Muestra la aplicación completa (el Router)
            // El AppRouter se encarga de llamar a MainLayout si el 'user' está en el contexto
            return <AppRouter />;
            
        case 'error':
            return <div className="app-error"><h1>ERROR FATAL</h1></div>; 
            
        default:
            return null;
    }
};

export default App;




/*
// El nuevo estado de 'loading_user_data' es importante
type AppState = 'checking_db' | 'needs_credentials' | 'needs_login' | 'loading_user_data' | 'app_ready' | 'error';

const App = () => {
    // 🚨 Log Crítico 1: Se ejecuta en cada renderizado (incluido el inicial)
    console.log("APP COMPONENT STARTING RENDER."); 

    const [appState, setAppState] = useState<AppState>('checking_db');
    const [licenseCheckResult, setLicenseCheckResult] = useState<LicenseCheckResult | null>(null);

    // Obtener la instancia de MSAL, el estado de progreso y las cuentas
    const { instance, inProgress, accounts } = useMsal(); 

    // Obtener funciones para llenar el contexto
    const { login, logout } = useUser(); 

    // Función auxiliar para manejar la carga de credenciales
    const handleCredentialsLoaded = () => setAppState('needs_login');

    // =========================================================================
    // 1. EFECTO DE FLUJO INICIAL: Avanza de la verificación a la autenticación.
    // =========================================================================
    useEffect(() => {
        console.log("useEffect 1.");
        // Esta lógica verifica la DB/Licencia y avanza el estado.
        const checkInitialFlow = async () => {
            if (appState === 'checking_db') {
                try {
                    // 🚨 AQUÍ DEBES PONER LA LÓGICA DE VERIFICACIÓN DE LICENCIA REAL
                    // Por ahora, solo simularemos que fue exitosa para pasar a login.
                    await new Promise(resolve => setTimeout(resolve, 500)); // Espera 0.5s

                    // Una vez que la DB/licencia es verificada, la app pide login.
                    setAppState('needs_login'); 
                    
                } catch (error) {
                    console.error("Fallo al verificar la licencia/DB:", error);
                    setAppState('error');
                }
            }
        };

        checkInitialFlow();
        
    }, [appState]); // Depende de appState para que se ejecute solo al inicio
    
    
    // =========================================================================
    // 2. EFECTO DE LOGIN EXITOSO: Maneja la Cuenta Almacenada en Caché
    //    Se ejecuta cuando MSAL tiene una cuenta (después del login o si ya estaba logueado).
    // =========================================================================
    useEffect(() => {
        
        const handleMsalSuccess = async (account: AccountInfo) => {
            setAppState('loading_user_data');
            
            try {
               // 🚨 CAMBIO CRÍTICO: Omitir acquireTokenSilent
                console.log("BYPASS: Omitiendo acquireTokenSilent. Usando ID Token de la cuenta.");

                // 1. Usar el ID Token o Access Token de la cuenta en caché
                //    (El Access Token solo está disponible si se almacena en caché)
                //    Usaremos el ID Token, que es el más probable de existir después del redirect.
                const msalAccessToken = account.idToken; 
                
                if (!msalAccessToken) {
                    // Si por alguna razón el token no existe, forzamos un error manejable
                    throw new Error("ID Token no encontrado en la cuenta post-redirección.");
                }
                
                // 🚨 LOG B: Bloqueo del Backend
                console.log("TRY: (B) Token disponible. Iniciando llamada a backend.");

                // 🚨 SIMULACIÓN CRÍTICA: Deshabilitar la llamada a processMSALLogin
                // const userData = await processMSALLogin(msalAccessToken); ⬅️ COMENTAR/ELIMINAR
                
                // 1. Simular la respuesta esperada por tu contexto de usuario
                const SIMULATED_USER_DATA = {
                    user: { username: account.username || "testuser", email: account.username, },
                    permissions: ["ADMIN", "USER"] 
                };
                // 🚨 LOG C: Contexto (Veremos si el contexto se llena)
                console.log("TRY: (C) Simulación exitosa. Llenando contexto.", SIMULATED_USER_DATA);

                // 2. Llenar el Contexto con datos simulados
                //login(SIMULATED_USER_DATA.user, SIMULATED_USER_DATA.permissions); 
                
                // 3. Pasar al estado final
                setAppState('app_ready');
                
                

                // 3. Llenar el Contexto
                //login(userData.user, userData.permissions); 
                //setAppState('app_ready');


            } catch (error) {
                // 🚨 CRITICAL CHANGE: Log the error regardless of its type 🚨
                console.error("🛑 ACQUIRE TOKEN SILENT FAILED. Error details:", error); 

                if (error instanceof InteractionRequiredAuthError) {
                    console.log("Token requires interaction (InteractionRequiredAuthError). Redirecting to login.");
                    // This is expected if the token is old or scopes changed
                    setAppState('needs_login'); 
                } else {
                    // This is an unexpected failure
                    console.error("🛑 CRITICAL ACQUIRE TOKEN FAILURE. Falling back to login."); 
                    setAppState('error'); // Set to error or fallback to login
                }
            }
        };

        // ⚠️ CONDICIÓN CRÍTICA: Solo si MSAL ha terminado la interacción y hay cuentas
        if (inProgress === InteractionStatus.None && accounts.length > 0) {
            handleMsalSuccess(accounts[0]);
        }
    // Dependencias: Re-ejecutar si el estado o las cuentas cambian.
     }, [inProgress, instance, login, accounts.length]); // 🚨 Reemplaza setUser/setPermissions por 'login'

    
    // =========================================================================
    // 3. LÓGICA DE RENDERIZADO (SWITCH)
    // =========================================================================
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
             
        case 'needs_login':
             // Pantalla de Login de Microsoft
             return <LoginMSALPage />;

        case 'loading_user_data':
             return (
                 <div className="app-loading-container"><p>Verificando permisos con el backend...</p></div>
             );


        case 'app_ready':
             // Aplicación lista, inicia el enrutador principal
             return <AppRouter />;

        case 'error':
             return (
                 <div className="app-error-container">
                     <div className="credential-form-card">
                         <h2 className="credential-title app-error-title">Error Crítico</h2>
                         <p>No se pudo completar el inicio o la validación.</p>
                         <p className="app-error-text">Por favor, revisa la consola para más detalles.</p>
                     </div>
                 </div>
             );
        default:
             return null;
    }
};

export default App;
*/