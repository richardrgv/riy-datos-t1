/*
2025-07-23  RichardG    license
2025-07-24  RichardG    usando aplicacionID y riy.riy_licencia
2025-07-25  RichardG    usar desencriptar
2025-07-31  RichardG    evitando PWDCOMPARE y PWDENCRYPT, manejando hashes en rust
2025-07-31  RichardG    Solución para NULL en hash_licencia_hex
2025-08-01  RichardG    Corregido bug de INSERT y añadido app_code al hash
2025-08-01  RichardG    Corregidos errores de concurrencia, bind de SQLx y validación de hash.
*/

use tauri::State;
use sqlx::{query};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use base64::{engine::general_purpose, Engine as _};
use hex;
use chrono::{NaiveDate, Utc};
use serde::{Serialize, Deserialize};

use crate::db;
use crate::AppState;

//use crate::shared::license_logic;
//use crate::shared::models::{AppState, LicenseCheckResult};
// Usa una ruta relativa para acceder a los otros módulos en la misma carpeta
use shared_lib::license_logic;
use shared_lib::db::normalize_server_name;

// Importa el struct LicenseCheckResult desde la librería compartida
use shared_lib::license_logic::{LicenseCheckResult};

#[derive(Debug, Serialize, Deserialize)]
struct LicenseData {
    hash_licencia_hex: Option<String>,
    fecha_caducidad_str: String,
    credencial_encriptada: String,
}



/// ----------------------------------------------------------------------------------
/// COMANDO: check_license_status_command
/// Verifica la validez y vigencia de la licencia consultando la DB.
/// ----------------------------------------------------------------------------------
#[tauri::command]
pub async fn check_license_status_command(state: State<'_, AppState>) -> Result<LicenseCheckResult, String> {
    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "DB pool not initialized".to_string())?;

   let aplicativo_id = *state.aplicativo_id.lock().await;

    // Llama a la función con los 6 argumentos necesarios
    license_logic::check_license_status(
        pool_ref,
        &state.sql_collate_clause,
        aplicativo_id,
        &state.palabra_clave2,
        &state.db_connection_url,
        &state.aplicativo,
    ).await
}
/* original antes de app web
#[tauri::command]
pub async fn check_license_status_command(state: State<'_, AppState>) -> Result<LicenseCheckResult, String> {
    let sql_collate_clause_ref: &str = &state.sql_collate_clause;
    
    let pool_ref = {
        let pool_guard = state.db_pool.lock().await;
        pool_guard.as_ref().ok_or_else(|| "Pool de DB no inicializado".to_string())?.clone()
    };
    
    let app_id_guard = state.aplicativo_id.lock().await;
    let app_id = *app_id_guard;
    let palabra_clave2 = &state.palabra_clave2;
    
    // --- CAMBIO CLAVE: Obtener nombres del servidor y la DB de la URL de conexión ---
    let (current_server_name, current_db_name) = db::parse_mssql_connection_url(&state.db_connection_url)?;
    let normalized_server_name = normalize_server_name(&current_server_name);

    // --- CORRECCIÓN CLAVE: Obtener la fecha actual del servidor DB como VARCHAR ---
    let sql_query_dt = format!(
        "SELECT CONVERT(VARCHAR(10), GETDATE(), 120) {0}", // 120 es el formato 'yyyy-mm-dd'
        sql_collate_clause_ref
    );
    let server_date_result: (String,) = sqlx::query_as(&sql_query_dt)
        .fetch_one(&pool_ref)
        .await
        .map_err(|e| format!("Error al obtener la fecha del servidor de DB: {}", e))?;
    
    // Parsear la cadena de texto a un NaiveDate en Rust
    let today: NaiveDate = NaiveDate::parse_from_str(&server_date_result.0, "%Y-%m-%d")
        .map_err(|e| format!("Error al parsear la fecha del servidor: {}", e))?;


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
        .bind(&current_server_name) // Usar el nombre de la URL para la búsqueda
        .bind(&current_db_name)     // Usar el nombre de la URL para la búsqueda
        .fetch_optional(&pool_ref)
        .await
        .map_err(|e| format!("Error al buscar licencia en DB: {}", e))?;

    if let Some(license_row) = license_row_option {
        let hash_almacenado_hex: Option<String> = license_row.try_get("hash_licencia_hex")
            .map_err(|e| format!("Error al leer hash_licencia_hex: {}", e))?;

        if hash_almacenado_hex.is_none() {
            return Ok(LicenseCheckResult {
                status: LicenseStatus::InvalidHash,
                message: "No se encontró el hash de licencia. Las credenciales son inválidas.".to_string(),
            });
        }
        
        let hash_almacenado_string = hash_almacenado_hex.unwrap();

        let fecha_caducidad_str: String = license_row.try_get("fecha_caducidad_str")
            .map_err(|e| format!("Error al leer fecha_caducidad_str: {}", e))?;
        
        let fecha_caducidad_almacenada_dt = match NaiveDateTime::parse_from_str(&fecha_caducidad_str, "%Y-%m-%d %H:%M:%S") {
            Ok(dt) => dt,
            Err(e) => {
                return Ok(LicenseCheckResult {
                    status: LicenseStatus::Corrupted,
                    message: format!("Error de formato en la licencia: La fecha de caducidad no es un formato válido. {}", e),
                });
            }
        };

        let string_for_hash = format!("{}|{}|{}|{}|{}",
                                     normalized_server_name, // Usar el nombre normalizado de la URL
                                     current_db_name,
                                     fecha_caducidad_almacenada_dt.date().format("%Y-%m-%d").to_string(),
                                     state.aplicativo.clone(),
                                     palabra_clave2);
        
        let new_hash_result: (i32,) = sqlx::query_as(
            "SELECT CHECKSUM(CAST(@p1 AS NVARCHAR(MAX)))"
        )
            .bind(string_for_hash)
            .fetch_one(&pool_ref)
            .await
            .map_err(|e| format!("Error al generar CHECKSUM: {}", e))?;

        let computed_hash_string = new_hash_result.0.to_string();

        if computed_hash_string == hash_almacenado_string {
            if fecha_caducidad_almacenada_dt.date() >= today {
                return Ok(LicenseCheckResult {
                    status: LicenseStatus::Valid,
                    message: "Licencia válida y vigente.".to_string(),
                });
            } else {
                return Ok(LicenseCheckResult {
                    status: LicenseStatus::Expired,
                    message: "La licencia ha caducado. Por favor, renuévela.".to_string(),
                });
            }
        } else {
            return Ok(LicenseCheckResult {
                status: LicenseStatus::InvalidHash,
                message: "El hash de la licencia no coincide. Credenciales inválidas.".to_string(),
            });
        }
    } else {
        return Ok(LicenseCheckResult {
            status: LicenseStatus::NotFound,
            message: "Es la primera vez que inicia la aplicación o la licencia ha sido eliminada.".to_string(),
        });
    }
} */

