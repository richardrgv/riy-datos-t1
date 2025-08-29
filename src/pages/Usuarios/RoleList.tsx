// src/pages/Usuarios/RoleList.tsx
/*
It is the parent component (the "container"). 
Its job is to handle the business logic, like fetching data from an API. 
It's the "smart" one.
*/
import React, { useState, useEffect } from 'react';
import ListaDeRolesContent from '../../components/ListaDeRolesContent';

const RoleList = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    // Simular la obtención de datos
    const fetchFakeData = () => {
      setLoading(true);
      setTimeout(() => {
        setRoles([
          { id: 1, name: 'Administrador' },
          { id: 2, name: 'Editor' },
          { id: 3, name: 'Lector' },
        ]);
        setLoading(false);
      }, 1000); // Simula una carga de 1 segundo
    };
    fetchFakeData();
  }, []);

  if (loading) {
    return <div>Cargando lista de roles...</div>;
  }

  return <ListaDeRolesContent roles={roles} />;
  /*
  return (
    <div>
      <h2>Lista de Roles</h2>
      {roles.map(role => (
        <div key={role.id}>{role.name}</div>
      ))}
    </div>
  );
  */
};

export default RoleList;