// src-tauri/src/api/msal_security_logic.rs
use base64::{engine::general_purpose, Engine as _}; // ✅ Sintaxis correcta para v0.22+

use serde::{Deserialize, Serialize};

// ✅ SOLUCIÓN AL ERROR DE IMPORTACIÓN DEL CLIENTE JWKS
use jsonwebtoken::{decode, decode_header, DecodingKey, Validation};
use reqwest::Client;
use serde_json::Value; // Para buscar en el JSON de JWKS
use std::error::Error;


// ⚠️ Asegúrate de que estos tipos estén definidos en tu proyecto:
use shared_lib::{
    state::AppState,
    models::{self, User}, // Importar models::* para usar models::RiyUser, models::Permission, etc.
};
use shared_lib::auth;
use crate::utils::get_user_permissions;
use crate::errors::CustomError; // Tu tipo de error local


// -------------------------------------------------------------
// 1. ESTRUCTURAS DE DATOS MSAL
// -------------------------------------------------------------

// Claims esperadas en el token de Azure
#[derive(Debug, Serialize, Deserialize)]
pub struct MsalClaims {
    pub upn: String, // User Principal Name (correo)
    pub aud: String, // Audience (Debe ser tu MSAL_CLIENT_ID)
    pub exp: u64,
    pub iss: String, // Issuer
}

// -------------------------------------------------------------
// 2. LÓGICA DE SEGURIDAD CRÍTICA
// -------------------------------------------------------------

/**
 * Función principal que orquesta la validación completa.
 */
