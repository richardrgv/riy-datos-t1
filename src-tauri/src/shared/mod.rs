pub mod db;
pub mod models;
pub mod menu_models;
pub mod user_logic;
pub mod license_logic;
pub mod menu_logic;
pub mod auth;
pub mod app_errors;
pub mod middleware; // es una carpeta
pub mod state;
// El nuevo módulo de persistencia de datos
pub mod user_repository;
pub mod utils; // 👈 DECLARACIÓN NECESARIA
pub mod auth_providers; // es una carpeta
pub mod config; // Asegúrate de que esta línea esté presente
