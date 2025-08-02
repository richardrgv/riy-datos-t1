use dotenv::dotenv;
use tauri::{Manager, State};
use sqlx::{Pool, Mssql};

use tokio::sync::Mutex;
use std::sync::Arc;

use crate::license::{save_license_credentials_command, check_license_status_command};
use crate::db::{get_db_connection_info};

mod auth;
mod db;
mod license;

pub struct AppState {
    pub db_pool: Mutex<Option<Pool<Mssql>>>,
    pub palabra_clave1: String,
    pub palabra_clave2: String,
    pub db_connection_url: String,
    pub aplicativo_id: Mutex<i32>,
    pub sql_collate_clause: String,
    pub aplicativo: String,
    pub auth_method: String, // <- Nuevo campo para el método de autenticación
}

#[tokio::main]
async fn main() {
    let app_code = "RIY-D".to_string(); 
    dotenv().ok();

    let palabra_clave1 = std::env::var("PALABRA_CLAVE_1").expect("PALABRA_CLAVE_1 no configurada.");
    let palabra_clave2 = std::env::var("PALABRA_CLAVE_2").expect("PALABRA_CLAVE_2 no configurada.");
    let sql_collate_clause = std::env::var("SQL_COLLATE_CLAUSE").expect("SQL_COLLATE_CLAUSE must be set");

    let db_type = std::env::var("DB_TYPE").unwrap_or_else(|_| "UNKNOWN".to_string());
    let db_url_key = match db_type.as_str() {
        "SQLSERVER" => "DATABASE_URL_SQLSERVER",
        _ => panic!("DB_TYPE no configurado o no soportado."),
    };
    let db_url = std::env::var(db_url_key).expect(&format!("{} debe estar configurado.", db_url_key));

    // --- NUEVO: Leer el método de autenticación ---
    let auth_method = std::env::var("AUTH_METHOD").unwrap_or_else(|_| "DEFAULT".to_string());
    

    // --- CORRECCIÓN CLAVE: Inicializar el pool de forma síncrona antes de la aplicación ---
    let pool = db::connect_db(&db_url).await
        .map_err(|e| {
            eprintln!("Fallo al conectar a la base de datos: {:?}", e);
            panic!("Fallo crítico: No se pudo conectar a la base de datos.");
        })
        .unwrap();

    let app_id_value = db::get_aplicativo_id(&pool, &app_code).await
        .map_err(|e| {
            eprintln!("Fallo al obtener aplicativoID: {:?}", e);
            panic!("Fallo crítico: No se pudo obtener el aplicativoID al inicio.");
        })
        .unwrap();

    let initial_state = AppState {
        db_pool: Mutex::new(Some(pool)),
        palabra_clave1,
        palabra_clave2,
        db_connection_url: db_url.to_string(),
        aplicativo_id: Mutex::new(app_id_value),
        sql_collate_clause,
        aplicativo: app_code,
        auth_method, // <- Pasar el método de autenticación al estado
    };

    tauri::Builder::default()
        .setup(move |app| {
            println!("Pool de base de datos y aplicativoID inicializados exitosamente.");
            Ok(())
        })
        .manage(initial_state)
        .invoke_handler(tauri::generate_handler![
            user_login, // Corregido: user_login en auth.rs
            save_license_credentials_command,
            check_license_status_command,
            get_db_connection_info,
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación Tauri");
}

#[tauri::command]
async fn user_login(state: State<'_, AppState>, username: String, password: String) -> Result<bool, String> {
    let pool = {
        let pool_guard = state.db_pool.lock().await;
        pool_guard.as_ref().ok_or("Database pool not initialized".to_string())?.clone()
    };
    
    let auth_method = state.auth_method.clone();
    let sql_collate_clause = state.sql_collate_clause.clone();

    // --- LÓGICA CONDICIONAL DE AUTENTICACIÓN ---
    let is_valid = match auth_method.as_str() {
        "ERP" => auth::authenticate_erp_user(&pool, &username, &password, &sql_collate_clause).await,
        _ => auth::authenticate_user(&pool, &username, &password).await,
    };
    
    match is_valid {
        Ok(is_valid) => Ok(is_valid),
        Err(e) => Err(format!("Login failed: {}", e)),
    }
}