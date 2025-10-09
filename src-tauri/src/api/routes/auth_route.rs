// src/api/routes/auth_routes.rs
use actix_web::{post, web, HttpResponse, Responder};
use actix_web::HttpRequest;
use actix_web::error::ErrorUnauthorized; 
use jsonwebtoken::{encode, EncodingKey, Header};
use chrono::{Utc, Duration};
use shared_lib::state::AppState;
use shared_lib::models::{LoginResponse};
use shared_lib::models::LoginData;
use shared_lib::user_logic;
use shared_lib::middleware::auth_claims::Claims;


use crate::msal_security_logic; 
use crate::utils::{self, create_session_response}; // <-- NUEVO IMPORT de utilidades
use crate::errors::CustomError; // Asegúrate de tener tu tipo de error




// --- 1. HANDLER DE LOGIN TRADICIONAL (Refactorizado) ---
// (Usa create_session_response y obtiene permisos de utils)
#[post("/login")]
pub async fn login_user_handler(
    state: web::Data<AppState>,
    logindata: web::Json<LoginData>,
) -> impl Responder {
     // Print the entire JSON payload to the console
    println!("Received login data: {:#?}", logindata);
    // Llama a la lógica de autenticación central
    let auth_result = user_logic::authenticate_user_logic(
        //&state.db_pool.lock().await.as_ref().unwrap(),
        &state.db_pool, // <--- Accede al pool directamente
        &logindata.usuario,
        &logindata.password,
        &state.auth_method,
        &state.sql_collate_clause,
    ).await;

    match auth_result {
        Ok(Some(user)) => {
            
            // 1. Obtiene los permisos del usuario (ESTO DEVUELVE UN RESULT)
            let permissions_result = utils::get_user_permissions(&state.db_pool, &user.usuario).await;

            // ⚠️ AHORA MANEJAMOS EL RESULT DEL PERMISO
            let permissions = match permissions_result {
                Ok(p) => p, // Si es Ok, extraemos el vector de permisos (p)
                Err(e) => {
                    // Si falla al obtener permisos, devolvemos un Error 500
                    eprintln!("Error al obtener permisos: {}", e);
                    return HttpResponse::InternalServerError().body(e.to_string());
                }
            };

            // 2. CREAR RESPUESTA UNIFICADA (Ahora 'permissions' es Vec<String>)
            match create_session_response(user, permissions, &state.jwt_secret) { // 👈 FIX APLICADO
                Ok(response) => HttpResponse::Ok().json(response),
                Err(e) => {
                    eprintln!("Error en creación de token de sesión: {}", e);
                    HttpResponse::InternalServerError().body("Fallo al crear el token de sesión.")
                }
            }
        },

        Ok(None) => {
            // Login fallido.
            HttpResponse::Unauthorized().body("Usuario o contraseña incorrectos")
        },
        Err(e) => {
            // Error interno.
            eprintln!("Error en el login: {}", e);
            HttpResponse::InternalServerError().body(e.to_string())
        }
    }
}

// --- 2. HANDLER DE LOGIN CON MICROSOFT MSAL (NUEVO) ---

// JWEEKS CLIENT
pub async fn msal_login_handler(
    state: web::Data<AppState>,
    req: HttpRequest,
) -> Result<HttpResponse, actix_web::Error> {

    eprintln!("Paso por msal_login_handler");

    // ✅ AHORA: Accedemos al nuevo cliente HTTP
    let http_client = state.http_client.as_ref(); // Variable 'http_client' definida
    
    // 1. Obtener el token del encabezado Authorization
    let auth_header = req.headers().get("Authorization")
        .ok_or_else(|| CustomError::new(401, "Se requiere el encabezado Authorization"))?;

    // 2. Convertir HeaderValue a &str y remover el prefijo "Bearer "
    let token_str = auth_header.to_str()
        .map_err(|_| CustomError::new(401, "El encabezado Authorization contiene caracteres no válidos"))?
        .strip_prefix("Bearer ")
        .ok_or_else(|| CustomError::new(401, "Formato de token no válido, se esperaba 'Bearer '"))?; 
        
    // Ahora, 'token_str' es de tipo &str.

    // 3. Llamar a la función con el &str correcto
    let user_data = msal_security_logic::validate_and_get_user(
        token_str, // &str
        state.get_ref(), // &AppState
        http_client  // ⭐️ CAMBIO CRÍTICO: Usar 'http_client' ⭐️
    ).await;

    // ...
  
    // ... (Manejo de errores y respuesta HTTP) ...
    let user = user_data.map_err(|e| {
        eprintln!("Error de validación MSAL/DB: {}", e);
        ErrorUnauthorized(format!("Acceso denegado: {}", e))
    })?;
    
    Ok(HttpResponse::Ok().json(user))
}




// --- 3. FUNCIÓN DE CONFIGURACIÓN ---

pub fn auth_config_pub(cfg: &mut web::ServiceConfig) {
    cfg
        .service(login_user_handler)
        // ⭐️ AÑADIR NUEVA RUTA MSAL ⭐️
        .route("/auth/msal-login", web::post().to(msal_login_handler)); 
}


