// src-tauri/src/shared/auth.rs

use sqlx::{Pool, Mssql};
use crate::models::{User};


// --- NUEVA FUNCIÓN: Autenticación con UPN (Correo) de Microsoft ---
/**
 * Busca un usuario en riy.riy_usuario usando su UPN (User Principal Name / Correo).
 * * @param pool El pool de conexión a la base de datos Mssql.
 * @param user_upn El correo electrónico corporativo validado por Azure (UPN).
 * @param sql_collate_clause La cláusula de intercalación para búsquedas sin distinción de mayúsculas/minúsculas.
 * @returns Ok(Some(User)) si el usuario existe en la tabla, Ok(None) si no.
 */
pub async fn authenticate_msal_user(
    pool: &Pool<Mssql>, 
    user_upn: &str, 
    sql_collate_clause: &str
) -> Result<Option<User>, String> {
    eprintln!("authenticate_msal_user: Iniciando la autenticación por UPN.");
    println!("Intentando autenticar al usuario por UPN: {}", user_upn);

    // ⚠️ Importante: Usamos el campo 'correo' para la búsqueda, ya que el UPN de Azure es el correo.
    // Asumimos que el campo 'correo' en riy.riy_usuario es el UPN completo.
    let user_exists_query = 
        format!("SELECT usuario {0} as usuario, nombre {0} as nombre, correo {0} as correo
                FROM riy.riy_usuario WITH(NOLOCK)
                WHERE correo = @p1 {0}", sql_collate_clause);

    let riy_user_result: Option<User> = sqlx::query_as(&user_exists_query)
        .bind(user_upn)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al verificar usuario en riy.riy_usuario por UPN: {}", e))?;
    
    eprintln!("authenticate_msal_user: Resultado de la búsqueda de usuario: {}", riy_user_result.is_some());
    
    // Si se encuentra el usuario en la tabla corporativa, la autenticación es exitosa.
    if riy_user_result.is_some() {
        Ok(riy_user_result)
    } else {
        Ok(None)
    }
}

// --- MODIFICADO: Ahora devuelve Option<LoggedInUser> en lugar de bool ---
pub async fn authenticate_user(pool: &Pool<Mssql>, usuario: &str, password: &str) -> Result<Option<User>, String> {
    if usuario == "admin" && password == "password" {
        let user_data = User {
            usuario: usuario.to_string(),
            nombre: "Administrador Dummy".to_string(), // <--- Corrected
            correo: "Correo Dummy".to_string(),        // <--- Corrected
        };
        Ok(Some(user_data))
    } else {
        Ok(None)
    }
}

// Autenticacion ERP
pub async fn authenticate_erp_user(
    pool: &Pool<Mssql>, 
    usuario: &str, 
    password: &str, 
    sql_collate_clause: &str
) -> Result<Option<User>, String> {
    eprintln!("authenticate_erp_user: Iniciando la autenticación.");
    println!("Intentando autenticar al usuario: {}", usuario);
    println!("Intentando autenticar al password: {}", password);
    println!("Intentando autenticar al sql_collate_clause: {}", sql_collate_clause);

    let user_exists_query = 
        format!("SELECT usuario {0} as usuario, nombre {0} as nombre, correo {0} as correo
                   FROM riy.riy_usuario WITH(NOLOCK)
                  WHERE usuario = @p1 {0}", sql_collate_clause);
    println!("Intentando autenticar al user_exists_query: {}", user_exists_query);

    let riy_user_result: Option<User> = sqlx::query_as(&user_exists_query)
        .bind(usuario)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al verificar usuario en riy.riy_usuario: {}", e))?;
    eprintln!("authenticate_erp_user: Paso riy_user_result.");
    
    if riy_user_result.is_none() {
        return Ok(None);
    }
    
    let riy_user = riy_user_result.unwrap();

    let erp_query = 
        format!("SELECT CONVERT(varchar(100), clave) {0} as clave 
                   FROM dbo.Usuario WITH(NOLOCK)
                  WHERE usuario = @p1 {0}", 
                 sql_collate_clause);

    let erp_password_result: Option<(String,)> = sqlx::query_as(&erp_query)
        .bind(usuario)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al obtener la clave del ERP: {}", e))?;
    eprintln!("authenticate_erp_user: Paso erp_password_result.");

    if let Some((encrypted_password,)) = erp_password_result {
        let decrypted_db_password = encrypt_password_simple_displacement(&encrypted_password, false);
        
        if password == decrypted_db_password {
            Ok(Some(riy_user))
        } else {
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

fn encrypt_password_simple_displacement(input: &str, encrypt: bool) -> String {
    let mut result = String::new();
    let trimmed_input = input.trim();
    for (i, c) in trimmed_input.chars().enumerate() {
        let seed = (i + 1) as i32; 
        let current_char_code = c as i32;
        let new_char_code;
        if encrypt {
            new_char_code = current_char_code + seed;
        } else {
            new_char_code = current_char_code - seed;
        }
        result.push(std::char::from_u32(new_char_code as u32).unwrap_or(c));
    }
    if !encrypt {
        result = result.to_lowercase();
    }
    result
}
