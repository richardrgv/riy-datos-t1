// src/utils/menu-helper.ts

// Define la interfaz para los datos de la base de datos
interface MenuItem {
    menu_id: number;
    papa_id: number | null;
    nombre: string;
    // ... otros campos
}

// Define la interfaz para la estructura de árbol
interface MenuNode extends MenuItem {
    children: MenuNode[];
}

export const buildMenuTree = (flatList: MenuItem[]): MenuNode[] => {
    const map = new Map<number, MenuNode>();
    const tree: MenuNode[] = [];

    // Mapea cada item por su ID
    flatList.forEach(item => {
        map.set(item.menu_id, { ...item, children: [] });
    });

    // Construye la estructura de árbol
    map.forEach(node => {
        if (node.papa_id === null) {
            // Es un nodo raíz, lo agregamos al árbol principal
            tree.push(node);
        } else {
            // No es un nodo raíz, lo agregamos como hijo de su padre
            const parent = map.get(node.papa_id);
            if (parent) {
                parent.children.push(node);
            }
        }
    });

    return tree;
};