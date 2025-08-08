// src/components/UsersPage.tsx

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Usuario, UserSearchResult } from '../types/user';
import DataForm from './DataForm';
import ERPUserSearch from './ERPUserSearch';
import ListaDeUsuariosContent from './ListaDeUsuariosContent'; // Suponiendo que este es el nombre de tu componente
import './UsersPage.css';

// ... (fetchUsers y otros handlers se mantienen igual) ...

type AddUserFlow = 'initial' | 'search_erp' | 'fill_data';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [formMode, setFormMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedUser, setSelectedUser] = useState<Usuario | undefined>(undefined);
  const [addUserFlow, setAddUserFlow] = useState<AddUserFlow>('initial');
  const [selectedERPUser, setSelectedERPUser] = useState<UserSearchResult | null>(null);

  // ... (fetchUsers se mantiene igual) ...

  useEffect(() => {
    fetchUsers();
  }, []);

  // Nuevo handler que será pasado a ListaDeUsuariosContent
  const handleAddUser = () => {
    setFormMode('add');
    setSelectedUser(undefined);
    setAddUserFlow('search_erp'); // Inicia el flujo de búsqueda en el ERP
  };
  
  // Handler para cuando un usuario es seleccionado en el ERP
  const handleERPUserSelected = (erpUser: UserSearchResult) => {
    setSelectedERPUser(erpUser);
    setAddUserFlow('fill_data');
  };

  const handleCancelAddUser = () => {
    setSelectedUser(undefined);
    setAddUserFlow('initial');
    setSelectedERPUser(null);
  };
  
  const handleFormSave = async (formData: Partial<Usuario>) => {
    try {
        // Lógica de guardado que llama a `add_user_from_erp`
      if (formMode === 'add') {
          const result = await invoke('add_user_from_erp', { 
            usuario: formData.usuario,
            nombre: formData.nombre,
            correo: formData.correo,
            usuario_conectado: "usuario_actual" // Reemplaza con el usuario conectado
          });
        console.log('Usuario agregado:', result);
      } else if (formMode === 'edit') {
        const result = await invoke('update_user', { usuario_data: formData as Usuario });
        console.log('Usuario actualizado:', result);
      }
      handleCancelAddUser();
      fetchUsers();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  // ... (Otros handlers como handleOpenEdit, etc.) ...
  const isFormOpen = addUserFlow !== 'initial';

  return (
    <div className="users-page-container">
      <h1>Gestión de Usuarios</h1>
      
      <ListaDeUsuariosContent
        users={users}
        onAddUser={handleAddUser}
        // Pasamos otros handlers para editar, ver, etc.
      />
      
      {isFormOpen && addUserFlow === 'search_erp' && (
        <ERPUserSearch
          onUserSelected={handleERPUserSelected}
          onCancel={handleCancelAddUser}
        />
      )}

      {isFormOpen && addUserFlow === 'fill_data' && (
        <DataForm
          fields={userFields}
          mode={formMode}
          initialData={{
            usuario: selectedERPUser?.usuario || '',
            nombre: selectedERPUser?.nombre || '',
            correo: '',
            estado: 'Vigente',
          } as Usuario}
          onSave={handleFormSave}
          onClose={handleCancelAddUser}
        />
      )}
      
      {isFormOpen && formMode === 'edit' && (
        <DataForm
          fields={userFields}
          mode={formMode}
          initialData={selectedUser}
          onSave={handleFormSave}
          onClose={handleCancelAddUser}
        />
      )}
    </div>
  );
};

export default UsersPage;