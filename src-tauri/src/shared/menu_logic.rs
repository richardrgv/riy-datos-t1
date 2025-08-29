// src/shared/menu_logic.rs

use sqlx::{Pool, Mssql};
use crate::menu_models::MenuItem; // Asume que tus structs están en este path

pub async fn get_all_menus_logic(
    pool: &Pool<Mssql>,
    sql_collate_clause: &str,
) -> Result<Vec<MenuItem>, String> {
    let sql_query = format!(
        r#"
        SELECT
            menuID as menu_id,
            papaID as papa_id,
            nombre {0} as nombre,
            codigoPermiso {0} as codigo_permiso,
            tipoElemento {0} as tipo_elemento,
            segmentoRuta {0} as segmento_ruta,
            ruta {0} as ruta,
            orden as orden,
            autor {0} as autor,
            CONVERT(VARCHAR, fechaCreacion, 120) {0} as fecha_creacion,
            modificadoPor {0} as modificado_por,
            CONVERT(VARCHAR, fechaModificacion, 120) {0} as fecha_modificacion
        FROM riy.riy_SeguridadMenu WITH(NOLOCK)
        "#,
        sql_collate_clause
    );
    
    let menus = sqlx::query_as::<_, MenuItem>(&sql_query)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al leer todos los umenú ítems: {}", e))?;

    Ok(menus)
}