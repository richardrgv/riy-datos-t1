// src/api/routes/license.rs
use actix_web::{
    get, 
    post, 
    HttpResponse, 
    Responder, 
    web};
use shared_lib::state::AppState;
use shared_lib::license_logic::LicenseCheckResult;

// ⭐ Agregamos la ruta para obtener info de la DB ⭐
use serde::{Deserialize};
#[derive(Deserialize)]
struct SaveCredentialsPayload {
    credentials: String,
}


#[get("/license/status")]
pub async fn get_license_status(
    state: web::Data<AppState>
) -> impl Responder {
    println!("get_license_status: Handler llamado.");

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





#[get("/license/db-info")]
pub async fn get_db_connection_info_route(
    state: web::Data<AppState>
) -> impl Responder {
    println!("get_db_connection_info_route: Handler llamado.");
    let db_connection_url = 
        &state.db_connection_url;
    match shared_lib::db::parse_mssql_connection_url(
        db_connection_url) {
        Ok((server_name, db_name)) => {
            HttpResponse::Ok().json((server_name, db_name))
        },
        Err(e) => {
            eprintln!("get_db_connection_info_route: Error al parsear URL: {}", e);
            HttpResponse::InternalServerError().body(e)
        }
    }
}



// ⭐ Nuevo endpoint para guardar credenciales desde la web ⭐
#[post("/license/save-credentials")]

pub async fn save_license_credentials_route(
    state: web::Data<AppState>,
    body: web::Json<SaveCredentialsPayload> // Recibe el JSON del frontend
) -> impl Responder {
    println!("save_license_credentials_route: Handler llamado.");

    let app_id_guard = state.aplicativo_id.lock().await;
    println!("save_license_credentials_route: app_id guard obtenido.");
    
    let app_id = *app_id_guard;
    println!("save_license_credentials_route: app_id obtenido: {}", app_id);

    // Llama a la función principal
     match shared_lib::license_logic::save_license_credentials(
        &state.db_pool, // <--- Accede al pool directamente
        &state.sql_collate_clause,
        app_id,
        &state.palabra_clave1,
        &state.palabra_clave2,
        &state.db_connection_url,
        &state.aplicativo,
        // ⭐⭐ CAMBIO CLAVE: Usamos 'body.credentials' para acceder al valor ⭐⭐
        &body.credentials, 
    ).await {
        Ok(license_valid) => {
            println!("save_license_credentials_route: La lógica de guardado fue exitosa. Validez: {}", license_valid);
            HttpResponse::Ok().json(license_valid)
        },
        Err(e) => {
            eprintln!("save_license_credentials_route: Error en la lógica de guardado de credenciales: {}", e);
            HttpResponse::InternalServerError().body(format!("Error: {}", e))
        },
    }
}


// Función de configuración para Actix-Web
pub fn license_config_pub(cfg: &mut web::ServiceConfig) {
    cfg.service(get_license_status)
       .service(get_db_connection_info_route)
       .service(save_license_credentials_route);
}
