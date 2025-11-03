// src/api/routes/auth_routes.rs
use actix_web::{post, web, HttpResponse}; //, Responder};
use actix_web::HttpRequest;
use actix_web::error::ErrorUnauthorized; 
// 🚨 CORRECCIÓN CLAVE: Importar el trait ResponseError
use actix_web::ResponseError;

//use jsonwebtoken::{encode, EncodingKey, Header};
//use chrono::{Utc, Duration};
use shared_lib::state::AppState;
//use shared_lib::models::{LoginResponse};
use shared_lib::models::LoginData;
//use shared_lib::models::LoggedInUser;
use shared_lib::user_logic;
//use shared_lib::middleware::auth_claims::Claims;
use shared_lib::{models::{AuthRequestPayload}, auth}; // AuthResponsePayload




// La única forma de resolverlo si lib.rs falla es con una ruta absoluta corregida:
use super::super::msal_security_logic;
//use crate::api::msal_security_logic; // 👈 Mantén esta y ejecuta 'cargo clean'


use shared_lib::utils; //::    tils::{self, create_session_response}; // <-- NUEVO IMPORT de utilidades
use super::super::errors::CustomError; // Asegúrate de tener tu tipo de error


//use sqlx::Pool;
//use sqlx::Mssql;

// 🚨 Importar el controlador de lógica de negocio (asumiendo que está en shared/auth.rs)
//use shared_lib::auth; // as auth_service; 

// 🚨 Importar el Repositorio de Usuarios (para el Pool)
//use shared_lib::user_repository::DbPool; 

// 🚨 Importar modelos y manejo de errores
//use crate::api::errors::AppError; // Asumiendo que tienes un módulo de errores

//use tokio::sync::Mutex;
//use std::sync::Arc;

// ----------------------------------------------------------------------
// 1. ENDPOINT WEB: /api/auth/external
// ----------------------------------------------------------------------
// src/api/routes/auth_route.rs (Función external_auth_handler corregida)

pub async fn external_auth_handler(
    // El handler recibe el estado completo
    state: web::Data<AppState>, 
    payload: web::Json<AuthRequestPayload>,
) -> Result<HttpResponse, CustomError> { 
    
    // 🚨 PASO 1: Imprimir el payload recibido 🚨
    eprintln!("HANDLER: Payload recibido: {:?}", payload); // Usa 'eprintln' para ver en la consola
    
  
    let auth_response = auth::process_external_auth(
        // 🚨 CORRECCIÓN 1: Usar & para obtener la referencia al Pool
        &state.db_pool, 
        payload.into_inner(),
        // Desreferenciar el i32 que está dentro del Mutex
        *state.aplicativo_id.lock().await, 
        // 🚨 CORRECCIÓN 2: Usar & para obtener la referencia al Arc<Client>
        &state.http_client, 
        &state.whitelisted_domains,
        &state.msal_client_id,
        // 🚨 ARGUMENTO FALTANTE AÑADIDO: msal_audience_uri
        &state.msal_audience_uri,
        &state.msal_jwks_url,
        &state.google_client_id,
        &state.google_client_secret,
        // 🚨 ARGUMENTO NUEVO AÑADIDO: sql_collate 🚨
        &state.sql_collate_clause,
        &state.jwt_secret, 
    ).await.map_err(|e| {
        CustomError::AuthError(e.to_string()) 
    })?;
    
    Ok(HttpResponse::Ok().json(auth_response))
}


/* ----------------------------------------------------------------------
// 2. FUNCIÓN DE CONFIGURACIÓN DE RUTAS
// ----------------------------------------------------------------------
pub fn config_auth_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/auth/external")
            // 🚨 El frontend (api-client.ts) debe usar POST
            .route(web::post().to(external_auth_handler)) 
    );
}
*/

