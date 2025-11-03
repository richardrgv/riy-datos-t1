// src-tauri/src/shared/auth.rs

use sqlx::{Pool, Mssql};
use anyhow::{Result, anyhow};
use sqlx::MssqlPool; // Para el tipo de conexión
use std::sync::Arc;
use reqwest::Client;
use std::collections::HashSet;



// 🚨 Asegúrate de que estos imports apunten a la ruta correcta de tu librería compartida
use crate::models::{AuthRequestPayload, AuthResponsePayload, LoggedInUser};
// Asumo que 'db' y 'utils' (para JWT) están disponibles
use crate::{utils}; 

// La ruta es: crate -> api -> auth_providers
use crate::auth_providers::{google, microsoft};

use crate::models::{User};
use crate::user_repository::get_user_by_email;
use crate::user_repository::create_or_update_user;
//use crate::api::auth_providers::google;
//use crate::api::auth_providers::microsoft;


//use crate::models::{AuthRequestPayload, AuthResponsePayload, LoggedInUser};
//use crate::shared::user_repository as db;
//use crate::api::auth_providers::{google, microsoft};
// 🚨 Módulo para generar JWTs de sesión. Asumimos que tienes uno.
//use crate::api::jwt_utils;


// 🚨 LÓGICA DE NEGOCIO: Dominios B2B para chequeo estricto
const B2B_DOMAINS: [&str; 2] = ["riycorp.com", "partner_b2b.com"];

// ----------------------------------------------------------------------
// FUNCIÓN UNIFICADA: PROCESA TODO EL FLUJO
// ----------------------------------------------------------------------


