// src/api/routes/auth.rs
use actix_web::{post, web, HttpResponse, Responder};
use jsonwebtoken::{encode, EncodingKey, Header};
use chrono::{Utc, Duration};
use shared_lib::state::AppState;
use shared_lib::models::{LoginResponse};
use shared_lib::models::LoginData;
use shared_lib::user_logic;
use shared_lib::middleware::auth_claims::Claims;

// no usa decorador (post login) pero lo pone abajo en main
// aqui llega solo con App Web
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
            // Login exitoso.
            // La lógica para `usuario_conectado` no es necesaria aquí.
            // El frontend gestiona el estado con el token.
            
            // 1. Obtiene los permisos del usuario (esto puede ser una función).
            let permissions = vec![
                "inicio".to_string(), // <-- Permiso para ver el menú principal
                "administracion".to_string(), 
                "vistas".to_string(), 
                "ayuda".to_string(), 
                
                // ... Agrega los demás permisos del usuario
            ];

            // 2. Crea la carga útil (claims) del JWT.
            let claims = Claims {
                sub: user.usuario.clone(),
                permissions: permissions.clone(),
                exp: (Utc::now() + Duration::hours(24)).timestamp() as u64,
            };
            
            // 3. Codifica el token con la clave secreta.
            let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
            let token = match encode(&Header::default(), &claims, &EncodingKey::from_secret(jwt_secret.as_bytes())) {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("Error al crear el token: {}", e);
                    return HttpResponse::InternalServerError().body("Failed to create token");
                }
            };

            // 4. Devuelve la respuesta completa con token, usuario y permisos.
            HttpResponse::Ok().json(LoginResponse {
                token,
                user,
                permissions,
            })
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

// Función de configuración para Actix-Web
pub fn auth_config_pub(cfg: &mut web::ServiceConfig) {
    cfg.service(login_user_handler);
}