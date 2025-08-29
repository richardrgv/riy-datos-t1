// src/api/routes/menu_route.rs

use actix_web::{get, web, HttpResponse, Responder, Error};
use shared_lib::state::AppState;
use shared_lib::menu_logic;
use shared_lib::app_errors::{ApiError, AppErrorCode};

#[get("/menus")]
pub async fn get_all_menus_handler(
    state: web::Data<AppState>,
) -> Result<impl Responder, Error> {
    let sql_collate = &state.sql_collate_clause;
    match menu_logic::get_all_menus_logic(&state.db_pool, sql_collate).await {
        Ok(menus) => {
            Ok(HttpResponse::Ok().json(menus))
        }
        Err(e) => {
            let error_response = ApiError {
                code: AppErrorCode::DatabaseError, // Asegúrate de que tu `ApiError` maneje esto.
                message: format!("Error al obtener los menús: {}", e),
            };
            Ok(HttpResponse::InternalServerError().json(error_response))
        }
    }
}

// Función de configuración para Actix-Web
pub fn menu_config(cfg: &mut web::ServiceConfig) {
    cfg.service(get_all_menus_handler);
}