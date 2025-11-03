// src/services/auth_providers/google.rs

// 🚨 Asegúrate de que TODAS las partes de jsonwebtoken estén aquí 🚨
use jsonwebtoken::{
    decode,
    //decode_header,
    Algorithm, // <-- ¡Falta este!
    DecodingKey, 
    Validation, // <-- ¡Falta este!
};
use reqwest::Client;
use serde::Deserialize;
use anyhow::Result;
use std::sync::Arc; // 👈 ¡AÑADIR ESTA LÍNEA!
//use std::env;

// Tipo de alias para el resultado de identidad: (email, unique_id)
pub type IdentityResult = Result<(String, String), anyhow::Error>;

use crate::auth_providers::jwks_security; // 🚨 NUEVA IMPORTACIÓN

// --- Estructuras para el Intercambio de Código ---

#[derive(Deserialize)]
struct TokenResponse {
    id_token: String,
}

// --- Estructura para el Payload del ID Token de Google (Claims) ---
#[derive(Debug, Deserialize)]
struct GoogleClaims {
    iss: String,     // Issuer (quién emite el token)
    aud: String,     // Audience (su Client ID)
    sub: String,     // ID único de Google (usaremos como unique_id)
    email: String,   // Email del usuario
    email_verified: bool, // Debe ser true
}

// ----------------------------------------------------------------------
// FUNCIÓN PRINCIPAL: Intercambia el código y valida el ID Token
// ----------------------------------------------------------------------
// 🚨 La función ahora acepta 5 argumentos 🚨
pub async fn validate_google_code(
    code: &str, 
    redirect_uri: &str,
    // --- Nuevos argumentos de configuración ---
    http_client: &Arc<Client>, 
    google_client_id: &str,
    google_client_secret: &str,
) -> IdentityResult {
//pub async fn validate_google_code(code: &str, redirect_uri: &str) -> IdentityResult {
    
    // La macro 'use' fue movida al inicio del archivo

    // 1. Cargar Credenciales (¡USAMOS LOS ARGUMENTOS INYECTADOS!)
    let client_id = google_client_id;
    let client_secret = google_client_secret;

    // 2. Intercambio de Código por ID Token
    // 🚨 USAMOS EL CLIENTE HTTP INYECTADO (http_client) 🚨
    let params = [
        ("code", code),
        ("client_id", client_id), // Usamos el argumento inyectado
        ("client_secret", client_secret), // Usamos el argumento inyectado
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code"),
    ];

    let token_res = http_client // 👈 USAMOS LA REFERENCIA INYECTADA
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await?
        .error_for_status()?
        .json::<TokenResponse>()
        .await?;

    // 3. Validación del ID Token (CRÍTICO DE SEGURIDAD)
    // -----------------------------------------------------------
    
    // a) Descargar la clave de Google (JWKS) para verificar la firma
    let jwks_url = "https://www.googleapis.com/oauth2/v3/certs";
    // ⚠️ IMPLEMENTACIÓN FALTANTE: Debe obtener y cachear el JWKS.
    // Aquí se necesita una librería que maneje JWKS, o implementar la descarga manual.
    
    // Para que el código compile y podamos avanzar, asumiremos que tiene una función 
    // que obtiene la clave de forma segura:
    // 🚨 LLAMADA SEGURA: Obtenemos la clave pública correcta
    let decoding_key = jwks_security::get_decoding_key(
        http_client, // 👈 ¡EL ARGUMENTO QUE FALTABA!
        jwks_url, 
        &token_res.id_token
    ).await?; 

    // b) Configurar la validación
    let mut validation = Validation::new(Algorithm::RS256);
    // 🚨 Aquí usamos la variable local 'client_id', que ahora es el argumento inyectado
    validation.set_audience(&[client_id.to_string()]); // Verifica que el token sea para usted
    validation.set_issuer(&["https://accounts.google.com"]); // Verifica la fuente

    let token_data = decode::<GoogleClaims>(
        &token_res.id_token,
        &decoding_key,
        &validation,
    )?;

    let claims = token_data.claims;

    // c) Última verificación de seguridad
    if !claims.email_verified {
        return Err(anyhow::anyhow!("Email del proveedor de Google no verificado"));
    }
    
    // 4. Devolver la identidad unificada (email, unique_id)
    Ok((claims.email, claims.sub)) 
}

// ----------------------------------------------------------------------
// 🚨 FUNCIÓN DE PRUEBA/SIMULADA (Debe ser implementada de forma segura)
// ----------------------------------------------------------------------
// Esta función debe ser reemplazada por una librería JWKS real.
async fn get_google_decoding_key(jwks_url: &str, id_token: &str) -> Result<DecodingKey, anyhow::Error> {
    // 1. Obtener el 'kid' del header del token (necesario para buscar la clave)
    let header = jsonwebtoken::decode_header(id_token)?;
    let kid = header.kid.ok_or_else(|| anyhow::anyhow!("Token de Google sin KID"))?;
    
    // 2. Descargar el JWKS de la URL
    let client = Client::new();
    let jwks_response: serde_json::Value = client.get(jwks_url)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
        
    // 3. Buscar la clave que coincida con el 'kid' y crear DecodingKey
    // ⚠️ ESTO ES COMPLEJO y se recomienda usar una librería JWKS
    
    // Por ahora, para que compile y sigamos con MSAL:
    // Retorna una clave dummy que fallará la verificación JWT si no se corrige.
    // Usaremos un truco para avanzar, asumiendo un certificado local, 
    // pero DEBE ser reemplazado por la lógica de clave pública de Google.
    
    // Si tiene un certificado .pem, lo cargaría aquí.
    // Para simplificar, simplemente devolveremos un error que obligue a la implementación real.
    
    Err(anyhow::anyhow!("Implementación de JWKS y verificación de Google Faltante (CRÍTICO DE SEGURIDAD)"))
}