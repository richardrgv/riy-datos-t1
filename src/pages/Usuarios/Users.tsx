// src/pages/Usuarios/Users.tsx

import React from 'react';
import WindowLayout from '../../layouts/WindowLayout';

const Users = () => {
    // Este componente actúa como un contenedor para las pestañas dentro del módulo
    // de "Administración Usuarios".
    // El WindowLayout maneja automáticamente la representación de pestañas
    // y el contenido de cada ruta hija.
    return (
        <WindowLayout />
    );
};

export default Users;
