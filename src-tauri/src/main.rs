// src-tauri/src/main.rs
// --------------------------------------------------------------------------------
// Entry point principal de la aplicación Tauri.
// --------------------------------------------------------------------------------

use dotenv::dotenv;
use tauri::{Manager, State};
use sqlx::{Pool, Mssql};
use anyhow::{Result, anyhow};

// Módulos locales
mod user; 
mod menu; 
mod license;
mod api;    // Define la estructura de las APIs (Actix Web)
mod shared; // Define módulos compartidos (auth, models, repo, etc.)

use crate::license::{
    save_license_credentials_command, 
    check_license_status_command
};

// Usa el crate actual para encontrar la librería compartida y modelos
use shared_lib::{db}; 
use crate::models::LoggedInUser; // Necesario si LoggedInUser se usa en AppState

// Autenticación Externa (MSAL B2C y Google)
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Mutex;
use reqwest::Client; 
use jwks_rs::JwksClient; // Cliente para validar JWTs de Azure AD B2C

// Importa el comando de chequeo de DB
use shared_lib::db::get_db_connection_info;

// --------------------------------------------------------------------------------
// 1. ESTADO COMPARTIDO DE LA APLICACIÓN (AppState)
// --------------------------------------------------------------------------------

/// Estructura de datos que se comparte en toda la aplicación Tauri.
pub struct AppState {
    pub db_pool: Arc<Pool<Mssql>>,
    pub jwt_auth_client: Arc<Mutex<JwksClient>>, // Cliente JWKS para validar tokens
    pub reqwest_client: Arc<Client>, // Cliente HTTP para peticiones (como Google o MSAL)
    pub aplicativo_id: String,
    // La URL de JWKS se guarda aquí como referencia, aunque el cliente ya está inicializado.
    pub jwks_url: String, 
}

// --------------------------------------------------------------------------------
// 2. FUNCIÓN PRINCIPAL
// --------------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<()> {
    // Carga variables de entorno desde el archivo .env
    dotenv().ok();

    // Carga variables de entorno CRÍTICAS para la BD y el JWKS
    let database_url = std::env::var("DATABASE_URL")
        .map_err(|_| anyhow!("DATABASE_URL no está definida"))?;
    let aplicativo_id = std::env::var("APLICATIVO_ID")
        .map_err(|_| anyhow!("APLICATIVO_ID no está definida"))?;
    // 🚨 CRÍTICO para B2C: Cargar la URL del JWKS
    let jwks_url = std::env::var("JWKS_URL")
        .map_err(|_| anyhow!("JWKS_URL (Azure AD B2C) no está definida"))?;
    
    // 1. Inicializa el Pool de la Base de Datos
    let db_pool = db::initialize_db(&database_url).await
        .map_err(|e| anyhow!("Error al inicializar la base de datos: {}", e))?;
    let db_pool_arc = Arc::new(db_pool);

    // 2. Inicializa el Cliente HTTP (reqwest)
    let reqwest_client = Arc::new(Client::new());

    // 3. Inicializa el Cliente JWKS (para validación de tokens de MSAL B2C)
    println!("Inicializando cliente JWKS con URL: {}", jwks_url);
    let jwt_auth_client = JwksClient::build_async(
        reqwest_client.clone(), 
        &jwks_url,
    ).await
    .map_err(|e| anyhow!("Error al inicializar el cliente JWKS: {}", e))?;

    let jwt_auth_client_mutex = Arc::new(Mutex::new(jwt_auth_client));

    // 4. Crear el estado inicial de la aplicación Tauri
    let initial_state = AppState {
        db_pool: db_pool_arc.clone(),
        aplicativo_id: aplicativo_id.clone(),
        reqwest_client: reqwest_client.clone(),
        jwks_url: jwks_url.to_string(), 
        jwt_auth_client: jwt_auth_client_mutex, // <--- Cliente JWKS
    };
    
    // 5. Construir y ejecutar la aplicación Tauri
    tauri::Builder::default()
        .setup(move |app| {
            println!("Pool de base de datos y aplicativo ID inicializados exitosamente.");
            Ok(())
        })
        .manage(initial_state)
        .invoke_handler(tauri::generate_handler![
            // Comandos de Licencia y Conexión
            save_license_credentials_command,
            check_license_status_command,
            get_db_connection_info_command, 
            
            // Comandos de Usuario (Autenticación)
            user::user_login, // Login interno tradicional
            user::user_login_external, // 🚨 CRÍTICO: Login externo (MSAL/Google)
            
            // Comandos de Gestión
            user::get_users,
            user::add_user,
            user::search_erp_users,
            user::update_user,
            
            // Comandos de Menú
            menu::get_all_menus_command,
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación Tauri");

    Ok(())
}


// --------------------------------------------------------------------------------
// 3. COMANDOS BRIDGE (Tauri Commands)
// --------------------------------------------------------------------------------

// Comando puente para obtener la información de conexión a la BD
// Llama a la lógica de la librería compartida `shared_lib::db::get_db_connection_info`
#[tauri::command]
async fn get_db_connection_info_command(
    state: tauri::State<'_, AppState>,
) -> Result<(String, String), String> {
    let pool = state.db_pool.clone();
    // Llama a la lógica de la librería compartida
    get_db_connection_info(&pool)
        .await
        .map_err(|e| format!("Error al obtener info de conexión: {}", e))
} 