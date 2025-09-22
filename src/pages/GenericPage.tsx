// src/pages/GenericPage.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';

const GenericPage = () => {
    return (
        <div className="g-container">
            <h1>En construcción.</h1>
            <p>...</p>
            <Outlet /> {/* Aquí se renderizarán los componentes hijos */}
        </div>
    );
};

export default GenericPage;