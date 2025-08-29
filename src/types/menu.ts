// src/types/menu.ts

export interface MenuItem {
    menu_id: number;
    papa_id: number | null;
    aplicativo_id: number;
    nombre: string;
    codigo_permiso: string;
    tipo_elemento: string;
    segmento_ruta: string;
    ruta: string;
    orden: number;
    autor: string;
    fecha_creacion: string; // O Date si usas un tipo de dato de fecha en JS
    modificado_por: string | null;
    fecha_modificacion: string | null;
}