/// ----------------------------------------------------------------------------------
/// COMANDO: save_license_credentials_command
/// ----------------------------------------------------------------------------------
#[tauri::command]
pub async fn save_license_credentials_command(
    state: State<'_, AppState>,
    encrypted_credentials_from_user: String,
   //_expiration_date_for_hash: String,
) -> Result<bool, String> {

    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "DB pool not initialized".to_string())?;
    let aplicativo_id = *state.aplicativo_id.lock().await;


    // Llama a la función con los 6 argumentos necesarios
    license_logic::save_license_credentials(
        pool_ref,
        &state.sql_collate_clause,
        aplicativo_id,
        &state.palabra_clave1,
        &state.palabra_clave2,
        &state.db_connection_url,
        &state.aplicativo,
        encrypted_credentials_from_user
    ).await
}



/* ANTES DE SEPARAR
/// ----------------------------------------------------------------------------------
/// COMANDO: save_license_credentials_command
/// ----------------------------------------------------------------------------------
#[tauri::command]
pub async fn save_license_credentials_command(
    state: State<'_, AppState>,
    encrypted_credentials_from_user: String,
   //_expiration_date_for_hash: String,
) -> Result<bool, String> {

    let sql_collate_clause_ref: &str = &state.sql_collate_clause;
    let palabra_clave1 = state.palabra_clave1.clone();
    
    let (
        server_name_from_credential,
        db_name_from_credential,
        expiration_date_from_decrypted,
        aplicativo_code_from_credential
    ) = decrypt_and_parse_license_data(&encrypted_credentials_from_user, &palabra_clave1)?;
    
    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "Pool de DB no inicializado".to_string())?;

    let app_id_guard = state.aplicativo_id.lock().await;
    let app_id = *app_id_guard;
    
    let palabra_clave2 = &state.palabra_clave2;
    
    let app_code = &state.aplicativo;

    let sql_query = format!(
        "SELECT aplicativoID FROM riy.riy_SeguridadAplicativo WITH(NOLOCK)
        WHERE aplicativo = @p1 {0}",
        sql_collate_clause_ref
    );
    let app_id_option: Option<(i32,)> = sqlx::query_as(&sql_query)
        .bind(app_code) // Aquí deberías usar el código de la aplicación, que es un String
        .fetch_optional(pool_ref) 
        .await
        .map_err(|e| format!("Error al verificar aplicativo: {}", e))?;

    if app_id_option.is_none() {
        sqlx::query(
            "INSERT INTO riy.riy_SeguridadAplicativo (aplicativoID) VALUES (@p1)"
        )
        .bind(app_id) // CORRECCIÓN: Usamos el valor i32
        .execute(pool_ref) 
        .await
        .map_err(|e| format!("Error al insertar aplicativoID en tabla de seguridad: {}", e))?;
    }

    let (current_server_name, current_db_name) = db::parse_mssql_connection_url(&state.db_connection_url)?;
    let normalized_credential_server = normalize_server_name(&server_name_from_credential);
    let normalized_current_server = normalize_server_name(&current_server_name);
    
    if normalized_credential_server.to_lowercase() != normalized_current_server.to_lowercase() {
        return Err(format!(
            "Las credenciales no coinciden con el servidor actual de la conexión. Esperado: '{}', Obtenido en credencial: '{}'",
            normalized_current_server, normalized_credential_server
        ));
    }

    if db_name_from_credential.to_lowercase() != current_db_name.to_lowercase() {
        return Err(format!(
            "Las credenciales no coinciden con la base de datos actual de la conexión. Esperado: '{}', Obtenido en credencial: '{}'",
            current_db_name, db_name_from_credential
        ));
    }
    
    if aplicativo_code_from_credential != *app_code {
        return Err(format!(
            "Las credenciales no coinciden con este aplicativo. Se esperaban credenciales para el aplicativo '{}', pero las credenciales son para: '{}'",
            app_code, aplicativo_code_from_credential
        ));
    }

    let string_for_hash = format!("{}|{}|{}|{}|{}",
                                  normalized_current_server,
                                  current_db_name,
                                  expiration_date_from_decrypted.format("%Y-%m-%d").to_string(),
                                  app_code,
                                  palabra_clave2);
    
    let new_hash_result: (i32,) = sqlx::query_as(
        "SELECT CHECKSUM(CAST(@p1 AS NVARCHAR(MAX)))"
    )
    .bind(string_for_hash)
    .fetch_one(pool_ref)
    .await
    .map_err(|e| format!("Error al generar CHECKSUM: {}", e))?;
    
    let new_hash_hex_string = new_hash_result.0.to_string();
   
    let existing_license_row_option = query(
        "SELECT 1 FROM riy.riy_licencia WITH(NOLOCK) 
         WHERE aplicativoID = @p1 AND nombreServidor = @p2 AND baseDatos = @p3"
    )
    .bind(app_id)
    .bind(&current_server_name)
    .bind(&current_db_name)
    .fetch_optional(pool_ref)
    .await
    .map_err(|e| format!("Error al verificar licencia existente: {}", e))?;
    
    let expiration_date_str = expiration_date_from_decrypted.format("%Y-%m-%d").to_string();

    if existing_license_row_option.is_some() {
        query(
            "UPDATE riy.riy_licencia 
                SET fechaCaducidad = @p1, 
                credencial_encriptada = @p2, 
                hash_licencia_hex = @p3 
             WHERE aplicativoID = @p4 
               AND nombreServidor = @p5 
               AND baseDatos = @p6"
        )
        .bind(&expiration_date_str)
        .bind(&encrypted_credentials_from_user)
        .bind(&new_hash_hex_string)
        .bind(app_id)
        .bind(&current_server_name)
        .bind(&current_db_name)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Error al actualizar licencia: {}", e))?;
    } else {
        query(
            "INSERT INTO riy.riy_licencia (aplicativoID, nombreServidor, baseDatos, fechaCaducidad, credencial_encriptada, hash_licencia_hex) VALUES (@p1, @p2, @p3, @p4, @p5, @p6)"
        )
        .bind(app_id)
        .bind(&current_server_name)
        .bind(&current_db_name)
        .bind(&expiration_date_str)
        .bind(&encrypted_credentials_from_user)
        .bind(&new_hash_hex_string)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Error al insertar licencia: {}", e))?;
    }

    let today = Utc::now().date_naive();
    if expiration_date_from_decrypted >= today {
        Ok(true)
    } else {
        Ok(false)
    }
}
*/

/// ----------------------------------------------------------------------------------
/// COMANDO: get_db_connection_info_command
/// Obtiene el nombre del servidor y la base de datos de la URL de conexión.
/// ----------------------------------------------------------------------------------
#[tauri::command]
pub async fn get_db_connection_info_command(
    state: tauri::State<'_, AppState>
) -> Result<(String, String), String> {
    db::get_db_connection_info(&state.db_connection_url).await
}





// Función auxiliar para limpiar la cadena de caracteres no válidos
fn sanitize_string(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_graphic() || c.is_ascii_whitespace()).collect()
}