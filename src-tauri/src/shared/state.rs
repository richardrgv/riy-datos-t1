// src/shared/state.rs

use sqlx::{Pool, Mssql};
use std::sync::Arc;
use tokio::sync::Mutex;


#[derive(Clone)]
pub struct AppState {
    pub db_pool: Pool<Mssql>,
    pub palabra_clave2: String,
    pub db_connection_url: String,
    pub aplicativo_id: Arc<Mutex<i32>>,
    pub sql_collate_clause: String,
    pub aplicativo: String,
    pub auth_method: String,
    pub usuario_conectado: Arc<Mutex<Option<String>>>,
    pub jwt_secret: String,
}