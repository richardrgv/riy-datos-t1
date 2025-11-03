// src/services/jwks_security.rs (Nuevo Módulo)

use jsonwebtoken::{DecodingKey, Algorithm, decode_header};
use reqwest::Client;
use serde::Deserialize;
use anyhow::{Result, anyhow};
//use std::collections::HashMap;
use std::sync::Arc;


// --- Estructuras para el JWKS de Google/Microsoft ---

#[derive(Debug, Deserialize)]
struct Jwk {
    kty: String, // Key Type (RSA)
    n: String,   // Modulus
    e: String,   // Exponent
    kid: String, // Key ID (el identificador)
    alg: Option<String>, // Algoritmo
}

#[derive(Debug, Deserialize)]
struct Jwks {
    keys: Vec<Jwk>,
}

// ----------------------------------------------------------------------
// FUNCIÓN CENTRAL: Obtiene la clave de decodificación para un token JWT
// ----------------------------------------------------------------------
// Nota: En producción, el resultado de esta función debería ser cacheado
//pub async fn get_decoding_key(jwks_url: &str, id_token: &str) -> Result<DecodingKey, anyhow::Error> {
// 🚨 MODIFICA ESTA FUNCIÓN 🚨
pub async fn get_decoding_key(
    http_client: &Arc<Client>, // 👈 ¡USAMOS ESTE!
    jwks_url: &str, 
    token: &str // 👈 Usamos este argumento
) -> Result<DecodingKey, anyhow::Error> {

    // 1. Obtener el 'kid' del header del token (clave necesaria para la búsqueda)
    // 🚨 CORRECCIÓN: Usar 'token' en lugar de 'id_token'
    let header = decode_header(token)?; 
    let kid = header.kid.ok_or_else(|| anyhow!("Token JWT sin KID (Key ID)"))?;

    // 2. Descargar el JWKS (JSON Web Key Set)
    // 🚨 CORRECCIÓN: Usar el cliente INYECTADO 'http_client'
    let jwks_response = http_client.get(jwks_url) // 👈 USAMOS EL CLIENTE INYECTADO
        .send()
        .await?
        .error_for_status()?
        .json::<Jwks>() // ⚠️ Asumo que Jwks está definido e importado
        .await?;
        
    // 3. Buscar la clave que coincida con el 'kid'
    let jwk = jwks_response.keys.into_iter()
        .find(|k| k.kid == kid)
        .ok_or_else(|| anyhow!("No se encontró la clave KID '{}' en el JWKS.", kid))?;

    // 4. Crear la Clave de Decodificación (DecodingKey)
    let decoding_key = match (jwk.n, jwk.e) {
        (n, e) => {
            if header.alg == Algorithm::RS256 {
                DecodingKey::from_rsa_components(&n, &e)?
            } else {
                return Err(anyhow!("Algoritmo no soportado: {:?}", header.alg));
            }
        }
    };
    
    Ok(decoding_key)
}