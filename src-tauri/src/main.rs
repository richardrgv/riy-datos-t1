// src-tauri/src/main.rs

use dotenv::dotenv;
use tauri::{Manager, State};
use sqlx::{Pool, Mssql};

use tokio::sync::Mutex;
use std::sync::Arc;

use crate::license::{save_license_credentials_command, check_license_status_command};
use crate::db::{get_db_connection_info};

// Importa el comando específico del módulo `user`
use crate::user::{
    get_users,
    add_user_from_erp,
    search_erp_users,
    update_user
};


mod auth;
mod db;
mod license;
mod models; // <-- Declara el nuevo módulo
mod user; // <-- Declara el nuevo módulo

use models::Usuario; // <-- Importa la estructura Usuario desde el módulo
use serde::{Serialize, Deserialize}; // Asegúrate de que esta línea esté aquí

use crate::models::LoggedInUser; // Asegúrate de tener este import
//use crate::auth; // Asegúrate de tener este import

pub struct AppState {
    pub db_pool: Mutex<Option<Pool<Mssql>>>,
    pub palabra_clave1: String,
    pub palabra_clave2: String,
    pub db_connection_url: String,
    pub aplicativo_id: Mutex<i32>,
    pub sql_collate_clause: String,
    pub aplicativo: String,
    pub auth_method: String, // <- Nuevo campo para el método de autenticación
    pub usuario_conectado: Mutex<Option<LoggedInUser>>, // <-- NUEVO: Para guardar el usuario logueado
    
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

    let auth_method = std::env::var("AUTH_METHOD").unwrap_or_else(|_| "DEFAULT".to_string());
    

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
        auth_method, 
        usuario_conectado: Mutex::new(None), // <-- Se inicializa como None
    };

    tauri::Builder::default()
        .setup(move |app| {
            println!("Pool de base de datos y aplicativoID inicializados exitosamente.");
            Ok(())
        })
        .manage(initial_state)
        .invoke_handler(tauri::generate_handler![
            user_login, // Corregido: user_login en user.rs
            save_license_credentials_command,
            check_license_status_command,
            get_db_connection_info,
            get_users, // <-- Llama al comando desde el nuevo módulo user
            add_user_from_erp,
            search_erp_users,
            update_user
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación Tauri");
}

#[tauri::command]
async fn user_login(
    state: tauri::State<'_, AppState>,
    username: String,
    password: String,
) -> Result<Option<LoggedInUser>, String> {
    let pool_guard = state.db_pool.lock().await;
    let pool = pool_guard.as_ref().ok_or("El pool de la base de datos no está inicializado".to_string())?;
    
    let auth_method = &state.auth_method;
    let sql_collate_clause_ref = &state.sql_collate_clause;

    let auth_result = match auth_method.as_str() {
        "ERP" => auth::authenticate_erp_user(&pool, &username, &password, sql_collate_clause_ref).await,
        _ => auth::authenticate_user(&pool, &username, &password).await,
    };
    
    // Si la autenticación es exitosa, guardamos el usuario en el estado
    if let Ok(Some(usuario_conectado)) = &auth_result {
        let mut user_state_guard = state.usuario_conectado.lock().await;
        *user_state_guard = Some(usuario_conectado.clone());
    }

    auth_result
}