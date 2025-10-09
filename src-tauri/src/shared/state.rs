// src/shared/state.rs

use sqlx::{Pool, Mssql};
use tokio::sync::Mutex;
use std::collections::HashSet;
// librería especializada que gestione el cliente JWKS de forma nativa.
use reqwest::Client; // Cliente HTTP
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db_pool: Pool<Mssql>,
    pub palabra_clave1: String,
    pub palabra_clave2: String,
    pub db_connection_url: String,
    pub aplicativo_id: Arc<Mutex<i32>>,
    pub sql_collate_clause: String,
    pub aplicativo: String,
    pub auth_method: String,
    pub usuario_conectado: Arc<Mutex<Option<String>>>,
    pub jwt_secret: String,

    // ⭐ NUEVOS CAMPOS MSAL ⭐
    pub msal_client_id: String,
    pub whitelisted_domains: HashSet<String>,
    // ✅ AÑADIR:
    pub http_client: Arc<reqwest::Client>, // Cliente HTTP
    pub msal_jwks_url: String,           // URL para descargar las claves
}
