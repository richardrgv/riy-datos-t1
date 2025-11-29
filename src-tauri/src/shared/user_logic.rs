// src-tauri/src/shared/user_logi.rs

use anyhow::{Result, anyhow};
use sqlx::{Pool, Mssql};
use log::{debug, info};
use chrono::Duration;

use crate::models::{
    AuthRequestPayload, 
    AuthResponsePayload, 
    UserInfo,
    User,
    LoginType,
    LoggedInUser, 
};
use super::auth;
use super::user_repository;
use super::config::AppConfig;
pub use super::auth::DbPool; 

// -------------------------------------------------------------------------
// LÓGICA DE AUTENTICACIÓN CENTRAL
// -------------------------------------------------------------------------

/// Gestiona todo el flujo de autenticación: 
/// 1. Llama a la fuente (MSAL, ERP, Local) para verificar credenciales/token.
/// 2. Encuentra/crea el usuario local (sincronización).
/// 3. Genera el JWT de la aplicación para el cliente.
pub async fn authenticate_user(
    pool: &DbPool,
    config: &AppConfig,
    payload: AuthRequestPayload,
) -> Result<AuthResponsePayload> {
    
    // El 'sql_collate_clause' se obtiene directamente de la configuración principal.
    let sql_collate_clause = &config.sql_collate_clause;
    
    // 1. AUTENTICAR CONTRA LA FUENTE EXTERNA/LOCAL
    // 
    let user_info = match payload.login_type {
        LoginType::MsftMsal => {
            // En el flujo MSAL, 'proof_of_identity' contiene el ID Token de Azure AD.
            let token_id = payload.proof_of_identity.as_str(); 

            auth::validate_msal_token(
                token_id,
                &config.msal_jwks_url,
                &config.msal_client_id,
            ).await?
        },
        LoginType::Erp => {
            // Para ERP, usamos los campos username y password (que son Option<String>).
            let username = payload.username.as_deref().unwrap_or("");
            let password = payload.password.as_deref().unwrap_or("");
            
            auth::authenticate_erp_user(pool, username, password, sql_collate_clause).await?
        },
        LoginType::Local => {
            // Para login Local, usamos los campos username y password.
            let username = payload.username.as_deref().unwrap_or("");
            let password = payload.password.as_deref().unwrap_or("");
            
            auth::authenticate_user_local_db(pool, username, password).await?
        }
    };

    // 2. ENCONTRAR O CREAR USUARIO LOCAL (SINCRONIZACIÓN)
    let local_user = user_repository::find_or_create_user(
        pool,
        &user_info, 
        sql_collate_clause, 
    ).await?;

    // Desempaquetar el ID del usuario para el JWT y el LoggedInUser (de Option<i32> a i32).
    let user_id = local_user.usuario_id.ok_or_else(|| {
        anyhow!("El usuario local fue creado/encontrado, pero no tiene un ID válido.")
    })?;

    // 3. GENERAR EL JWT INTERNO DE LA APLICACIÓN
    // 
    let jwt_token = auth::generate_app_jwt(
        &config.app_jwt_secret, 
        user_id 
    )?;

    info!("Autenticación exitosa para usuario local ID: {}", user_id);

    // 4. PREPARAR LA RESPUESTA
    
    // 4.1. Mapear 'User' a 'LoggedInUser' (tipo esperado por la respuesta)
    let logged_in_user = LoggedInUser {
        // Asignamos el ID i32 desempaquetado
        usuario_id: Some(user_id), 
        
        // CORRECCIÓN: local_user.campo es String, pero LoggedInUser espera Option<String>.
        // Lo envolvemos en Some().
        usuario: local_user.usuario, 
        nombre: local_user.nombre,
        correo: local_user.correo,
        
        // Inicializamos el campo adicional 'roles'
        roles: Vec::new(), 
    };

    // 4.2. Construir AuthResponsePayload con el tipo correcto
    Ok(AuthResponsePayload {
        app_jwt: jwt_token,
        user: logged_in_user, 
        permissions: Vec::new(), 
    })
}