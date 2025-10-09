// src-tauri/src/api/utils.rs (NUEVO ARCHIVO)

use jsonwebtoken::{encode, EncodingKey, Header};
use chrono::{Utc, Duration};
use shared_lib::middleware::auth_claims::Claims;
use shared_lib::models::{LoginResponse, User}; // Asegúrate de importar User
use crate::errors::CustomError;


/**
 * Función central para obtener los permisos de un usuario desde la DB.
 * Usada por ambos flujos de login.
 */
pub async fn get_user_permissions(pool: &sqlx::Pool<sqlx::Mssql>, usuario: &str) 
-> Result<Vec<String>, CustomError> {
    // ⚠️ IMPLEMENTACIÓN REAL REQUERIDA
    // Consulta a la DB: SELECT permiso FROM riy.riy_permisos WHERE usuario = @p1
    
    // ⚠️ ADVERTENCIA: Esta implementación es un MOCK/PLACEHOLDER. 
    // DEBES reemplazarla con tu consulta real a la tabla de permisos.
    match usuario {
        "admin" => Ok(vec![
            "inicio".to_string(),
            "administracion".to_string(),
                "lista_usuarios".to_string(), 
                    "agregar_usuario".to_string(), 
                    "editar_usuario".to_string(), 
                "lista_roles".to_string(), 
            "vistas".to_string(), 
            "ayuda".to_string(), 
            // ... otros permisos de admin
        ]),
        // El compilador necesita esta línea para cubrir todos los demás valores de &str
        &_ => Ok(vec!["inicio".to_string()]), // 👈 AÑADIDO: Permisos básicos para cualquier otro usuario
    }
}

/**
 * Genera el JWT de sesión y la respuesta final unificada.
 */
pub fn create_session_response(
    user: User, 
    permissions: Vec<String>, 
    jwt_secret: &str
) -> Result<LoginResponse, String> {

    // 1. Crea la carga útil (claims) del JWT.
    let claims = Claims {
        sub: user.usuario.clone(),
        permissions: permissions.clone(),
        exp: (Utc::now() + Duration::hours(24)).timestamp() as u64,
    };
    
    // 2. Codifica el token.
    let token = encode(
        &Header::default(), 
        &claims, 
        &EncodingKey::from_secret(jwt_secret.as_bytes())
    ).map_err(|e| format!("Error al crear el token: {}", e))?;

    // 3. Devuelve la respuesta completa.
    Ok(LoginResponse {
        token,
        user,
        permissions,
    })
}