pub async fn validate_and_get_user(
    token: &str, 
    app_state: &AppState, 
    http_client: &Client // ⭐️ Cliente HTTP ⭐️
) -> Result<(models::User, Vec<String>), Box<dyn Error>> {
    
    // 1. Obtener Header y KID del token
    let header = decode_header(token)?;
    // ✅ AHORA: Usamos CustomError y Box<dyn Error> para eliminar la ambigüedad
    let kid = header.kid.ok_or_else(|| {
        Box::new(CustomError::new(401, "Token no tiene 'kid'")) as Box<dyn Error>
    })?;

    // ⭐️ LOG CRÍTICO AÑADIDO: Muestra el Algoritmo ⭐️
    println!(">>> [AUTH DEBUG] Algoritmo del Token: {:?}", header.alg);
    println!(">>> [AUTH DEBUG] KID del Token a buscar: {}", kid);
    println!(">>> [AUTH DEBUG] Audiencia (Client ID) esperada: {}", app_state.msal_client_id);
    // ...

    // 2. FETCH MANUAL del JWKS (Garantiza que usa Tokio 1.x)
    let jwks_response: Value = http_client.get(&app_state.msal_jwks_url)
        .send()
        .await?
        .json()
        .await?;

    // ⭐️ LOG CRÍTICO 2: Todas las claves encontradas ⭐️
    // Esto es grande, pero crucial para depurar. Solo usa serde_json::to_string.
    println!(">>> [AUTH DEBUG] JWKS JSON completo descargado: {}", serde_json::to_string(&jwks_response).unwrap_or_else(|_| "Error al serializar JWKS".to_string()));

    // 3. Buscar la clave por KID
    let jwk_array = jwks_response["keys"]
        .as_array()
        // ✅ AHORA: Usamos CustomError y Box<dyn Error> para eliminar la ambigüedad
        .ok_or_else(|| {
            Box::new(CustomError::new(500, "Respuesta JWKS inválida: 'keys' no es un array")) as Box<dyn Error>
        })?;

    // ⭐️ LOG CRÍTICO 3: Claves individuales para confirmar estructura ⭐️
    for key in jwk_array.iter() {
        if let Some(key_kid) = key["kid"].as_str() {
            println!(">>> [AUTH DEBUG] Clave disponible KID: {}", key_kid);
        }
    }

    let jwk_found_result = jwk_array.iter()
        .find(|k| k["kid"].as_str() == Some(&kid));

    if jwk_found_result.is_none() {
        println!(">>> [AUTH DEBUG] ¡FALLO! No se encontró ninguna clave con KID: {}", kid);
    } else {
        println!(">>> [AUTH DEBUG] ¡ÉXITO! Clave JWK encontrada para KID: {}", kid);
    }
    
    
    // ⭐️ INICIO DE LA NUEVA LÓGICA DE FALLBACK ⭐️

    // Flag para almacenar la data del token si la validación tiene éxito.
    let mut token_data_result: Option<jsonwebtoken::TokenData<MsalClaims>> = None;

    // 1. Iterar sobre TODAS las claves RSA disponibles.
    for jwk in jwk_array.iter() {
        // Solo consideramos claves RSA (kty="RSA")
        if jwk["kty"].as_str() != Some("RSA") {
            continue;
        }
        
        // Asumimos el algoritmo del token (RS256), que es el correcto para MSAL.
        let alg = header.alg;

        // 2. Intentar obtener los componentes RSA
        let n = match jwk["n"].as_str() {
            Some(val) => val,
            None => continue, // Saltar si faltan componentes RSA
        };
        let e = match jwk["e"].as_str() {
            Some(val) => val,
            None => continue, // Saltar si faltan componentes RSA
        };

        let decoding_key = match DecodingKey::from_rsa_components(n, e) {
            Ok(key) => key,
            Err(_) => continue, // Saltar si la clave RSA no se puede crear
        };
        
        // 3. Configurar y TENTAR la validación con esta clave
        let mut validation = jsonwebtoken::Validation::new(alg);
        /* 
        validation.set_audience(&[app_state.msal_client_id.clone()]);
        */
        
        // 🚨 CORRECCIÓN CRÍTICA 🚨
        // 1. Construir la URI de Audiencia completa (api:// + Client ID)
        let expected_audience_uri = format!("api://{}", app_state.msal_client_id);

        // 2. Usar 'std::collections::HashSet' para configurar la audiencia esperada.
        // Esto es más seguro que usar set_audience con un &str temporal.
        use std::collections::HashSet;
        let mut aud_set = HashSet::new();
        // Insertamos la URI completa que coincide con el 'aud' del token
        aud_set.insert(expected_audience_uri.clone()); 
        validation.aud = Some(aud_set);

        // 4. Decodificar. Si funciona, ¡ÉXITO!
        match jsonwebtoken::decode::<MsalClaims>(token, &decoding_key, &validation) {
            Ok(data) => {
                token_data_result = Some(data);
                println!(">>> [AUTH DEBUG] ¡ÉXITO! Validación exitosa con KID: {}", jwk["kid"].as_str().unwrap_or("Desconocido"));
                break; // La validación fue exitosa, salimos del bucle.
            }
            Err(e) => {
                // Logueamos el error de firma de la clave que falló para seguimiento.
                if e.kind() == &jsonwebtoken::errors::ErrorKind::InvalidSignature {
                    println!(">>> [AUTH DEBUG] Falla de firma con KID: {}", jwk["kid"].as_str().unwrap_or("Desconocido"));
                } else {
                    // Loguear otros errores (como InvalidAudience, si es el caso)
                    println!(">>> [AUTH DEBUG] Falla de validación ({:?}) con KID: {}", e.kind(), jwk["kid"].as_str().unwrap_or("Desconocido"));
                }
            }
        }
    }

    // 5. Devolver el resultado final
    let token_data = token_data_result.ok_or_else(|| {
        Box::new(CustomError::new(401, "Validación de token fallida: Ninguna clave JWK pudo verificar la firma o la audiencia")) as Box<dyn Error>
    })?;

    // ⭐️ FIN DE LA NUEVA LÓGICA DE FALLBACK ⭐️

    // 7. Continuar con la lógica de dominio (El resto de la función sigue igual)
    let msal_claims = token_data.claims;
    let user_upn = msal_claims.upn;
    // ...

    // Control de Dominio (Lista Blanca Multi-Tenant) 🛡️
    let domain = user_upn.split('@').nth(1)
        .ok_or_else(|| Box::new(CustomError::new(400, "Formato de UPN inválido en el token")) as Box<dyn std::error::Error>)?;
    
    if !app_state.whitelisted_domains.contains(&domain.to_lowercase()) {
        eprintln!("Dominio no autorizado: {}", domain);
        return Err(Box::new(CustomError::new(403, "Dominio no autorizado. Acceso denegado.")) as Box<dyn std::error::Error>);
    }

    // 4. BÚSQUEDA EN BASE DE DATOS
    
    // Cargar datos del usuario desde la DB (Usamos la ruta correcta: auth)
    let riy_user = auth::authenticate_msal_user(
        &app_state.db_pool,
        &user_upn, 
        &app_state.sql_collate_clause
    ).await
    .map_err(|e| Box::new(CustomError::new(500, &format!("Error de DB al buscar usuario: {}", e))) as Box<dyn std::error::Error>)?
    .ok_or_else(|| Box::new(CustomError::new(404, "Usuario válido de Azure, pero no existe en RIY-DATOS.")) as Box<dyn std::error::Error>)?;

    // 5. OBTENER PERMISOS
    
    // Obtener los permisos (Usamos la ruta correcta: utils::get_user_permissions)
    let permissions = get_user_permissions(&app_state.db_pool, &riy_user.usuario).await
        .map_err(|e| Box::new(CustomError::new(500, &format!("Error de DB al obtener permisos: {}", e))) as Box<dyn std::error::Error>)?;

    // 6. DEVOLVER RESULTADO
    Ok((riy_user, permissions))
}

// ❌ ELIMINAR LA FUNCIÓN DUPLICADA Y ANTICUADA 'validate_msal_token'
// ❌ ELIMINAR LA FUNCIÓN AUXILIAR 'extract_bearer_token' (ESTÁ EN EL HANDLER DE ACTIX)

// La función 'extract_bearer_token' debe estar en el handler de Actix (auth_route.rs)
// Si necesitas esta función en otros lugares, asegúrate de que esté en un módulo de utilidades.