pub async fn process_external_auth(
    pool: &MssqlPool,
    payload: AuthRequestPayload,
    // --- 10 PARÁMETROS DE CONFIGURACIÓN DEL ESTADO ---
    aplicativo_id: i32, 
    http_client: &Arc<Client>,
    whitelisted_domains: &HashSet<String>,
    msal_client_id: &str,
    msal_audience_uri: &str, // 🚨 AÑADIDO: El URI completo (api://GUID)
    msal_jwks_url: &str,
    google_client_id: &str,
    google_client_secret: &str,
    sql_collate_clause: &str,
    // 🚨 Este es el secreto JWT de tu aplicación
    jwt_secret: &str, 
) -> Result<AuthResponsePayload, anyhow::Error> {
    
    // --- LÓGICA MSAL Y GOOGLE: VALIDAR IDENTIDAD EXTERNA ---
    
    // ⚠️ CRÍTICO: La función debe obtener la prueba de identidad de 'proof_of_identity',
    // ya que tu modelo AuthRequestPayload fue simplificado.
    let proof_of_identity = payload.proof_of_identity.clone();

    // 🚨 PASO 1: Verificar el proveedor y la prueba de identidad (longitud) 🚨
    eprintln!("AUTH: Proveedor: {}. Prueba de identidad (longitud): {}", 
              payload.provider, proof_of_identity.len());

    let (email, unique_id) = match payload.provider.to_lowercase().as_str() {
        "google" => {
            // Llama a la lógica de intercambio de código de Google
            // 🚨 Asegúrate de que tu función 'google::validate_google_code' use el http_client y las claves
            google::validate_google_code(
                &proof_of_identity, 
                &payload.redirect_uri,
                http_client, // Usar el cliente HTTP inyectado
                google_client_id,
                google_client_secret
            ).await?
        }
        "microsoft" | "msal" | "msal-corp" | "msal-personal" => {
            // 🚨 Modificamos para capturar los 4 posibles nombres de proveedor del frontend
            eprintln!("AUTH: Iniciando flujo de Microsoft/MSAL...");
            // Llama a la lógica de validación de token de MSAL
            // 🚨 Asegúrate de que tu función 'microsoft::validate_microsoft_token' use el http_client y las claves
            microsoft::validate_microsoft_token(
                &payload.proof_of_identity,  // 1. token: &str
                http_client,           // 2. http_client: &Arc<Client>
                msal_client_id,        // 3. msal_client_id: &str
                msal_audience_uri,     // 🚨 4. msal_audience_uri: &str (NUEVO/AÑADIDO)
                msal_jwks_url,         // 5. msal_jwks_url: &str
                whitelisted_domains    // 6. whitelisted_domains: &HashSet<String>
            ).await?
        }
        _ => {
            eprintln!("AUTH: Proveedor NO soportado: {}", payload.provider);
            return Err(anyhow!("Proveedor de autenticación no soportado: {}", payload.provider));
        }   
    };
    
    // --- LÓGICA DE PERSISTENCIA Y AUTORIZACIÓN (B2B/B2C, DB) ---
    // 🚨 PASO 2: La validación externa fue exitosa. 🚨
    eprintln!("AUTH: ✅ ID externa validada. Email: {}, Unique ID: {}", email, unique_id);

    // 2. PERSISTENCIA Y ASIGNACIÓN DE ROL
    let existing_user_result = get_user_by_email(pool, &email, sql_collate_clause).await;
    let domain = email.split('@').nth(1).unwrap_or_default();
    let is_b2b_domain = B2B_DOMAINS.contains(&domain);

    // 🚨 PASO 3: Resultados de búsqueda de usuario 🚨
    match &existing_user_result {
        Ok(u) => eprintln!("AUTH: Usuario encontrado en DB: ID {}", u.usuario_id),
        Err(_) => eprintln!("AUTH: Usuario NO encontrado en DB. Iniciando creación/denegación."),
    }

    let mut final_user: LoggedInUser = match existing_user_result {
        Ok(mut user) => {
            // Usuario Existente: Actualiza la identidad externa
            create_or_update_user(pool, &mut user, &payload.provider, &unique_id).await?;
            user
        }
        // ... (Tu lógica de usuario nuevo B2B/B2C aquí, sin cambios) ...
        Err(_) => {
            // Usuario Nuevo: Lógica de Creación B2B vs B2C
            if is_b2b_domain {
                return Err(anyhow!("Acceso denegado. Contacte a soporte para registro corporativo."));
            } else {
                let mut new_user = LoggedInUser {
                    usuario_id: 0, 
                    // 🚨 Ajustar campos de LoggedInUser
                    usuario: Some(email.split('@').next().unwrap_or("").to_string()), // 👈 ¡CORRECCIÓN!
                    nombre: Some(email.clone()), 
                    correo: Some(email.clone()),
                };
                
                create_or_update_user(pool, &mut new_user, &payload.provider, &unique_id).await?; 
                new_user
            }
        }
    };
    
    // 🚨 PASO 4: Usuario final obtenido/creado 🚨
    eprintln!("AUTH: Usuario final listo. ID: {}", final_user.usuario_id);

    // 3. ASIGNACIÓN FINAL DE PERMISOS (USANDO EL ID DEL APLICATIVO)
    // 🚨 Aquí usamos el nuevo utils::get_permissions_by_app
    let permissions = utils::get_permissions_by_app(
        pool, 
        final_user.usuario_id, 
        aplicativo_id // 👈 USAMOS EL ID FIJO DEL ESTADO
    ).await?;

    // 🚨 PASO 5: Permisos obtenidos 🚨
    eprintln!("AUTH: Permisos obtenidos ({} permisos).", permissions.len());

    // 4. GENERACIÓN DEL JWT DE SESIÓN
    // 🚨 Aquí usamos el nuevo utils::generate_jwt
    let token_session = utils::generate_jwt(
        &final_user, 
        permissions.clone(), 
        jwt_secret // 👈 Usamos el secreto inyectado
    )?; 

    // 🚨 PASO 6: JWT generado. Éxito total. 🚨
    eprintln!("AUTH: ✅ Éxito total. JWT generado (longitud {}).", token_session.len());
    
    // 5. Devolver la respuesta
    Ok(AuthResponsePayload {
        user: final_user,
        permissions: permissions,
        app_jwt: token_session, // Usar 'app_jwt' si así se llama en el modelo
    })
}





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
