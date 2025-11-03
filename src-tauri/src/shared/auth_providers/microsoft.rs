// src/services/auth_providers/microsoft.rs

use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation}; // decode_header

// 🚨 CORRECCIÓN: Asegúrate de que esta línea esté presente 🚨
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD}; // 👈 SOLUCIÓN AL E0425

use serde::Deserialize;
use anyhow::Result;
//use std::env;

use std::sync::Arc; // 👈 Asegúrate de importar esto
use reqwest::Client; // 👈 Asegúrate de importar esto
use std::collections::HashSet; // 👈 Asegúrate de importar esto

// Tipo de alias para el resultado de identidad: (email, unique_id)
pub type IdentityResult = Result<(String, String), anyhow::Error>;

use crate::auth_providers::jwks_security; // 🚨 NUEVA IMPORTACIÓN

// --- Estructura para el Payload del Access Token de Microsoft (Claims) ---
// La estructura varía, pero estos son los claims cruciales
#[derive(Debug, Deserialize)]
struct MicrosoftClaims {
    iss: String,     // Issuer (Entra ID o MSA)
    aud: String,     // Audience (Su Client ID)
    oid: Option<String>, // Object ID (ID único para Entra ID B2B/B2C)
    sub: Option<String>, // Subject (ID único para cuentas personales/MSA)
    upn: Option<String>, // User Principal Name (a menudo el email en Entra ID)
    preferred_username: Option<String>, // A menudo el email
}

// ----------------------------------------------------------------------
// FUNCIÓN PRINCIPAL: Valida el Access Token de Microsoft
// ----------------------------------------------------------------------
//pub async fn validate_microsoft_token(access_token: &str) -> IdentityResult {
// 🚨 La función ahora acepta 5 argumentos 🚨
pub async fn validate_microsoft_token(
    // 1. El token/código de identidad
    token: &str, 
    // --- 4 Argumentos de configuración ---
    http_client: &Arc<Client>, 
    msal_client_id: &str, // (Ya no se usa aquí)
    msal_audience_uri: &str, // 🚨 Argumento NUEVO/AJUSTADO
    // ...
    msal_jwks_url: &str,
    whitelisted_domains: &HashSet<String>, // El conjunto de dominios para validación
) -> IdentityResult {

    eprintln!("Token MSAL (Longitud: {}): {}", token.len(), token); // 🚨 Añadir este LOG
    
    // 1. Cargar Client ID (¡USAMOS EL ARGUMENTO INYECTADO!)
    let client_id = msal_client_id;
    
    // 2. Obtener la Autoridad (Issuer) del Token
    // Decodificamos el header para obtener el 'kid'
    let header = jsonwebtoken::decode_header(token)?; // 🚨 Usar 'token'
    
    // 🚨 Extraemos el 'iss' (ej. https://login.microsoftonline.com/{tenantId}/v2.0)
    let token_parts: Vec<&str> = token.split('.').collect(); // 🚨 Usar 'token'
    if token_parts.len() != 3 {
        return Err(anyhow::anyhow!("Token de Microsoft con formato incorrecto"));
    }
    
    // Decodificamos el payload para obtener el 'iss'
    // Decodificamos el payload para obtener el 'iss'
    // 🚨 CAMBIO CRÍTICO: Usar URL_SAFE_NO_PAD para el token de Microsoft/JWT 🚨
    let payload_bytes = URL_SAFE_NO_PAD.decode(token_parts[1])?; 
    let payload_claims: serde_json::Value = serde_json::from_slice(&payload_bytes)?;
    // ...

    //let payload_bytes = general_purpose::URL_SAFE.decode(token_parts[1])?; 
    //let payload_claims: serde_json::Value = serde_json::from_slice(&payload_bytes)?;

    let issuer = payload_claims["iss"].as_str()
        .ok_or_else(|| anyhow::anyhow!("Token de MSAL sin 'iss' (Issuer)"))?
        .to_string();

    // 3. Descargar la Clave (JWKS) de Microsoft
    // Usamos la URL que el token DINÁMICAMENTE requiere (más seguro)
    let jwks_url_dynamic = format!("{}/discovery/v2.0/keys", issuer);
    
    // 🚨 LLAMADA SEGURA: OBTENEMOS LA CLAVE PÚBLICA (asumimos que la función 
    // jwks_security ha sido actualizada para aceptar http_client)
    let decoding_key = jwks_security::get_decoding_key(
        http_client, // 👈 USAMOS EL CLIENTE INYECTADO
        &jwks_url_dynamic,
        token // 🚨 Usar 'token'
    ).await?;

    // 4. Configurar y Validar el Token
    let mut validation = Validation::new(Algorithm::RS256);
    // 🚨 USAMOS EL ID INYECTADO
    // 🚨 CAMBIO CRÍTICO: Usar el URI completo 🚨
    validation.set_audience(&[msal_audience_uri.to_string()]);
    //validation.set_audience(&[client_id.to_string()]); 
    validation.set_issuer(&[issuer]); // Usa el 'iss' dinámico
    
    let token_data = decode::<MicrosoftClaims>(
        token, // 🚨 Usar 'token'
        &decoding_key, // Clave pública obtenida del JWKS
        &validation,
    )?;

    let claims = token_data.claims;
    
    // 5. Determinar Email y Unique ID
    // ... (El resto de la lógica de claims es funcional) ...
    let email = claims.upn.or(claims.preferred_username)
        .ok_or_else(|| anyhow::anyhow!("Token de MSAL no contiene email/upn"))?;
        
    let unique_id = claims.oid.or(claims.sub)
        .ok_or_else(|| anyhow::anyhow!("Token de MSAL no contiene OID/SUB"))?;

    // 6. Devolver la identidad unificada
    Ok((email, unique_id)) 
}

// ----------------------------------------------------------------------
// 🚨 FUNCIÓN DE PRUEBA/SIMULADA (Debe ser implementada de forma segura)
// ----------------------------------------------------------------------
// Al igual que Google, esta función debe ser reemplazada por una librería JWKS real.
async fn get_microsoft_decoding_key(jwks_url: &str, access_token: &str) -> Result<DecodingKey, anyhow::Error> {
    // ... (Lógica de descarga y búsqueda de KID en JWKS de Microsoft)
    
    // Para que compile y sigamos con la arquitectura:
    Err(anyhow::anyhow!("Implementación de JWKS y verificación de Microsoft Faltante (CRÍTICO DE SEGURIDAD)"))
}