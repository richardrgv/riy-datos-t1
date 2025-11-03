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
use serde::{Serialize, Deserialize};
use crate::AppState;

//use crate::shared::license_logic;
//use crate::shared::models::{AppState, LicenseCheckResult};
// Usa una ruta relativa para acceder a los otros módulos en la misma carpeta
use shared_lib::license_logic;

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
        &encrypted_credentials_from_user
    ).await
}



// Función auxiliar para limpiar la cadena de caracteres no válidos
fn sanitize_string(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_graphic() || c.is_ascii_whitespace()).collect()
}