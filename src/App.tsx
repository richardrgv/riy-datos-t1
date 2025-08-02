/*
2025-07-23  RichardG    Orquestador
*/
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import CredentialScreen from './components/CredentialScreen';
import LoginScreen from './components/LoginScreen';
import MainAppFrame from './components/MainAppFrame';
import { LicenseCheckResult, LicenseStatus } from './types/license'; // Importa los tipos


// Definición de tipos para el estado de la aplicación
type AppState = 'checking_db' | 'checking_license' | 'needs_credentials' | 'needs_login' | 'app_ready' | 'critical_error';
/*
interface DbConfig {
  serverName: string;
  dbName: string;
}*/
// se agregó: | null
function App(): JSX.Element | null { // Especifica que App devuelve un JSX.Element  // Estado para saber si la verificación de la licencia ha terminado
  
  const [appState, setAppState] = useState<AppState>('checking_db');
  const [errorMessage, setErrorMessage] = useState<string>('');
  //const [dbConfig, setDbConfig] = useState<DbConfig | null>(null);
  // Nuevo estado para almacenar el resultado de la verificación de la licencia
  const [licenseCheckResult, setLicenseCheckResult] = useState<LicenseCheckResult | null>(null);
  const [isLicenseValid, setIsLicenseValid] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setErrorMessage('');
        console.log('Backend conectado a la DB. Procediendo con la lógica del frontend.');

        // 2. Verificar el estado de la licencia
        // Ahora esperamos un objeto LicenseCheckResult, no un booleano
        const result = await invoke<LicenseCheckResult>('check_license_status_command');

        // Almacenamos el resultado completo en el estado
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
/*
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setErrorMessage('');
        // *** ELIMINA O COMENTA ESTA SECCIÓN ***
        // // 1. Intentar conectar a la DB
        // const dbConnected = await invoke<boolean>('check_and_connect_db'); // Esta línea causa el error
        // if (!dbConnected) {
        //   throw new Error('No se pudo conectar a la base de datos con la configuración actual.');
        // }
        // console.log('Conexión a la DB exitosa.'); // Este console.log se basa en la conexión Rust, no en esta invoke

        // Simplemente asume que la DB ya está conectada, porque tu backend ya lo hizo al inicio.
        console.log('Backend conectado a la DB. Procediendo con la lógica del frontend.');

         try {
            setErrorMessage('');
            console.log('Backend conectado a la DB. Procediendo con la lógica del frontend.');

            // 2. Verificar el estado de la licencia
            // Ahora esperamos un objeto LicenseCheckResult, no un booleano.
            const result = await invoke<LicenseCheckResult>('check_license_status_command');
            
            // Almacenamos el resultado completo en el estado.
            setLicenseCheckResult(result);

            if (result.status === LicenseStatus.Valid) {
                console.log('Licencia válida. Ir a Login.');
                setIsLicenseValid(true);
                setAppState('needs_login');
            } else {
                console.log(`Licencia inválida (${result.message}). Solicitando credenciales.`);
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
*/





  /*
        // 2. Verificar el estado de la licencia
        const licenseValid = await invoke<boolean>('check_license_status_command'); // Especifica el tipo de retorno
        if (licenseValid) {
          console.log('Licencia válida. Ir a Login.');
          setAppState('needs_login');
        } else {
          console.log('Licencia inválida o expirada. Solicitar credenciales.');
          
          setAppState('needs_credentials');
        }
      } catch (error: any) { // Usamos 'any' para capturar cualquier tipo de error
        console.error('Error durante la inicialización:', error);
        setErrorMessage(error.message || 'Error desconocido al iniciar la aplicación.');
        setAppState('critical_error'); // Cambiar a estado de error crítico
      }
    };

    initializeApp();
  },  []);
  */
  const handleCredentialsLoaded = (): void => {
    setAppState('needs_login');
  };

  const handleLoginSuccess = (): void => {
    setAppState('app_ready');
  };

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded shadow-md text-red-600">
          <h2 className="text-xl font-bold mb-4">Error Crítico</h2>
          <p>{errorMessage}</p>
          <p className="mt-4 text-sm text-gray-500">Por favor, revisa tu configuración o contacta al soporte.</p>
        </div>
      </div>
    );
  }

  switch (appState) {
    case 'checking_db':
    case 'checking_license':
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="p-8 bg-white rounded shadow-md">
            <h2 className="text-xl font-bold">Cargando aplicación...</h2>
            <p>Verificando conexión a base de datos y licencia.</p>
          </div>
        </div>
      );
    
    case 'needs_credentials':
      // --- CAMBIO CLAVE AQUÍ: Eliminamos dbConfig={dbConfig} ---
      // Pasamos el resultado de la verificación como un prop al componente
      return <CredentialScreen licenseCheckResult=
        {licenseCheckResult} onCredentialsLoaded={handleCredentialsLoaded} />;

      //return <CredentialScreen onCredentialsLoaded={handleCredentialsLoaded} />;
    case 'needs_login':
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    case 'app_ready':
      return <MainAppFrame />;
    case 'critical_error':
      // El mensaje de error ya se muestra arriba
      return null;
    default:
      return null;
  }
}

export default App;




/*import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";

import React, { useState, useEffect } from 'react';
//import { invoke } from '@tauri-apps/api/tauri';
import CredentialScreen from './components/CredentialScreen';
import LoginScreen from './components/LoginScreen';
import MainAppFrame from './components/MainAppFrame';

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://v1.tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>
    </main>
  );
}

export default App;
*/