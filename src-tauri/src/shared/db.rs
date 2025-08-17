/* 2025-07-23  RichardG    db
2025-07-24  RichardG    obtener aplicativo ID      
2025-08-09  RichardG    no usar AppState, por App Web
*/

//use tauri::State;
//use crate::AppState; 

use sqlx::{Pool, Mssql};
use sqlx::mssql::MssqlPoolOptions;
use url::Url;

/// Conecta a la base de datos usando la URL proporcionada.
pub async fn connect_db(database_url: &str
    ) -> Result<Pool<Mssql>, String> {
    println!("Connecting to database at: {}", database_url);

    let pool = MssqlPoolOptions::new()
        .max_connections(5)
        .min_connections(1)
        // Eliminamos la siguiente línea que causa el error
        // .connect_timeout(Duration::from_secs(10)) 
        .connect(database_url)
        .await
        .map_err(|e| format!("Error connecting to database: {}", e))?;

    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Error pinging database: {}", e))?;

    println!("Database connection pool established.");
    Ok(pool)
}

/// Obtiene el ID del aplicativo de la tabla rir.riy_SeguridadAplicativo
pub async fn get_aplicativo_id(pool: &Pool<Mssql>, app_code: &str
    ) -> Result<i32, String> {
     let (aplicativo_id,) = sqlx::query_as::<_, (i32,)>(
        "SELECT aplicativoID 
         FROM riy.riy_SeguridadAplicativo WITH(NOLOCK)
         WHERE aplicativo = @p1")
        .bind(app_code) // <-- El `app_code` se usa para filtrar la consulta
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Error al obtener el aplicativoID: {}", e))?;

     // No necesitas la línea `row.try_get` porque ya has extraído el valor directamente.
    Ok(aplicativo_id)
}

pub fn parse_mssql_connection_url(url: &str
    ) -> Result<(String, String), String> {
    let parsed_url = Url::parse(url)
        .map_err(|e| format!("Error al parsear la URL de conexión: {}", e))?;

    let host = parsed_url.host_str().unwrap_or("").to_string();
    let db_name = parsed_url.path_segments().and_then(|mut p| p.next()).unwrap_or("").to_string();

    if host.is_empty() || db_name.is_empty() {
        return Err(format!("URL de conexión de MSSQL inválida: {}", url));
    }

    Ok((host, db_name))
}

// no es Tauri
pub async fn get_db_connection_info(database_url: &str
    ) -> Result<(String, String), String> {
    let (server_name, db_name) = 
        parse_mssql_connection_url(database_url)?;
    Ok((server_name, db_name))
}

// Función auxiliar para normalizar el nombre del servidor (quitar el \INSTANCIA)
pub fn normalize_server_name(server_name: &str) -> &str {
    server_name.split('\\').next().unwrap_or(server_name)
}