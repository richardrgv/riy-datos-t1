// shared_lib/src/utils.rs

use jsonwebtoken::{encode, EncodingKey, Header};
use chrono::{Utc, Duration};
use anyhow::{Result, anyhow};
use sqlx::{Pool, Mssql};

// Importa tus modelos. Asumo que Claims está en el middleware.
use crate::middleware::auth_claims::Claims; 
use crate::models::LoggedInUser; 


// ---------------------------------------------------------------------
// LÓGICA DE PERMISOS
// ---------------------------------------------------------------------

/**
 * Función central para obtener los permisos de un usuario basados en el ID del aplicativo.
 * 🚨 IMPORTANTE: Ahora usa el ID del usuario y el ID del aplicativo.
 */
pub async fn get_permissions_by_app(
    pool: &Pool<Mssql>, 
    usuario_id: i32, 
    aplicativo_id: i32, // ID CRÍTICO para filtrar por aplicación
) -> Result<Vec<String>> {
    
    // ⚠️ IMPLEMENTACIÓN REAL REQUERIDA
    // DEBES reemplazar este MOCK con una consulta SQL que use:
    // 1. usuario_id 
    // 2. aplicativo_id (para filtrar los roles que son válidos para esta aplicación)
    
    // === MOCK/PLACEHOLDER (DEBES REEMPLAZAR) ===
    let usuario_admin = usuario_id == 1 && aplicativo_id == 1; // Ejemplo: Si es Admin de la app 1
    
    let permissions = if usuario_admin {
        vec![
             "inicio".to_string(),
             "administracion".to_string(),
             "lista_usuarios".to_string(),
             "agregar_usuario".to_string(),
             // ... etc.
        ]
    } else {
        // Permisos básicos para el resto
        vec!["inicio".to_string()] 
    };

    Ok(permissions)
}


// ---------------------------------------------------------------------
// LÓGICA DE JWT
// ---------------------------------------------------------------------

/**
 * Genera el JWT de sesión a partir de los datos del usuario y los permisos.
 * 🚨 Retorna un String (el JWT) para ser usado en el AuthResponsePayload.
 */
pub fn generate_jwt(
    // 🚨 CORRECCIÓN: AÑADIR LoggedInUser
    logged_in_user: &LoggedInUser,

    permissions: Vec<String>, 
    jwt_secret: &str
) -> Result<String> {

    // 1. Crea la carga útil (claims) del JWT usando el struct de tu middleware.
    // Usamos el campo 'usuario' (username) como 'sub' (subject).
    // 🚨 CORRECCIÓN 🚨: Desenvuelve de forma segura el Option<String>
    let user_sub = logged_in_user.usuario.as_ref()
        .ok_or_else(|| anyhow::anyhow!("Error interno: el campo 'usuario' es nulo y es requerido para el JWT."))?
        .clone();

    let claims = Claims {
        sub: user_sub, // 👈 Ahora es un String garantizado
        permissions,
        // Expiración en 24 horas
        exp: (Utc::now() + Duration::hours(24)).timestamp() as u64, 
    };
    
    // 2. Codifica el token.
    let token = encode(
        &Header::default(), 
        &claims, 
        &EncodingKey::from_secret(jwt_secret.as_bytes())
    ).map_err(|e| anyhow!("Error al crear el token: {}", e))?;

    Ok(token)
}