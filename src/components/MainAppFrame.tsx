/*
2025-07-23  RichardG    Main Frame
*/
//import React from 'react';
import { appWindow } from '@tauri-apps/api/window';

function MainAppFrame(): JSX.Element {
  const handleExit = (): void => {
    appWindow.close();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Barra de Título/Menú Superior (simulada) */}
      <div className="bg-blue-600 text-white p-2 flex justify-between items-center">
        <h1 className="text-lg font-bold">RIY Datos - Aplicación Principal</h1>
        <div className="flex space-x-2">
          {/* Icono de Ayuda */}
          <button className="p-1 rounded hover:bg-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9.247a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM15 12h-2.25m-2.25 0H12m0 0v2.25m0-2.25V9m3.75-5.25v.001m-2.25 2.25v.001m-.002 2.25v.001M16.5 10.5v.001m-2.25 2.25v.001m-.002 2.25v.001M16.5 15v.001m-2.25-2.25v.001m-.002 2.25v.001M19.5 9v.001m-2.25 2.25v.001m-.002 2.25v.001M19.5 13.5v.001m-2.25-2.25v.001m-.002 2.25v.001M12 18h-2.25m-2.25 0H12m0 0v2.25m0-2.25V18m3.75-5.25v.001m-2.25 2.25v.001m-.002 2.25v.001" />
            </svg>
          </button>
          {/* Botón Salir (Cerrar Aplicación) */}
          <button onClick={handleExit} className="p-1 rounded hover:bg-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Área de Módulos / Contenido Principal */}
      <div className="flex flex-1">
        {/* Barra Lateral de Módulos (simulada) */}
        <div className="w-48 bg-gray-800 text-white p-4">
          <p className="font-bold mb-4">Módulos:</p>
          <ul className="space-y-2">
            <li><button className="w-full text-left p-2 rounded hover:bg-gray-700">Usuarios</button></li>
            <li><button className="w-full text-left p-2 rounded hover:bg-gray-700">Vistas</button></li>
            <li><button className="w-full text-left p-2 rounded hover:bg-gray-700">Seguridad</button></li>
            <li><button className="w-full text-left p-2 rounded hover:bg-gray-700">Consultas</button></li>
            {/* ... otros módulos ... */}
          </ul>
        </div>

        {/* Contenido Dinámico (donde se cargarían las Sheets/Responses) */}
        <div className="flex-1 p-4 bg-gray-50 overflow-auto">
          <h2 className="text-xl font-bold mb-4">Bienvenido a RIY Datos</h2>
          <p>Selecciona un módulo de la izquierda para empezar.</p>
          {/* Aquí se cargarían los componentes de las Sheets/Responses */}
        </div>
      </div>
    </div>
  );
}

export default MainAppFrame;