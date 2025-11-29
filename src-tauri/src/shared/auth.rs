// src-tauri/src/shared/auth.rs

use sqlx::Pool;
use sqlx::Mssql;
use anyhow::{Result, anyhow};
use jsonwebtoken::{
    encode, 
    EncodingKey, 
    Header, 
    Algorithm, 
    decode, 
    DecodingKey, 
    Validation,
    TokenData
};
use chrono::{Utc, Duration, Timelike}; // <-- ¡AQUÍ ESTÁ LA CORRECCIÓN!
use serde::{Deserialize, Serialize};

// IMPORTACIÓN DE DEPENDENCIAS EXTERNAS
use bcrypt;
use log::{info, debug, error}; // <-- CORREGIDO: Importación de las macros de log

// IMPORTACIONES DE MODELOS INTERNOS
use crate::models::{
    AuthRequestPayload, 
    AuthResponsePayload, 
    JwtClaims, // Estructura de claims definida en models.rs
    UserInfo,
    //MsalClaims,
    Usuario, // Necesario para la función ERP
    // 🏆 CORRECCIÓN: Agregamos la importación del tipo User
    User, 
}; 
use super::user_repository;
// use super::config::AppConfig; 

pub type DbPool = Pool<Mssql>;


/// Nombre del emisor (issuer) del JWT de la aplicación.
const APP_ISSUER: &str = "my_rust_backend"; 

// -------------------------------------------------------------------------
// ESTRUCTURA DE CLAIMS DE MSAL (CORREGIDA SEGÚN LOS ERRORES)
// -------------------------------------------------------------------------

// Definición mínima de los Claims de Azure AD que necesitamos.
// Basado en el error, esta estructura solo tiene 'upn', 'aud' y 'exp'.
#[derive(Debug, Serialize, Deserialize)]
pub struct MsalClaims {
    // User Principal Name (a menudo el email o username)
    pub upn: String, 
    // Audience (debe coincidir con client_id de la app)
    pub aud: String, 
    // Expiration Time
    pub exp: u64, 
    // Otros claims comunes de JWT que pueden estar presentes, si es necesario, 
    // pero los errores solo mencionaron upn, aud, exp como disponibles.
}


// -------------------------------------------------------------------------\
// 0. FUNCIONES DE UTILIDAD (Encrypt/Decrypt)
// -------------------------------------------------------------------------\

/// MOCK/PLACEHOLDER: Simula la función de descifrado simple por desplazamiento.
fn encrypt_password_simple_displacement(encrypted_text: &str, _encrypt: bool) -> String {
    // Implementación real de descifrado aquí
    encrypted_text.to_string()
}



// -------------------------------------------------------------------------
// 1. JWT GENERATION & VALIDATION (JWT de la Aplicación)
// -------------------------------------------------------------------------

/// Genera un JSON Web Token (JWT) para el usuario autenticado.
/// El token expira en 24 horas.
pub fn generate_app_jwt(secret: &str, user_id: i32) -> Result<String> {
    let now = Utc::now();
    let expiration = now + Duration::hours(24);

    let claims = JwtClaims {
        sub: user_id.to_string(), // Sujeto: ID del usuario
        iss: APP_ISSUER.to_string(), // Emisor
        exp: expiration.timestamp() as usize, // Tiempo de expiración
        iat: now.timestamp() as usize, // Emitido en
        usuario_id: user_id, // ID específico
    };

    let key = EncodingKey::from_secret(secret.as_bytes());
    
    // Generar el token (Header por defecto es HS256)
    let token = encode(&Header::default(), &claims, &key)
        .map_err(|e| anyhow!("Fallo al generar JWT: {}", e))?;
    
    Ok(token)
}

/// Valida un JSON Web Token (JWT) y devuelve los claims.
pub fn validate_app_jwt(secret: &str, token: &str) -> Result<TokenData<JwtClaims>> {
    let key = DecodingKey::from_secret(secret.as_bytes());
    let validation = Validation::new(Algorithm::HS256);
    
    let token_data = decode::<JwtClaims>(token, &key, &validation)
        .map_err(|e| anyhow!("Token JWT inválido o expirado: {}", e))?;

    Ok(token_data)
}

// -------------------------------------------------------------------------
// 2. AUTENTICACIÓN EXTERNA (MSAL, ERP)
// -------------------------------------------------------------------------

/// Valida el ID Token de Azure AD (MSAL).
/// NOTA: La validación real de un token MSAL debe incluir la descarga
/// y uso de los JWKS (JSON Web Key Sets) para verificar la firma.
/// Aquí se incluye una implementación simulada.
pub async fn validate_msal_token(
    token_id: &str,
    jwks_url: &str,
    client_id: &str,
) -> Result<UserInfo> {
    
    info!("Iniciando validación simulada de token MSAL con JWKS: {}", jwks_url);
    
    // ** SIMULACIÓN DE VALIDACIÓN **
    if token_id.is_empty() {
        return Err(anyhow!("Token ID de MSAL vacío."));
    }
    
    // SIMULACIÓN DE LA EXTRACCIÓN DE CLAIMS 
    let claims = MsalClaims {
        upn: "mock.user@empresa.com".to_string(), 
        aud: client_id.to_string(),
        exp: (Utc::now() + Duration::hours(1)).timestamp() as u64,
    };
    
    // 4. CONSTRUIR USERINFO A PARTIR DE CLAIMS
    let user_info = UserInfo {
        username: claims.upn.clone(), 
        email: claims.upn, 
        name: Some("Usuario MSAL de Prueba".to_string()),
    };

    Ok(user_info)
}





