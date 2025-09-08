// src-tauri/src/shared/license_logic.rs

// Usa una ruta relativa para acceder a los otros módulos en la misma carpeta
use super::{db}; 
use crate::db::normalize_server_name;
use sqlx::{Pool, Mssql, Row};
use sqlx::query;
use chrono::{NaiveDate, Utc};
use serde::{Serialize};

use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use base64::{engine::general_purpose, Engine as _};

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
                message: "No se encontró el hash de la licencia. Las credenciales no son válidas.".to_string(),
            });
        }
        
        let hash_almacenado_string = hash_almacenado_hex.unwrap();

        let fecha_caducidad_str: String = license_row.try_get("fecha_caducidad_str")
            .map_err(|e| format!("Error al leer fecha_caducidad_str: {}", e))?;
        
        let fecha_caducidad_almacenada_dt = match chrono::NaiveDateTime::parse_from_str(&fecha_caducidad_str, "%Y-%m-%d %H:%M:%S") {
            Ok(dt) => dt,
            Err(e) => {
                return Ok(LicenseCheckResult {
                    status: LicenseStatus::Corrupted,
                    message: format!("Error de formato de licencia: La fecha de vencimiento no es un formato válido. {}", e),
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
                    message: "La licencia ha expirado. Por favor, renuévela.".to_string(),
                });
            }
        } else {
            return Ok(LicenseCheckResult {
                status: LicenseStatus::InvalidHash,
                message: "El hash de la licencia no coincide. Credenciales no válidas.".to_string(),
            });
        }
    } else {
        eprintln!("license_logic: Verificación de licencia completada sin encontrar un error crítico.");
        return Ok(LicenseCheckResult {
            status: LicenseStatus::NotFound,
            message: "TEsta es la primera vez que se inicia la aplicación o se ha eliminado la licencia.".to_string(),
        });
    }
}


/// ----------------------------------------------------------------------------------
/// save_license_credentials
/// ----------------------------------------------------------------------------------
pub async fn save_license_credentials(
    pool: &Pool<Mssql>,
    sql_collate_clause: &str,
    aplicativo_id: i32,
    palabra_clave1: &str,
    palabra_clave2: &str,
    db_connection_url: &str, // Agrega la URL de conexión aquí
    aplicativo: &str,
    encrypted_credentials_from_user: &str,
) -> Result<bool, String> {

    let sql_collate_clause_ref = sql_collate_clause;
    
    // Lock the necessary parts of parameters
    let app_id = aplicativo_id;
    let app_code = aplicativo;
    let palabra_clave1 = palabra_clave1;
    let palabra_clave2 = palabra_clave2;

    let (
        server_name_from_credential,
        db_name_from_credential,
        expiration_date_from_decrypted,
        aplicativo_code_from_credential
    ) = decrypt_and_parse_license_data(&encrypted_credentials_from_user, &palabra_clave1)?;

    let (current_server_name, current_db_name)=
        db::parse_mssql_connection_url(db_connection_url)?;
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
    .fetch_one(pool)
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
    .fetch_optional(pool)
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
        .execute(pool)
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
        .execute(pool)
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

/// ----------------------------------------------------------------------------------
/// Función auxiliar para desencriptar
/// ----------------------------------------------------------------------------------
fn decrypt_and_parse_license_data(
    encrypted_credential_b64: &str,
    key_str: &str,
) -> Result<(String, String, NaiveDate, String), String> {
    let key_bytes = hex::decode(key_str)
        .map_err(|e| format!("Error: La PALABRA_CLAVE_1 no es un string hexadecimal válido de 32 bytes: {}", e))?;
    
    if key_bytes.len() != 32 {
        return Err("Error: La PALABRA_CLAVE_1 debe ser una clave de 32 bytes (256 bits).".to_string());
    }
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let decoded_bytes = general_purpose::STANDARD.decode(encrypted_credential_b64)
        .map_err(|e| format!("Error al decodificar Base64 de la credencial: {}", e))?;
    let nonce_len = 12;
    let tag_len = 16;
    if decoded_bytes.len() < nonce_len + tag_len {
        return Err("Datos encriptados demasiado cortos para Nonce y Tag.".to_string());
    }
    let nonce_bytes = &decoded_bytes[..nonce_len];
    let ciphertext_and_tag = &decoded_bytes[nonce_len..];
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext_bytes = cipher.decrypt(nonce, ciphertext_and_tag)
        .map_err(|_| "Fallo en la desencriptación. Clave, Nonce o datos inválidos. La credencial es incorrecta.".to_string())?;
    let plaintext = String::from_utf8(plaintext_bytes)
        .map_err(|e| format!("Los datos desencriptados no son UTF-8 válido: {}", e))?;
    let parts: Vec<&str> = plaintext.split('|').collect();

    if parts.len() != 4 {
        return Err(format!("La cadena desencriptada tiene un formato inesperado (se esperaban 4 partes, se obtuvieron {}). Formato esperado: 'nombreServidor|baseDatos|fechaCaducidad|codigoAplicativo'.", parts.len()));
    }
    let server_name_from_credential = parts[0].to_string();
    let db_name_from_credential = parts[1].to_string();
    let fecha_caducidad_str_yyyymmdd = parts[2];
    let fecha_caducidad = NaiveDate::parse_from_str(fecha_caducidad_str_yyyymmdd, "%Y%m%d")
        .map_err(|e| format!("Error al parsear la fecha de caducidad (formato YYYYMMDD esperado): {}", e))?;
    let aplicativo_code_from_credential = parts[3].to_string();
    
    Ok((server_name_from_credential, db_name_from_credential, fecha_caducidad, aplicativo_code_from_credential))
}