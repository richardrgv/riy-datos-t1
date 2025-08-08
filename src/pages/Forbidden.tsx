// src/pages/Forbidden.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Acceso Denegado</h2>
      <p>No tienes permiso para acceder a esta página.</p>
      <button 
        onClick={() => navigate('/')} 
        style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
      >
        Volver al Inicio
      </button>
    </div>
  );
};

export default Forbidden;