// ------------------------------------------------------------------------\
// 1. AUTENTICACIÓN ERP (Lógica Real)
// ------------------------------------------------------------------------\

/// Autentica al usuario contra la tabla de `dbo.Usuario` (ERP) y
/// valida si existe en la tabla `riy.riy_usuario`.
///
/// Retorna `UserInfo` si la autenticación es exitosa, sino un error de `anyhow`.
pub async fn authenticate_erp_user(
    pool: &DbPool, 
    usuario: &str, 
    password: &str, 
    sql_collate_clause: &str
) -> Result<UserInfo> {
    
    // 1. Verificar si el usuario existe en la tabla de la aplicación (riy.riy_usuario)
    let user_exists_query = format!(
        "SELECT usuario {0} as usuario, nombre {0} as nombre, correo {0} as correo
         FROM riy.riy_usuario WITH(NOLOCK)
         WHERE usuario = @p1 {0}", 
        sql_collate_clause
    );

    let riy_user_result: Option<Usuario> = sqlx::query_as(&user_exists_query)
        .bind(usuario)
        .fetch_optional(pool)
        .await
        .map_err(|e| anyhow!("DB Error al verificar usuario en riy.riy_usuario: {}", e))?;
    
    // Si no existe en riy.riy_usuario, la autenticación falla para esta app.
    let riy_user = riy_user_result
        .ok_or_else(|| anyhow!("Usuario no encontrado en la base de datos de la aplicación."))?;


    // 2. Obtener la clave cifrada del ERP (dbo.Usuario)
    let erp_query = format!(
        "SELECT CONVERT(varchar(100), clave) {0} as clave 
         FROM dbo.Usuario WITH(NOLOCK)
         WHERE usuario = @p1 {0}", 
        sql_collate_clause
    );

    let erp_password_result: Option<(String,)> = sqlx::query_as(&erp_query)
        .bind(usuario)
        .fetch_optional(pool)
        .await
        .map_err(|e| anyhow!("DB Error al obtener la clave del ERP: {}", e))?;

    // Si la clave no se encuentra en el ERP.
    let (encrypted_password,) = erp_password_result
        .ok_or_else(|| anyhow!("No se encontró la clave para el usuario en el ERP."))?;

    
    // 3. Descifrar y comparar
    let decrypted_db_password = encrypt_password_simple_displacement(&encrypted_password, false);
    
    if password == decrypted_db_password {
        // Autenticación exitosa. Retornar UserInfo mapeando desde riy_user.
        info!("Autenticación de ERP exitosa para: {}", usuario); // 'username' es accesible aquí
        Ok(UserInfo {
            username: riy_user.usuario, // Mapea el antiguo 'sub'
            name: Some(riy_user.nombre),
            email: riy_user.correo,
        })
    } else {
        Err(anyhow!("Contraseña inválida."))
    }
}

pub async fn authenticate_user(pool: &Pool<Mssql>, usuario: &str, password: &str) -> Result<Option<User>, String> {
    if usuario == "admin" && password == "password" {
        let user_data = User {
            // 🚨 CORRECCIÓN: Inicializar el campo obligatorio con None
            usuario_id: None,
            usuario: usuario.to_string(),
            nombre: "Administrador Dummy".to_string(), // <--- Corrected
            correo: "Correo Dummy".to_string(),        // <--- Corrected
        };
        Ok(Some(user_data))
    } else {
        Ok(None)
    }
}

/// Autentica al usuario usando la base de datos local (para admin/backdoor).
pub async fn authenticate_user_local_db(
    pool: &DbPool, 
    username: &str, 
    password: &str
) -> Result<UserInfo> {
    
    // 1. Buscar usuario por nombre de usuario
    let user_record = sqlx::query_as!(
        User,
        r#"
        SELECT
            usuarioid,
            external_id,
            usuario,
            nombre,
            correo,
            clave
        FROM 
            riy.riy_usuario WITH(NOLOCK)
        WHERE
            usuario = $1
        "#,
        username
    )
    .fetch_optional(pool)
    .await?;

    let user_record = match user_record {
        Some(user) => user,
        None => return Err(anyhow!("Usuario local no encontrado.")),
    };
    
    // 2. Verificar el hash de la contraseña (usando bcrypt)
    let password_hash = user_record.password_hash.clone()
        .ok_or_else(|| anyhow!("La cuenta local no tiene una contraseña configurada."))?;
    
    // Aquí se utiliza una comparación simulada para un entorno de desarrollo.
    // En producción, debería usarse bcrypt::verify(password, &password_hash)
    let is_password_valid = if password_hash.starts_with("$2y$") {
        // Asume hash BCrypt real
        bcrypt::verify(password, &password_hash).unwrap_or(false)
    } else {
        // Caso simple/mock: si la clave en la BD es 'admin', y la ingresada es 'admin'
        password == password_hash
    };

    if !is_password_valid {
        return Err(anyhow!("Contraseña local inválida."));
    }

    // 3. Devolver UserInfo
    Ok(UserInfo {
        //sub: user_record.external_id,
        username: Some(user_record.usuario),
        name: user_record.nombre,
        email: user_record.correo,
        //preferred_username: Some(user_record.nombre_usuario),
    })
}
