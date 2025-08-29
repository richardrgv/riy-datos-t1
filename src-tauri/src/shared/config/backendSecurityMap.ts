// src-tauri/src/shared/config/backendSecurityMap.ts

// Tipo para los filtros de seguridad individuales (ej. 'Centro Costo' o 'Sucursal')
export interface SecurityFilter {
    security_field_name: string;      // Nombre de la columna en la base de datos
    user_attribute: string;           // Atributo del usuario que contiene los valores de seguridad
    type: 'internal' | 'external_erp';  // ⭐ Tipo de seguridad: interna o externa
    source_table?: string;            // ⭐ Opcional, solo si el tipo es 'external_erp'
    user_id_field?: string;           // ⭐ Opcional, el campo en la tabla externa que mapea al usuario
}

// Mapa que asocia cada vista a un array de filtros de seguridad
export interface BackendSecurityMap {
    [viewId: string]: SecurityFilter[];
}

// Tu mapa de configuración, ahora tipado y con el tipo de seguridad incluido
export const backendSecurityMap: BackendSecurityMap = {
    'ventas_view': [
        // Seguridad por fila INTERNA
        {
            security_field_name: 'centro_costo',
            user_attribute: 'centros_costo',
            type: 'internal',
        },
        // Seguridad por fila EXTERNA
        {
            security_field_name: 'sucursal_id',
            user_attribute: 'sucursales',
            type: 'external_erp',
            source_table: 'erp_user_sucursales',
        }
    ],
    'produccion_view': [
        {
            security_field_name: 'sucursal_id',
            user_attribute: 'sucursales',
            type: 'internal',
        }
    ],
    'gastos_operativos_view': [
        {
            security_field_name: 'afe_id',
            user_attribute: 'afes',
            type: 'internal',
        }
    ],
};