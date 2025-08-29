// src/components/Sidebar.tsx o MainMenu.tsx

import React, { useState, useEffect } from 'react';
import { getMenus } from '../services/menu-service';
import { buildMenuTree } from '../utils/menu-helper';

const Sidebar = () => {
    const [menuItems, setMenuItems] = useState<any[]>([]);

    useEffect(() => {
        const fetchMenus = async () => {
            try {
                const flatList = await getMenus();
                const menuTree = buildMenuTree(flatList);
                setMenuItems(menuTree);
                console.log(menuTree); // ¡Ahora puedes ver la estructura de árbol!
            } catch (error) {
                console.error("Error al cargar los menús:", error);
            }
        };

        fetchMenus();
    }, []);

    // ... lógica para renderizar los elementos del menú
    // Puedes mapear menuItems y, si un item tiene children, renderizar un submenú
    // que se puede expandir o contraer.
};