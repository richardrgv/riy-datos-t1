// src/api/main.rs
use actix_cors::Cors;
use actix_web::{
    web, App, HttpServer,
    middleware::Logger};
use shared_lib::{db, state::AppState, middleware::auth_middleware::Authenticated};
use dotenv::dotenv;
// Importa los módulos de rutas
mod routes;
use routes::{auth_route, license_route, user_route, menu_route};
use tokio::sync::Mutex;
use std::sync::Arc;


#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    
    // ... existing variable loading ...
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

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
    let palabra_clave1 = std::env::var("PALABRA_CLAVE_1").expect("PALABRA_CLAVE_1 must be set");
    println!("Backend web: Palabra clave 1 obtenida.");
    let palabra_clave2 = std::env::var("PALABRA_CLAVE_2").expect("PALABRA_CLAVE_2 must be set");
    println!("Backend web: Palabra clave 2 obtenida.");

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
        palabra_clave1,
        palabra_clave2,
        db_connection_url: db_url.to_string(),
        aplicativo_id: Arc::new(Mutex::new(app_id_value)),
        sql_collate_clause,
        aplicativo: app_code,
        auth_method,
        usuario_conectado: Mutex::new(None).into(), // Initialize with None, as no user is logged in yet
        jwt_secret, // Add this line
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
            .wrap(cors) // Primera capa: maneja CORS
            .wrap(Logger::default()) // Segunda capa: registra todas las solicitudes
            // Esto asegura que cada thread reciba una copia de la referencia
            .app_data(web::Data::new(initial_state.clone()))
            // Public endpoints (no token needed)
            .service(
                web::scope("/api/public")
                    .configure(license_route::license_config_pub)
                    .configure(auth_route::auth_config_pub)
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
    .bind(("127.0.0.1", 3000))?
    .run()
    .await
}

/* 2025-08-21
versión original sin /routes
        App::new()
            .wrap(cors) // Primera capa: maneja CORS
            .wrap(Logger::default()) // Segunda capa: registra todas las solicitudes
            // Esto asegura que cada thread reciba una copia de la referencia
            .app_data(web::Data::new(initial_state.clone()))
            // Public endpoints (no token needed)
            .service(
                web::scope("/api/public")
                    .service(license::get_license_status)
                    .service(auth::login_user_handler)
            )
            // Separate scope for protected endpoints
            .service(
                web::scope("/api/protected")
                    // Apply the custom authentication middleware first
                    .wrap(Authenticated)

                    .service(user::get_all_users)
                    .service(user::search_erp_users)
                    .service(user::add_user_handler)
                    .service(user::update_user)
            )
*/
