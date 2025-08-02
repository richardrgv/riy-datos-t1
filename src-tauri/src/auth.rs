/*
2025-07-23     RichardG     auth
*/
// Importamos Pool y Mssql para sqlx 0.6
use sqlx::{Pool, Mssql}; 
use sqlx::Row; // Si usamos consultas que devuelven filas
use tauri::State;
use crate::AppState;

/// Función que autentica a un usuario contra la base de datos.
///
/// Acepta el `Pool` de la base de datos (ahora `Pool<Mssql>`), un nombre de usuario y
/// una contraseña, y devuelve `true` si la autenticación es exitosa.
pub async fn authenticate_user(pool: &Pool<Mssql>, username: &str, password: &str) -> Result<bool, String> { // <-- CAMBIO CLAVE
    // En este punto, no tienes la lógica de autenticación real contra la base de datos.
    // Una vez que la tengas, debes asegurarte de que use el tipo Mssql para las consultas.
    
    /* Ejemplo de cómo se vería la lógica real con Mssql:
    let sql_collate_clause_ref = "COLLATE Latin1_General_CI_AS"; // O se obtiene de AppState si se pasa
    let (server_name, db_name) = crate::db::parse_mssql_connection_url("mssql://your_connection_url_here")?; // O se obtiene de AppState

    let sql_query = format!(
        "SELECT TOP 1 * FROM riy.riy_credenciales
         WHERE nombreUsuario = @p1 {0}
           AND nombreServidor = @p2 {0}
           AND baseDatos = @p3 {0}",
        sql_collate_clause_ref
    );

    let user_row_option = sqlx::query(&sql_query)
        .bind(username)
        .bind(server_name)
        .bind(db_name)
        .fetch_optional(pool) // Usar el Pool<Mssql> aquí
        .await
        .map_err(|e| format!("Error al buscar usuario: {}", e))?;

    if let Some(row) = user_row_option {
        let stored_encrypted_password: String = row.try_get("credencial_encriptada")
            .map_err(|e| format!("Error al obtener credencial_encriptada: {}", e))?;

        let compare_result: (i32,) = sqlx::query_as::<Mssql, _>("SELECT PWDCOMPARE(@p1, @p2)") // <-- CAMBIO CLAVE
            .bind(password)
            .bind(stored_encrypted_password)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Error al ejecutar PWDCOMPARE: {}", e))?;

        if compare_result.0 == 1 {
            Ok(true)
        } else {
            Ok(false)
        }
    } else {
        Ok(false)
    }
    */

    // SIMULACIÓN: Autenticación dummy (usar esto mientras se implementa la lógica de DB)
    if username == "admin" && password == "password" {
        Ok(true)
    } else {
        Ok(false)
    }
}

// Autenticacion ERP
pub async fn authenticate_erp_user(pool: &Pool<Mssql>, username: &str, password: &str, sql_collate_clause: &str) -> Result<bool, String> {
    // 1. Verificar si el usuario existe en riy.riy_usuario
    let user_exists_query = 
        format!("SELECT COUNT(*) FROM riy.riy_usuario WITH(NOLOCK)
                  WHERE usuario = @p1 {}", sql_collate_clause);
    // --- CORRECCIÓN CLAVE ---
    let user_count_tuple: (i32,) = sqlx::query_as(&user_exists_query)
        .bind(username)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Error al verificar usuario en riy.riy_usuario: {}", e))?;

    if user_count_tuple.0 == 0 { // Acceder al valor con .0
        return Ok(false); // Usuario no encontrado
    }

    // 2. Obtener la contraseña encriptada de dbo.Usuario
    let erp_query = 
        format!("SELECT CONVERT(varchar(100), clave) {0} as clave FROM dbo.Usuario WITH(NOLOCK)
                  WHERE usuario = @p1 {0}
                    AND UsuarioPerfil = 'US'  {0}
	                AND	Estado = 'A' {0}", 
                  sql_collate_clause);
    let erp_password_result: Option<(String,)> = sqlx::query_as(&erp_query)
        .bind(username)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al obtener la clave del ERP: {}", e))?;

    println!("erp_password_result: {:?}", erp_password_result);
    println!("password: {}", password);

    if let Some((encrypted_password,)) = erp_password_result {
        // 3. Desencriptar la clave de la DB y comparar con la clave ingresada
        let decrypted_db_password = encrypt_password_simple_displacement(&encrypted_password, false);
        println!("decrypted_db_password: {}", decrypted_db_password);
        // Comparar directamente la contraseña ingresada por el usuario con la contraseña desencriptada de la base de datos.
        Ok(password == decrypted_db_password)
    } else {
        Ok(false)
    }
}

// --- FUNCIÓN DE ENCRIPTACIÓN/DESENCRIPTACIÓN EN RUST ---
fn encrypt_password_simple_displacement(input: &str, encrypt: bool) -> String {
    let mut result = String::new();
    // --- CORRECCIÓN: Aplicar trim a la entrada ---
    let trimmed_input = input.trim();

    for (i, c) in trimmed_input.chars().enumerate() {
        // La posición en PowerBuilder es 1-based, en Rust es 0-based.
        // Sumamos 1 al índice de Rust para que coincida.
        let seed = (i + 1) as i32; 
        let current_char_code = c as i32;
        let new_char_code;

        if encrypt {
            new_char_code = current_char_code + seed;
        } else {
            new_char_code = current_char_code - seed;
        }
        
        // --- CORRECCIÓN CLAVE ---
        // Convertimos new_char_code de i32 a u32 antes de usarlo.
        // Esto previene el error de tipos.
        result.push(std::char::from_u32(new_char_code as u32).unwrap_or(c));
    }
    
    // La lógica de PowerBuilder convierte el resultado a minúsculas solo al desencriptar.
    if !encrypt {
        result = result.to_lowercase();
    }
    
    result
}