// src-tauri/src/main.rs

/*
Es el ejecutable principal de Tauri (el lanzador).
*/

use dotenv::dotenv;
//use tauri::{Manager, State};
use sqlx::{Pool, Mssql};


// Importa el comando específico del módulo `user`
// Declare the user module
mod user; 
mod menu; 
mod license;
use crate::license::{
    save_license_credentials_command, 
    check_license_status_command
};
mod api;    // 👈 ¡NECESARIO! Declara el contenido de src/api/ como el módulo 'api'
mod shared; // Declara el módulo 'shared'

// Usa el crate actual para encontrar la librería compartida
use shared_lib::{db, models, user_logic}; //, menu_logic};
use crate::models::LoggedInUser; // Asegúrate de tener este import

// MSAL
use std::collections::HashSet; // 👈 Importa HashSet para la lista blanca
use std::sync::Arc;
use tokio::sync::Mutex; // 👈 NECESITAS ESTE Mutex para usar .await
// librería especializada que gestione el cliente JWKS de forma nativa.
use reqwest::Client; 

// 🚨 CORRECCIÓN 1: Importar JwksClient y get_db_connection_info
// Reemplaza 'jwks_rs' con el nombre de tu crate si es diferente.
use jwks_rs::JwksClient; // 👈 NECESARIO para usar JwksClient::new
//use shared_lib::db::get_db_connection_info; // 👈 Necesario para el comando de Tauri
// ...

pub struct AppState {
    pub db_pool: Mutex<Option<Pool<Mssql>>>,
    pub palabra_clave1: String,
    pub palabra_clave2: String,
    pub db_connection_url: String,
    pub aplicativo_id: Arc<Mutex<i32>>,
    pub sql_collate_clause: String,
    pub aplicativo: String,
    pub auth_method: String, // <- Nuevo campo para el método de autenticación
    pub usuario_conectado: Mutex<Option<LoggedInUser>>, // <-- NUEVO: Para guardar el usuario logueado
    
    // ⭐️ NUEVOS CAMPOS DE AUTENTICACIÓN MSAL ⭐️
    pub msal_client_id: String,
    pub whitelisted_domains: HashSet<String>, // Lista blanca de dominios
    
    // 🚨 AÑADIR CAMPOS DE AUTENTICACIÓN GOOGLE 🚨
    pub google_client_id: String,
    pub google_client_secret: String,

    // ⭐️ DEBE LLAMARSE EXACTAMENTE ASÍ ⭐️
    pub http_client: Arc<reqwest::Client>, // Cliente HTTP
    pub msal_jwks_url: String,           // URL para descargar las claves
    pub jwt_auth_client: Arc<jwks_rs::JwksClient>, // <--- ¡Asegúrate de incluir este también!
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


     // ⭐️ Carga de variables de entorno para MSAL ⭐️
    let msal_client_id = std::env::var("MSAL_CLIENT_ID")
        .expect("MSAL_CLIENT_ID debe estar configurado para la autenticación MSAL.");
    // CLIENT_ID es un identificador único que Microsoft Azure le asigna a tu aplicación

    // Cargar dominios de la lista blanca desde una variable de entorno
    let domains_string = std::env::var("WHITELISTED_DOMAINS")
        .expect("WHITELISTED_DOMAINS (separados por coma) deben estar configurados.");

    // Convertir la cadena separada por comas en un HashSet para búsquedas rápidas
    let whitelisted_domains: HashSet<String> = domains_string
        .split(',')
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
        .collect();

    // ⭐️ Carga de variables de entorno para GOOGLE ⭐️
let google_client_id = std::env::var("GOOGLE_CLIENT_ID")
    .expect("GOOGLE_CLIENT_ID debe estar configurado.");
let google_client_secret = std::env::var("GOOGLE_CLIENT_SECRET")
    .expect("GOOGLE_CLIENT_SECRET debe estar configurado.");
    
    // -------------------------------------------------------------------
    // ✅ INICIALIZACIÓN DEL CLIENTE JWKS USANDO 'jwks-rs::JwksClient::new'
    // -------------------------------------------------------------------
    // -------------------------------------------------------------------
    // ✅ INICIALIZACIÓN DE REQWEST
    // -------------------------------------------------------------------
    const JWKS_URL: &str = "https://login.microsoftonline.com/6e0ae27f-ee36-48dd-aa27-00166964baba/discovery/v2.0/keys";

    let http_client_instance = Client::new(); // Constructor síncrono, no hay pánico de Tokio
    let http_client = Arc::new(http_client_instance); 
    // -------------------------------------------------------------------

    
    // 2. Crear el cliente Jwks
    // El método 'new' es síncrono, evitando el pánico de runtime.
    let jweks_client = JwksClient::new(JWKS_URL.to_string()) 
        // Nota: JwksClient::new devuelve un Result<Self, Error>, por lo que necesitamos expect
        .expect("Fallo crítico: No se pudo inicializar el cliente JwksClient.");

    // 3. Envolver en Arc para compartirlo de forma segura en el estado
    let jwt_auth_client = Arc::new(jweks_client); // Mantenemos el nombre de la variable 'jwt_auth_client'

    // ------------------------------------------------------------------


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
        aplicativo_id: app_id_value, //Mutex::new(app_id_value),
        sql_collate_clause,
        aplicativo: app_code,
        auth_method, 
        usuario_conectado: Mutex::new(None), // <-- Se inicializa como None
        // ⭐ Inicializar los nuevos campos ⭐
        msal_client_id,
        whitelisted_domains,

        // 🚨 CORRECCIÓN 2: Añadir campos de Google
        google_client_id,
        google_client_secret,

        http_client,             // 👈 Cliente HTTP
        msal_jwks_url: JWKS_URL.to_string(), // 👈 URL de JWKS
        jwt_auth_client, // <--- Usa la variable ya envuelta en Arc
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
            user::user_login_external, // 🚨 ¡AÑADIR ESTE COMANDO!
            user::get_users,
            user::add_user,
            user::search_erp_users,
            user::update_user,
            menu::get_all_menus_command,
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación Tauri");
}




// src-tauri/src/main.rs (Al final del archivo)
// Este es el comando "puente" que llama a la función de la librería compartida.
#[tauri::command]
async fn get_db_connection_info_command(
    state: tauri::State<'_, AppState>,
) -> Result<(String, String), String> {
    
    // La importación a esta función ya la definiste arriba: use shared_lib::db::get_db_connection_info;
    let db_url = &state.db_connection_url;
    
    shared_lib::db::get_db_connection_info(db_url)
        .await 
        .map_err(|e| e.to_string())
}