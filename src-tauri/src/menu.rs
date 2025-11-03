// src-tauri/src/menu.rs
use tauri::State;
use shared_lib::{menu_logic, app_errors};
use shared_lib::state::AppState;
use shared_lib::menu_models::MenuItem;

// #[tauri::command] es la macro que lo convierte en un comando RPC
#[tauri::command]
pub async fn get_all_menus_command(state: State<'_, AppState>) -> Result<Vec<MenuItem>, String> {
    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().expect("DB Pool no disponible");

    // Aquí se invoca la misma lógica de negocio
    match menu_logic::get_all_menus_logic(pool_ref).await {
        Ok(menus) => Ok(menus),
        Err(e) => {
            // Convierte el error a String para enviarlo al frontend
            eprintln!("Error al obtener menús: {}", e);
            Err("Error interno al obtener los menús".to_string())
        }
    }
}