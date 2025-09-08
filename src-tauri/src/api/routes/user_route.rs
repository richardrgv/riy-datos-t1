// src/api/routes/user.rs
use actix_web::{get, post, put, HttpResponse, HttpRequest,
    Responder, web, HttpMessage, Error};

use shared_lib::state::AppState;
use shared_lib::{models, user_logic};
use shared_lib::app_errors::ApiError;
use shared_lib::middleware::auth_claims::Claims;

 use shared_lib::user_logic::UserError;
 use shared_lib::app_errors::AppErrorCode;
 


// Endpoint para obtener todos los usuarios
#[get("/users")]
async fn get_all_users(
    state: web::Data<AppState>
) -> impl Responder {
    //let pool_guard = state.db_pool.lock().await;
    //let pool_ref = pool_guard.as_ref().expect("Pool de DB no disponible");
    let sql_collate = &state.sql_collate_clause;

    // Llamamos a la lógica centralizada
    match user_logic::get_all_users_logic(
        &state.db_pool, // <--- Accede al pool directamente 
        sql_collate).await {
        Ok(users) => HttpResponse::Ok().json(users),
        Err(e) => HttpResponse::InternalServerError().body(e),
    }
}


// Struct para el `query parameter`
#[derive(serde::Deserialize)]
pub struct SearchQuery {
    #[serde(rename = "searchTerm")]
    pub search_term: Option<String>,
}

// El handler recibe el `query parameter` `search_term`
#[get("/erp-users")]
async fn search_erp_users(
    state: web::Data<AppState>,
    query: web::Query<SearchQuery>, // Usamos un struct para el query
) -> impl Responder {
    // Si no se provee un término de búsqueda, no se ejecuta la lógica
    let search_term = query.search_term.as_deref().unwrap_or("");
    let sql_collate = &state.sql_collate_clause;

    match user_logic::search_erp_users_logic(
        &state.db_pool,
        search_term,
        sql_collate,
    ).await {
        Ok(users) => HttpResponse::Ok().json(users),
        Err(e) => {
            eprintln!("Error al buscar usuarios del ERP: {}", e);
            HttpResponse::InternalServerError().body(e)
        },
    }
}

// Asumiendo que tu modelo para el nuevo usuario tiene una estructura similar
#[derive(serde::Deserialize)]
pub struct NewUserRequest {
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
    // Otros campos necesarios para la creación del usuario
}

#[post("/users")] // <-- El endpoint es POST /api/users
async fn add_user_handler(
    req: HttpRequest, // <-- Necesitas la solicitud para obtener los claims
    state: web::Data<AppState>,
    new_user_data: web::Json<NewUserRequest>,
) -> Result<impl Responder, Error> { // Change the return type here
    // Obtiene el código de usuario del AppState
    let user_state = state.usuario_conectado.lock().await;
    // Obtiene el usuario del token (del middleware)
    let autor = req.extensions()
                   .get::<Claims>()
                   .map(|c| c.sub.clone())
                   .ok_or_else(|| actix_web::error::ErrorUnauthorized("Unauthorized"))?;
    let sql_collate = &state.sql_collate_clause;

    match user_logic::add_user_logic(
        &state.db_pool, 
        &new_user_data.usuario, 
        &new_user_data.nombre,
        &new_user_data.correo,
        &autor,
        sql_collate,
        ).await {
            Ok(_) => {
                // Caso de éxito: El usuario se agregó correctamente
                Ok(HttpResponse::Ok().json(serde_json::json!({"message": "Usuario agregado exitosamente"})))
            }
            Err(e) => {
                // Caso de error: Ahora hacemos 'match' sobre el 'enum'
                match e {
                    UserError::AlreadyExists => {
                        let error_response = ApiError {
                            code: AppErrorCode::UserAlreadyExists,
                            message: "El usuario ya existe en el sistema.".to_string(),
                        };
                        Ok(HttpResponse::Conflict().json(error_response)) // Status 409
                    },
                    UserError::DatabaseError(_) => {
                        let error_response = ApiError {
                            code: AppErrorCode::DatabaseError, // Asegúrate de agregar este al enum
                            message: "Ocurrió un error en la base de datos.".to_string(),
                        };
                        Ok(HttpResponse::InternalServerError().json(error_response)) // Status 500
                    },
                     // --- AÑADE ESTO ---a pesar que aui no se necesita, RUST lo pide
                    UserError::NotFound => {
                        let error_response = ApiError {
                            code: AppErrorCode::InternalError, // Podrías tener un InternalError genérico
                            message: "Ocurrió un error inesperado.".to_string(),
                        };
                        Ok(HttpResponse::InternalServerError().json(error_response))
                    }
                    // --- FIN DEL AÑADIDO ---
                }
            }
        }
}



