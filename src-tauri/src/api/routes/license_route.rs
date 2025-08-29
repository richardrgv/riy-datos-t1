// src/api/routes/license.rs
use actix_web::{get, HttpResponse, 
    Responder, web};
    // Import AppState from the shared_lib crate
use shared_lib::state::AppState;
/* 
use actix_cors::Cors; // <-- Importar Cors
use serde::{Deserialize, Serialize};
//use sqlx::{Pool, Mssql};
use std::sync::Arc;
use tokio::sync::Mutex;
use dotenv::dotenv;

// Usa el crate actual para encontrar la librería compartida
use shared_lib::{db, models, user_logic, app_errors, middleware};
*/

//use shared_lib::models::LoggedInUser;

// Agrega estas líneas al inicio de tu archivo para importar los nuevos tipos
/*use shared_lib::models::{LoginData};
use shared_lib::user_logic::UserError;
use shared_lib::app_errors::{ApiError, AppErrorCode};

use actix_web::{middleware::Logger};
use crate::middleware::auth_middleware::Authenticated;

use crate::models::{LoginResponse}; //, Claims}; // , User
use chrono::Utc;
use chrono::Duration;
use jsonwebtoken::{encode, EncodingKey, Header}; // DecodingKey, Validation}; // <-- Add Header here
use actix_web::HttpRequest; */
// Import the Service trait
//use actix_web::dev::Service; 

//use actix_web::middleware::Logger;
//use futures::future::FutureExt;







#[get("/license/status")]
pub async fn get_license_status(
    state: web::Data<AppState>
) -> impl Responder {
    println!("get_license_status: Handler llamado.");

    //let pool_guard = state.db_pool.lock().await;
    //println!("get_license_status: Pool guard obtenido.");
    
    //let pool_ref = pool_guard.as_ref().expect("DB pool not available");
    //println!("get_license_status: Pool de DB obtenido.");
    
    let app_id_guard = state.aplicativo_id.lock().await;
    println!("get_license_status: app_id guard obtenido.");
    
    let app_id = *app_id_guard;
    println!("get_license_status: app_id obtenido: {}", app_id);

    // Llama a la función principal
    match shared_lib::license_logic::check_license_status(
        //pool_ref,
        &state.db_pool, // <--- Accede al pool directamente
        &state.sql_collate_clause,
        app_id,
        &state.palabra_clave2,
        &state.db_connection_url,
        &state.aplicativo,
    ).await {
        Ok(result) => {
            println!("get_license_status: Éxito. Estado de licencia: {:?}", result.status);
            // El backend devuelve JSON, como el frontend espera.
            HttpResponse::Ok().json(result)
        },
        Err(e) => {
            eprintln!("get_license_status: Error al verificar la licencia: {}", e);
            HttpResponse::InternalServerError().body(e)
        },
    }
}

// Función de configuración para Actix-Web
pub fn license_config_pub(cfg: &mut web::ServiceConfig) {
    cfg.service(get_license_status);
}