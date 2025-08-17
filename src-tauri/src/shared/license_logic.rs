// src-tauri/src/shared/license_logic.rs

// Usa una ruta relativa para acceder a los otros módulos en la misma carpeta
use super::{db}; 

use sqlx::{Pool, Mssql, Row};
use chrono::NaiveDate; // Add the chrono import

use serde::{Serialize};

/*
#[derive(Debug, Serialize, Deserialize)]
struct LicenseData {
    hash_licencia_hex: Option<String>,
    fecha_caducidad_str: String,
    credencial_encriptada: String,
}
*/

#[derive(Debug, Serialize)]
pub enum LicenseStatus {
    Valid,
    Expired,
    NotFound,
    InvalidHash,
    Corrupted,
}

#[derive(Debug, Serialize)]
pub struct LicenseCheckResult {
    pub status: LicenseStatus,
    pub message: String,
}

// This function contains the core license checking logic.
pub async fn check_license_status(
    pool: &Pool<Mssql>,
    sql_collate_clause: &str,
    aplicativo_id: i32,
    palabra_clave2: &str,
    db_connection_url: &str, // Agrega la URL de conexión aquí
    aplicativo: &str,        // Agrega el nombre del aplicativo aquí
) -> Result<LicenseCheckResult, String> {
    eprintln!("license_logic: Iniciando la verificación de la licencia.");

    let sql_collate_clause_ref = sql_collate_clause;
    
    // Lock the necessary parts of parameters
    let app_id = aplicativo_id;
    let palabra_clave2 = palabra_clave2;
    
    // --- Get server and DB names from connection URL ---
    let (current_server_name, current_db_name) = 
        db::parse_mssql_connection_url(db_connection_url)?;
    let normalized_server_name = db::normalize_server_name(&current_server_name);
    eprintln!("license_logic: URL de conexión parseada. Servidor: {}, DB: {}", current_server_name, current_db_name);
    
    // --- Get current date from the DB server as VARCHAR ---
    let sql_query_dt = format!(
        "SELECT CONVERT(VARCHAR(10), GETDATE(), 120) {}", // 120 is 'yyyy-mm-dd'
        sql_collate_clause_ref
    );
    // CAMBIO CLAVE: Usa `fetch_optional` en lugar de `fetch_one`
    let server_date_option: Option<(String,)> = sqlx::query_as(&sql_query_dt)
        .fetch_optional(pool) // <-- Aquí está el cambio
        .await
        .map_err(|e| format!("Error getting DB server date: {}", e))?;
    
    // Ahora, `server_date_option` es un `Option`, y puedes usar `is_some()`
    eprintln!("license_logic: Fecha del servidor obtenida. Resultados encontrados: {}", server_date_option.is_some());

    // CAMBIO CLAVE: Aquí es donde extraes el valor del Option
    let server_date_result = server_date_option
        .ok_or_else(|| "No se pudo obtener la fecha del servidor de la base de datos".to_string())?;

    // Ahora, `server_date_result` existe y puedes usarlo
    let today: NaiveDate = NaiveDate::parse_from_str(&server_date_result.0, "%Y-%m-%d")
        .map_err(|e| format!("Error parsing server date: {}", e))?;

    
    let sql_query = format!(
        "SELECT hash_licencia_hex {0} as hash_licencia_hex,
                CONVERT(VARCHAR(20), fechaCaducidad, 120) {0} AS fecha_caducidad_str,
                credencial_encriptada {0} as credencial_encriptada
          FROM riy.riy_licencia WITH(NOLOCK)
          WHERE aplicativoID = @p1
            AND nombreServidor = @p2 {0}
            AND baseDatos = @p3 {0}",
        sql_collate_clause_ref
    );

    let license_row_option = sqlx::query(&sql_query)
        .bind(app_id)
        .bind(&current_server_name)
        .bind(&current_db_name)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error searching for license in DB: {}", e))?;
    eprintln!("license_logic: Búsqueda de licencia en la DB completada. Resultados encontrados: {}", license_row_option.is_some());

    if let Some(license_row) = license_row_option {
        let hash_almacenado_hex: Option<String> = license_row.try_get("hash_licencia_hex")
            .map_err(|e| format!("Error reading hash_licencia_hex: {}", e))?;

        if hash_almacenado_hex.is_none() {
            return Ok(LicenseCheckResult {
                status: LicenseStatus::InvalidHash,
                message: "License hash not found. Credentials are invalid.".to_string(),
            });
        }
        
        let hash_almacenado_string = hash_almacenado_hex.unwrap();

        let fecha_caducidad_str: String = license_row.try_get("fecha_caducidad_str")
            .map_err(|e| format!("Error reading fecha_caducidad_str: {}", e))?;
        
        let fecha_caducidad_almacenada_dt = match chrono::NaiveDateTime::parse_from_str(&fecha_caducidad_str, "%Y-%m-%d %H:%M:%S") {
            Ok(dt) => dt,
            Err(e) => {
                return Ok(LicenseCheckResult {
                    status: LicenseStatus::Corrupted,
                    message: format!("License format error: Expiration date is not a valid format. {}", e),
                });
            }
        };

        let string_for_hash = format!("{}|{}|{}|{}|{}",
                                     normalized_server_name,
                                     current_db_name,
                                     fecha_caducidad_almacenada_dt.date().format("%Y-%m-%d").to_string(),
                                     aplicativo,
                                     palabra_clave2);
        
        let new_hash_result: (i32,) = sqlx::query_as(
            "SELECT CHECKSUM(CAST(@p1 AS NVARCHAR(MAX)))"
        )
            .bind(string_for_hash)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Error generating CHECKSUM: {}", e))?;

        let computed_hash_string = new_hash_result.0.to_string();

        if computed_hash_string == hash_almacenado_string {
            if fecha_caducidad_almacenada_dt.date() >= today {
                return Ok(LicenseCheckResult {
                    status: LicenseStatus::Valid,
                    message: "Valid and current license.".to_string(),
                });
            } else {
                return Ok(LicenseCheckResult {
                    status: LicenseStatus::Expired,
                    message: "The license has expired. Please renew it.".to_string(),
                });
            }
        } else {
            return Ok(LicenseCheckResult {
                status: LicenseStatus::InvalidHash,
                message: "The license hash does not match. Invalid credentials.".to_string(),
            });
        }
    } else {
        eprintln!("license_logic: Verificación de licencia completada sin encontrar un error crítico.");
        return Ok(LicenseCheckResult {
            status: LicenseStatus::NotFound,
            message: "This is the first time the application has been started, or the license has been deleted.".to_string(),
        });
    }
}