// --- 1. HANDLER DE LOGIN TRADICIONAL (Refactorizado) ---
// (Usa create_session_response y obtiene permisos de utils)
#[post("/login")]
pub async fn login_user_handler(
    state: web::Data<AppState>,
    logindata: web::Json<LoginData>,
) -> HttpResponse { // 👈 Change return type to concrete HttpResponse
//) -> impl Responder {
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
            
            let logged_in_user = shared_lib::models::LoggedInUser {
                usuario_id: 1, // por ahora user.usuario_id, // Asume que existe este campo
                // **IMPORTANTE:** Si tu LoggedInUser usa Option<String>, debes usar Some()
                usuario: Some(user.usuario), // o Some(user.usuario)
                nombre: Some(user.nombre),   // o Some(user.nombre)
                correo: Some(user.correo),   // o Some(user.correo)
                // Inicializa cualquier otro campo requerido por LoggedInUser (ej. None)
                // external_provider: None, 
                // external_id: None,
            };

            // 2. OBTENER PERMISOS (Define permissions_result y lo evalúa)
            // 🚨 ESTO FALTABA: Llamada a la función asíncrona get_permissions_by_app
            let permissions_result = utils::get_permissions_by_app(
                &state.db_pool,
                logged_in_user.usuario_id,
                *state.aplicativo_id.lock().await, // Desreferencia el i32
            ).await;

            // 3. MATCH PERMISSIONS_RESULT para obtener 'permissions' (Línea 145)
            let permissions = match permissions_result {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("Error de DB al obtener permisos: {}", e);
                    // Retorna un error y sale del handler
                    // Esto devuelve el tipo HttpResponse que el handler espera.
                    return CustomError::new(500, &format!("Error al obtener permisos: {}", e)).error_response();
                }
            };

            // 4. GENERACIÓN DEL JWT
            // 🚨 CORRECCIÓN: Llamar a generate_jwt una vez y hacer 'match' con su resultado (Result<String, anyhow::Error>)
            let token_session = match utils::generate_jwt(
                // 🚨 Llamada correcta a generate_jwt con los 3 argumentos (Función SÍNCRONA, sin .await)
                &logged_in_user, 
                permissions.clone(), 
                &state.jwt_secret
            ) {
                // Si es Ok, 't' es el String del JWT. Lo asignamos a token_session.
                Ok(t) => t, 

                // Si es Err, 'e' es el error. Manejamos el error y salimos del handler.
                Err(e) => {
                    eprintln!("Fallo al crear el token: {}", e);
                    // Devolver un error HTTP 500 usando CustomError (asumiendo que el handler devuelve Result<HttpResponse, CustomError>)
                    // 🚨 CORRECCIÓN CLAVE (Línea 162): Usar .error_response() para devolver HttpResponse
                    return CustomError::new(500, "Fallo al crear el token de sesión.").error_response();
                }
            };

            // 5. DEVOLVER RESPUESTA EXITOSA
            // 🚨 CORRECCIÓN CLAVE: Usar AuthResponsePayload (o AuthResponse)
            let response = shared_lib::models::AuthResponsePayload { 
            // O si es más corto, podría ser:
            // let response = shared_lib::models::AuthResponse { 
                user: logged_in_user,
                permissions: permissions,
                app_jwt: token_session,
            };

            // Retorno final de la rama Ok(Some(user))
            // 🚨 CORRECCIÓN FINAL (Línea 175): Eliminar 'Ok()'
            return HttpResponse::Ok().json(response)

        },
         
        Ok(None) => {
            // Login fallido.
            return HttpResponse::Unauthorized().body("Usuario o contraseña incorrectos")
        },
        Err(e) => {
            // Error interno.
            eprintln!("Error en el login: {}", e);
            return HttpResponse::InternalServerError().body(e.to_string())
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
/*
pub fn auth_config_pub(cfg: &mut web::ServiceConfig) {
    cfg
        .service(login_user_handler)
        // ⭐️ AÑADIR NUEVA RUTA MSAL ⭐️
        .route("/auth/msal-login", web::post().to(msal_login_handler)); 
}
*/
pub fn auth_config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        // 1. Ruta de login tradicional
        login_user_handler 
    )
    .service(
        // 🚨 CORRECCIÓN CLAVE 🚨
        // Cambiamos "/login/external" a "/auth/process-auth"
        web::scope("/auth") 
            .route("/process-auth", web::post().to(external_auth_handler)) // 👈 RUTA CORREGIDA
    );
}

// src/api/routes/auth_route.rs (Línea 48 y siguientes)



/*  🚨 CONFIGURACIÓN DE RUTAS 🚨
pub fn auth_config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        //web::resource("/login")
            // Asumo que tu login tradicional es un POST
            //.route(web::post().to(login_user_handler)), 
        login_user_handler
    )
    .service(
        web::resource("/login/external")
            // Nueva ruta para el login externo
            .route(web::post().to(external_auth_handler)), 
    );
}
*/

