// src-tauri/src/auth.rs

use sqlx::{Pool, Mssql, query, query_as};
use crate::AppState;
use crate::models::LoggedInUser;

// --- MODIFICADO: Ahora devuelve Option<LoggedInUser> en lugar de bool ---
pub async fn authenticate_user(pool: &Pool<Mssql>, username: &str, password: &str) -> Result<Option<LoggedInUser>, String> {
    if username == "admin" && password == "password" {
        let user_data = LoggedInUser {
            usuario: username.to_string(),
            nombre: Some("Administrador Dummy".to_string()), // <-- CORREGIDO: Envuelto en Some()
        };
        Ok(Some(user_data))
    } else {
        Ok(None)
    }
}

// Autenticacion ERP
pub async fn authenticate_erp_user(
    pool: &Pool<Mssql>, 
    username: &str, 
    password: &str, 
    sql_collate_clause: &str
) -> Result<Option<LoggedInUser>, String> {
    let user_exists_query = 
        format!("SELECT usuario {0} as usuario, nombre {0} as nombre
                   FROM riy.riy_usuario WITH(NOLOCK)
                  WHERE usuario = @p1 {0}", sql_collate_clause);
    
    let riy_user_result: Option<LoggedInUser> = sqlx::query_as(&user_exists_query)
        .bind(username)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al verificar usuario en riy.riy_usuario: {}", e))?;

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
        .bind(username)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error al obtener la clave del ERP: {}", e))?;

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