// Endpoint para actualizar un usuario
#[put("/users/{id}")]
async fn update_user(
    autor_claims: Claims, // <--- Change this to the new extractor
    state: web::Data<AppState>,
    path: web::Path<i32>,
    user_data: web::Json<models::UsuarioActualizable>, // Actix-web ya deserializó esto
) -> Result<impl Responder, Error> { // Change the return type here

    // LOCK THE POOL
    //let pool_guard = state.db_pool.lock().await;
    //let pool_ref = pool_guard.as_ref().expect("Pool de DB no disponible");
    let user_id = path.into_inner();

    println!("Received PUT request for user ID: {}", user_id);

    // Obtiene el código de usuario del AppState
    let user_state = state.usuario_conectado.lock().await;
    println!("Received PUT request for user state: ");

    // Obtiene el usuario del token (del middleware)
    // No need for the req.extensions() call
    let autor = autor_claims.sub.clone(); 
    
    // Print the received data
    println!("Received user data: ");

    //match user_logic::update_user_logic(
       // pool_ref, 
     // IMPORTANT: Access the pool directly without a lock, as sqlx handles thread-safety.
    // Assuming AppState has a field like 'db_pool: sqlx::Pool<...>'
    match user_logic::update_user_logic(
        //pool_ref, // <--- Pass the unlocked pool reference here
        &state.db_pool, // <--- Accede al pool directamente
        user_id, 
        &user_data.correo, // <-- Usa los campos del objeto directamente
        &user_data.estado, // <-- Usa los campos del objeto directamente
        &autor).await {
        Ok(_) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({"message": "Usuario actualizado exitosamente"})))
        }
        Err(e) => {
            match e {
                UserError::NotFound => {
                    let error_response = ApiError {
                        // El código de error 404
                        code: AppErrorCode::UserNotFound, 
                        message: "No se encontró el usuario para actualizar.".to_string(),
                    };
                    Ok(HttpResponse::NotFound().json(error_response)) // Status 404
                },
                UserError::DatabaseError(_) => {
                    let error_response = ApiError {
                        code: AppErrorCode::DatabaseError,
                        message: "Ocurrió un error en la base de datos.".to_string(),
                    };
                    Ok(HttpResponse::InternalServerError().json(error_response)) // Status 500
                },
                // En update_user, 'AlreadyExists' no es un error lógico,
                // pero debes manejarlo para satisfacer al compilador.
                // Puedes tratarlo como un error de solicitud incorrecta (BadRequest).
                UserError::AlreadyExists => {
                    let error_response = ApiError {
                        code: AppErrorCode::BadRequest,
                        message: "Solicitud de actualización de usuario inválida.".to_string(),
                    };
                    Ok(HttpResponse::BadRequest().json(error_response)) // Status 400
                }
            }
        }
    }
}



// Función de configuración para Actix-Web
// In src/api/routes/user.rs

pub fn user_config(cfg: &mut web::ServiceConfig) {
    cfg.service(get_all_users)
       .service(search_erp_users)
       .service(add_user_handler)
       .service(update_user);
}
