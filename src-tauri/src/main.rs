// src-tauri/src/main.rs

use dotenv::dotenv;
//use tauri::{Manager, State};
use sqlx::{Pool, Mssql};

use tokio::sync::Mutex;
//use std::sync::Arc;



// Importa el comando específico del módulo `user`
// Declare the user module
mod user; 


mod license;
use crate::license::{
    save_license_credentials_command, 
    check_license_status_command
};


// Usa el crate actual para encontrar la librería compartida
use shared_lib::{db, models, user_logic, menu_logic};

use crate::models::LoggedInUser; // Asegúrate de tener este import




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
            save_license_credentials_command,
            check_license_status_command,
            get_db_connection_info_command, // <-- AHORA SÍ USA ESTE COMANDO,
            user::user_login, 
            user::get_users,
            user::add_user,
            user::search_erp_users,
            user::update_user,
            menu::get_all_menus_command,
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación Tauri");
}





// **AÑADE ESTA FUNCIÓN AQUÍ**
// Este es el comando "puente" que llama a la función de la librería compartida.
#[tauri::command]
async fn get_db_connection_info_command(
    state: tauri::State<'_, AppState>,
) -> Result<(String, String), String> {
    let db_url = &state.db_connection_url;
    
    // CAMBIO CLAVE: Usa `.await` antes de `.map_err`
    db::get_db_connection_info(db_url)
        .await // <-- Añade .await aquí
        .map_err(|e| e.to_string())
}