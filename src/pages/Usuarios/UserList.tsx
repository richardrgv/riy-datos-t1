// src/pages/UserList.tsx

import React, { useState, useEffect } from 'react';
import ListaDeUsuariosContent from '../../components/ListaDeUsuariosContent';
import { getUsers } from '../../services/user-service'; // Aquí está la ÚNICA llamada a la API

interface User {
    id: number;
    nombre: string;
    // ...
}

const UserList = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await getUsers();
                setUsers(data);
            } catch (err) {
                console.error('Error fetching users:', err);
                setError('Error al cargar la lista de usuarios.');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    if (loading) {
        return <div>Cargando usuarios...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return <ListaDeUsuariosContent users={users} />;
};

export default UserList;