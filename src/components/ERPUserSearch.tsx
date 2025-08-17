// src/components/ERPUserSearch.tsx
import React, { useState } from 'react';
//import { invoke } from '@tauri-apps/api/tauri';
import { UserSearchResult } from '../types/user'; // Asegúrate de que exista este tipo
import './ERPUserSearch.css';
import { searchErpUsers } from '../utils/api-service'; // <-- Importa la función del servicio de API

interface ERPUserSearchProps {
  onUserSelected: (user: UserSearchResult) => void;
  onCancel: () => void;
}

const ERPUserSearch: React.FC<ERPUserSearchProps> = ({ onUserSelected, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() === '') return;

    setIsLoading(true);
    try {
      // Usa la función de la API que maneja tanto Tauri como la web
      const users = await searchErpUsers(searchTerm);
      setResults(users);
    } catch (error) {
      console.error('Error al buscar usuarios del ERP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="erp-search-container modal-backdrop">
      <div className="erp-search-card">
        <h2>Buscar Usuario en ERP</h2>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuario o nombre"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        <div className="results-list">
          {results.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((user) => (
                  <tr key={user.usuario}>
                    <td>{user.usuario}</td>
                    <td>{user.nombre}</td>
                    <td>
                      <button onClick={() => onUserSelected(user)}>Seleccionar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No se encontraron resultados.</p>
          )}
        </div>
        <button onClick={onCancel} className="cancel-button">Cancelar</button>
      </div>
    </div>
  );
};

export default ERPUserSearch;