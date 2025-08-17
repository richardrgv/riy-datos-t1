use actix_web::{get, post, put, App, HttpResponse, HttpServer, Responder, web};
use actix_cors::Cors; // <-- Importar Cors
//use serde::{Deserialize, Serialize};
use sqlx::{Pool, Mssql};
use std::sync::Arc;
use tokio::sync::Mutex;
use dotenv::dotenv;

// Usa el crate actual para encontrar la librería compartida
use shared_lib::{db, models, user_logic, app_errors};
//use shared_lib::models::LoggedInUser;

// Agrega estas líneas al inicio de tu archivo para importar los nuevos tipos
use crate::user_logic::UserError;
use crate::app_errors::{ApiError, AppErrorCode};

/*token
use jsonwebtoken::{encode, Header, EncodingKey};
use chrono::{Utc, Duration};
const JWT_SECRET: &str = "YOUR_SUPER_SECRET_KEY"; // Make this a secure, env-variable
*/
use crate::middleware::auth_middleware::Authenticated;

// Si no tienes un archivo de modelos para la API, puedes definirlo aquí
#[derive(serde::Deserialize)]
pub struct LoginData {
    pub username: String,
    pub password: String,
}

// The JWT payload (claims) structure
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String, // Subject (user's ID or username)
    permissions: Vec<String>,
    exp: u64, // Expiration timestamp
}
// The new response structure that includes the token, user, and permissions
#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: User, // Replace 'User' with your actual user struct
    pub permissions: Vec<String>,
}


// Definimos la misma estructura de estado que en el proyecto de Tauri
// CAMBIO CLAVE: Usa #[derive(Clone)] para implementar el trait Clone
#[derive(Clone)]
pub struct AppState {
    // CAMBIO CLAVE: Envuelve Mutex en Arc para que pueda ser clonado
    //pub db_pool: Arc<Mutex<Option<Pool<Mssql>>>>,
    pub db_pool: Pool<Mssql>,
    //pub palabra_clave1: String,
    pub palabra_clave2: String,
    pub db_connection_url: String,
    // CAMBIO CLAVE: Envuelve Mutex en Arc para que pueda ser clonado
    pub aplicativo_id: Arc<Mutex<i32>>,
    pub sql_collate_clause: String,
    pub aplicativo: String,
    pub auth_method: String,
    pub usuario_conectado: Arc<Mutex<Option<String>>>,
}


// ... (Aquí van los handlers para los endpoints) ...

// ... (código anterior) ...

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


// no usa decorador (post login) pero lo pone abajo en main
// aqui llega solo con App Web
pub async fn login_user_handler(
    state: web::Data<AppState>,
    logindata: web::Json<LoginData>,
) -> impl Responder {
    // Llama a la lógica de autenticación central
    let auth_result = user_logic::authenticate_user_logic(
        //&state.db_pool.lock().await.as_ref().unwrap(),
        &state.db_pool, // <--- Accede al pool directamente
        &logindata.username,
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
                "administrar_usuarios".to_string(), // <-- Permiso para ver el menú principal
                "lista_usuarios".to_string(),
                "agregar_usuario".to_string(),
                "editar_usuario".to_string(),
                "ver_usuario".to_string(),
                "roles_usuario".to_string(),
		        "mis_consultas".to_string(),
                "todas_las_consultas".to_string(),
                // ... Agrega los demás permisos del usuario
            ];

            // 2. Crea la carga útil (claims) del JWT.
            let claims = Claims {
                sub: user.usuario.clone(),
                permissions: permissions.clone(),
                exp: (Utc::now() + Duration::hours(24)).timestamp() as u64,
            };
            
            // 3. Codifica el token con la clave secreta.
            let token = match encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET.as_bytes())) {
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
) -> impl Responder {
    // Obtiene el código de usuario del AppState
    let user_state = state.usuario_conectado.lock().await;
    // Obtiene el usuario del token (del middleware)
    let autor = req.extensions()
                   .get::<Claims>()
                   .map(|c| c.sub.clone())
                   .ok_or_else(|| "Unauthorized")?; 
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
                HttpResponse::Ok().json(serde_json::json!({"message": "Usuario agregado exitosamente"}))
            }
            Err(e) => {
                // Caso de error: Ahora hacemos 'match' sobre el 'enum'
                match e {
                    UserError::AlreadyExists => {
                        let error_response = ApiError {
                            code: AppErrorCode::UserAlreadyExists,
                            message: "El usuario ya existe en el sistema.".to_string(),
                        };
                        HttpResponse::Conflict().json(error_response) // Status 409
                    },
                    UserError::DatabaseError(_) => {
                        let error_response = ApiError {
                            code: AppErrorCode::DatabaseError, // Asegúrate de agregar este al enum
                            message: "Ocurrió un error en la base de datos.".to_string(),
                        };
                        HttpResponse::InternalServerError().json(error_response) // Status 500
                    },
                     // --- AÑADE ESTO ---a pesar que aui no se necesita, RUST lo pide
                    UserError::NotFound => {
                        let error_response = ApiError {
                            code: AppErrorCode::InternalError, // Podrías tener un InternalError genérico
                            message: "Ocurrió un error inesperado.".to_string(),
                        };
                        HttpResponse::InternalServerError().json(error_response)
                    }
                    // --- FIN DEL AÑADIDO ---
                }
            }
        }
}



