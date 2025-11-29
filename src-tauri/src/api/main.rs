// src/api/main.rs

use dotenv::dotenv; 

use actix_cors::Cors;
use actix_web::{
    web, App, HttpServer,
    middleware::Logger};
use shared_lib::{db, state::AppState, middleware::auth_middleware::Authenticated};

// Importamos el cliente MsalAuthClient y AppConfig desde nuestros módulos compartidos.
use shared_lib::{
    auth::{DbPool}, // MsalAuthClient
    config::AppConfig, 
    // Otros módulos compartidos...
}; 
// -------------------------------------------------------------------------
// ESTRUCTURAS DE ESTADO GLOBAL DE TAURI
// -------------------------------------------------------------------------

// Estado global que se inyecta en los comandos de Tauri.
//pub struct AppState {
 //   pub db_pool: Pool<Mssql>,
    // Usamos nuestro cliente simulado/simplificado:
    //pub msal_client: MsalAuthClient, 
    //pub app_config: AppConfig,
//
 
// -------------------------------------------------------------------------
// CÓDIGO DE INICIALIZACIÓN (TAURI SETUP)
// -------------------------------------------------------------------------

/// Función que inicializa la conexión a la DB, el cliente MSAL y el estado de la aplicación.
pub async fn setup_app_state(app_config: AppConfig) -> Result<Arc<AppState>, anyhow::Error> {
    
    // --- 1. Inicializar DB Pool (Placeholder - Reemplazar con lógica real) ---
    // Debe usar `app_config.database_url` para inicializar el Pool real.
    // Ej: let db_pool = MssqlPoolOptions::new().connect(&app_config.database_url).await?;
    let db_pool: DbPool = todo!("La inicialización del Pool de SQL Server va aquí"); 

    // --- 2. Inicializar MsalAuthClient ---
    // Usamos el constructor `new` de MsalAuthClient, que ahora usa el MockJwksClient internamente.
    let msal_client = MsalAuthClient::new(
        &app_config.msal_jwks_uri,
        &app_config.msal_authority,
        &app_config.msal_client_id,
    )?;

    let state = Arc::new(AppState {
        db_pool,
        msal_client,
        app_config,
    });

    Ok(state)
}


// -------------------------------------------------------------------------
// COMANDOS DE TAURI (Deben ser definidos aquí o en un módulo aparte)
// -------------------------------------------------------------------------

// [TAURI COMMAND] Ejemplo de comando (puedes eliminar si no lo necesitas).
#[tauri::command]
async fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

// Otros comandos de API irían aquí.




// Importa los módulos de rutas
mod routes;
use routes::{auth_route, license_route, user_route, menu_route};

// Importaciones para el estado de la aplicación
// IMPORTANTE: Eliminamos la importación fallida de jwks_rs:
// // use jwks_rs::JwksClient; e tokio::sync::Mutex;
use reqwest::Client; 
use std::sync::Arc;

// Módulos internos
mod msal_security_logic; 
mod errors; 

#[tokio::main]
pub async fn main_api_server() -> std::io::Result<()> {
    // Carga variables de entorno (necesario para Actix)
    dotenv().ok(); 

    // 1. Carga variables de entorno
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL no está definida");
    let aplicativo_id = std::env::var("APLICATIVO_ID")
        .expect("APLICATIVO_ID no está definida");
    let jwks_url = std::env::var("JWKS_URL")
        .expect("JWKS_URL (Azure AD B2C) no está definida");
    
    // 2. Inicializa el Pool de la Base de Datos
    let db_pool = db::initialize_db(&database_url).await
        .expect("Error al inicializar la base de datos");

    // 3. Inicializa el Cliente HTTP (reqwest)
    let reqwest_client = Arc::new(Client::new());

    // 4. Inicializa el Cliente JWKS (para validación de tokens de MSAL B2C)
    println!("[API SERVER] Inicializando cliente JWKS con URL: {}", jwks_url);
    let jwt_auth_client = JwksClient::build_async(
        reqwest_client.clone(), 
        &jwks_url,
    ).await
    .expect("Error al inicializar el cliente JWKS para el servidor API");

    let jwt_auth_client_mutex = Arc::new(Mutex::new(jwt_auth_client));

    // 5. Crear el estado inicial de la aplicación Actix
    let initial_state = AppState {
        db_pool: Arc::new(db_pool),
        aplicativo_id: aplicativo_id,
        reqwest_client: reqwest_client.clone(),
        jwks_url: jwks_url.to_string(),
        jwt_auth_client: jwt_auth_client_mutex, 
    };

    // 6. Configuración de CORS
    let cors = Cors::default()
        .allow_any_origin()
        .allow_any_method()
        .allow_any_header()
        .max_age(3600); // 1 hora de caché

    // 7. Servidor HTTP
    HttpServer::new(move || {
        App::new()
            .wrap(cors.clone()) // Primera capa: maneja CORS
            .wrap(Logger::default()) // Segunda capa: registra todas las solicitudes
            // Esto asegura que cada thread reciba una copia de la referencia del estado
            .app_data(web::Data::new(initial_state.clone()))
            
            // Public endpoints (no token needed)
            .service(
                web::scope("/api/public")
                    .configure(license_route::license_config) // license_route::get_license_status
                    .configure(auth_route::auth_config_public) // auth_route::login_user_handler
                    
                    // 🚨 CRÍTICO: Añadir la ruta para manejar los tokens/códigos externos
                    .route("/auth/process-auth", web::post().to(auth_route::process_auth_handler))
            )

            // Separate scope for protected endpoints
            .service(
                web::scope("/api/protected")
                    // Apply the custom authentication middleware first
                    .wrap(Authenticated)

                    .configure(user_route::user_config)
                    .configure(menu_route::menu_config)
            )
        
    })
    // 🚨 Actix web se enlaza al puerto 3000 para el desarrollo web.
    .bind(("127.0.0.1", 3000))? 
    .run()
    .await
}