// src/components/ListaDeRolesContent.tsx
/*
It is the child component (the "presentational" one). 
Its job is simply to display the data it receives. It's the "dumb" one.
*/
import React from 'react';

// Define the interface for a single role
interface Role {
  id: number;
  name: string;
}

// Define the props for this component
interface Props {
  roles: Role[];
}

const ListaDeRolesContent: React.FC<Props> = ({ roles }) => {
  return (
    <div>
      <h2>Lista de Roles</h2>
      {roles.length === 0 ? (
        <p>No se encontraron roles.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre del Rol</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.id}</td>
                <td>{role.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ListaDeRolesContent;