// Endpoint para actualizar un usuario
#[put("/users/{id}")]
async fn update_user(
    req: HttpRequest, // <-- Necesitas la solicitud para obtener los claims
    state: web::Data<AppState>,
    path: web::Path<i32>,
    user_data: web::Json<models::UsuarioActualizable>, // Actix-web ya deserializó esto
) -> impl Responder {
      

    // LOCK THE POOL
    //let pool_guard = state.db_pool.lock().await;
    //let pool_ref = pool_guard.as_ref().expect("Pool de DB no disponible");
    let user_id = path.into_inner();

    // Print the received data
    println!("Received PUT request for user ID: {}", user_id);
    println!("Received user data: {:?}", user_data);

    // Obtiene el código de usuario del AppState
    let user_state = state.usuario_conectado.lock().await;

    // Obtiene el usuario del token (del middleware)
    let autor = req.extensions()
                   .get::<Claims>()
                   .map(|c| c.sub.clone())
                   .ok_or_else(|| "Unauthorized")?; 
    

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
            HttpResponse::Ok().json(serde_json::json!({"message": "Usuario actualizado exitosamente"}))
        }
        Err(e) => {
            match e {
                UserError::NotFound => {
                    let error_response = ApiError {
                        // El código de error 404
                        code: AppErrorCode::UserNotFound, 
                        message: "No se encontró el usuario para actualizar.".to_string(),
                    };
                    HttpResponse::NotFound().json(error_response) // Status 404
                },
                UserError::DatabaseError(_) => {
                    let error_response = ApiError {
                        code: AppErrorCode::DatabaseError,
                        message: "Ocurrió un error en la base de datos.".to_string(),
                    };
                    HttpResponse::InternalServerError().json(error_response) // Status 500
                },
                // En update_user, 'AlreadyExists' no es un error lógico,
                // pero debes manejarlo para satisfacer al compilador.
                // Puedes tratarlo como un error de solicitud incorrecta (BadRequest).
                UserError::AlreadyExists => {
                    let error_response = ApiError {
                        code: AppErrorCode::BadRequest,
                        message: "Solicitud de actualización de usuario inválida.".to_string(),
                    };
                    HttpResponse::BadRequest().json(error_response) // Status 400
                }
            }
        }
    }
}

/*
UserError::NotFound => {
                        let error_response = ApiError {
                            code: AppErrorCode::UserNotFound, // <- This is the correct type
                            message: "No se encontró el usuario.".to_string(),
                        };
                        HttpResponse::Conflict().json(error_response) // Status 409
                    }
*/


#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    
    // Añade esta línea para depurar
    println!("Backend web: Variables de entorno cargadas. Verificando valores...");

    // Conexión a la base de datos
    let db_type = std::env::var("DB_TYPE").unwrap_or_else(|_| "UNKNOWN".to_string());
    let db_url_key = match db_type.as_str() {
        "SQLSERVER" => "DATABASE_URL_SQLSERVER",
        _ => panic!("DB_TYPE no configurado o no soportado."),
    };
    let db_url = std::env::var(db_url_key).expect(&format!("{} debe estar configurado.", db_url_key));
    println!("Backend web: URL de DB obtenida.");

    let sql_collate_clause = std::env::var("SQL_COLLATE_CLAUSE").expect("SQL_COLLATE_CLAUSE must be set");
    println!("Backend web: Clausula SQL obtenida.");

    // AÑADE ESTOS:
    let palabra_clave2 = std::env::var("PALABRA_CLAVE_2").expect("PALABRA_CLAVE_2 must be set");
    println!("Backend web: Palabra clave obtenida.");

    let aplicativo = std::env::var("APLICATIVO").expect("APLICATIVO must be set");
    println!("Backend web: Nombre del aplicativo obtenido.");

    let auth_method = std::env::var("AUTH_METHOD").expect("AUTH_METHOD must be set");
    println!("Backend web: Método de autenticación obtenido.");

    let pool = db::connect_db(&db_url).await
        .expect("Fallo al conectar a la base de datos en el servidor web.");
    println!("Backend web: Pool obtenido.");

    // Obtener el ID de la aplicación
    let app_code = aplicativo.clone();
    let app_id_value = db::get_aplicativo_id(&pool, &app_code).await
        .expect("Fallo al obtener aplicativoID en el servidor web.");
    println!("Backend web: aplicativo ID obtenido.");
    

    // Initialize ALL fields of AppState
    //let initial_state = Arc::new(AppState {
    // CAMBIO CLAVE: Elimina el Arc<...> de aquí
    // CAMBIO CLAVE: Ahora envuelve tus Mutex en Arc
    //db_pool: Arc::new(Mutex::new(Some(pool))),
    let initial_state = AppState { 
        db_pool: pool, // Esto es correcto
        //palabra_clave1,
        palabra_clave2,
        db_connection_url: db_url.to_string(),
        aplicativo_id: Arc::new(Mutex::new(app_id_value)),
        sql_collate_clause,
        aplicativo: app_code,
        auth_method,
        usuario_conectado: Mutex::new(None).into(), // Initialize with None, as no user is logged in yet
    };

   
    eprintln!("API web: Servidor Actix listo para ejecutar.");
    HttpServer::new(move || {
        // AÑADE ESTE PRINT PARA VER SI LLEGA A CONFIGURAR LA APP
        println!("API web: Configurando una nueva instancia de App.");

        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            // Esto asegura que cada thread reciba una copia de la referencia
            .app_data(web::Data::new(initial_state.clone()))
            .service(
                web::scope("/api")
                    // El login no usa el middleware de autenticación
                    .service(web::resource("/login").route(web::post().to(login_user_handler)))
                    // Un segundo scope para las rutas protegidas
                    .service(
                        web::scope("/")
                            .wrap(Authenticated) // <-- ¡Aquí se aplica el middleware para TODOS!
                            .service(get_all_users)
                            .service(get_license_status)
                            .service(search_erp_users)
                            .service(add_user_handler)
                            .service(update_user)
                            // ... (Otros servicios de la API protegidos) ...
                    )
            )
    })
    .bind(("127.0.0.1", 3000))?
    .run()
    .await
}

