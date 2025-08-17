// src-tauri/src/user.rs

use tauri::State;
use crate::models::{Usuario, UserSearchResult}; //, LoggedInUser};
use crate::{AppState, user_logic}; // <-- Agrega user_logic aquí

use shared_lib::user_logic::UserError;
use crate::models::LoggedInUser; // Asegúrate de tener este import
// login
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct LoginData {
    pub usuario: String,
    pub password: String,
}

// Asegúrate de que tu `TauriLoginResponse` tenga un campo de permisos
#[derive(serde::Serialize)]
pub struct TauriLoginResponse {
    pub user: LoggedInUser,
    pub permissions: Vec<String>,
}

// El comando Tauri que maneja el login
#[tauri::command]
pub async fn user_login(
    state: tauri::State<'_, AppState>,
    credentials: LoginData, // Asume que ya tienes este struct definido
) -> Result<TauriLoginResponse, String> {
    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().expect("DB Pool no disponible");
    // 1. Llama a la lógica de autenticación centralizada
    let auth_result = user_logic::authenticate_user_logic(
        pool_ref,
        &credentials.usuario,
        &credentials.password,
        &state.auth_method,
        &state.sql_collate_clause,
    ).await;

    match auth_result {
        Ok(Some(user)) => {
            // 2. Si el login es exitoso, obtén la referencia al estado y guarda el usuario
            let mut user_state_guard = state.usuario_conectado.lock().await;
            // Pasa el objeto `user` completo
            *user_state_guard = Some(user.clone());

            // 3. Obtén los permisos para la respuesta al frontend
            let permissions = user_logic::get_user_permissions_logic(
                pool_ref,
                &credentials.usuario,
            ).await.map_err(|e| e.to_string())?;

            // 4. Devuelve la respuesta completa al frontend de Tauri
            Ok(TauriLoginResponse { user, permissions })
        },
        Ok(None) => {
            // 5. Autenticación fallida
            Err("Usuario o contraseña incorrectos".to_string())
        },
        Err(e) => {
            // 6. Error interno del servidor
            eprintln!("Error en el login: {}", e);
            Err("Error interno del servidor".to_string())
        }
    }
}




#[tauri::command]
pub async fn get_users(state: State<'_, AppState>) -> Result<Vec<Usuario>, String> {
    // ...
    // 1. Confirma que el comando fue llamado
    println!("Backend: Llamada a get_users recibida.");

    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "Pool de DB no disponible".to_string())?;
    let sql_collate_clause_ref = &state.sql_collate_clause;
    
    // 2. Confirma que la base de datos está siendo consultada
    println!("Backend: Iniciando consulta a la base de datos.");

    user_logic::get_all_users_logic(
        pool_ref, 
        sql_collate_clause_ref
    ).await
}

// ... (El comando search_erp_users se mantiene igual) ...

#[tauri::command]
pub async fn search_erp_users(
    state: State<'_, AppState>,
    search_term: String,
) -> Result<Vec<UserSearchResult>, String> {
    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "Pool de DB no inicializado".to_string())?;
    let sql_collate_clause_ref = &state.sql_collate_clause;

    user_logic::search_erp_users_logic(
        pool_ref, 
        &search_term, // <-- CORRECCIÓN: Se presta la referencia con '&', 
        sql_collate_clause_ref
    ).await
}
    



#[tauri::command]
pub async fn add_user( //_from_erp(
    state: State<'_, AppState>,
    usuario: String, // El `usuario` del ERP seleccionado
    nombre: String,  // El `nombre` del ERP seleccionado
    correo: String,  // El correo ingresado por el usuario
) -> Result<String, String> {

    // Aquí puedes imprimir el valor de `usuario`
    //println!("El valor de 'usuario' recibido es: {}", usuario);

    let sql_collate_clause_ref = &state.sql_collate_clause;
    // LLAMADA ESCALABLE: Obtenemos el nombre del autor con la función auxiliar
    let autor = get_logged_in_username(&state).await?; // CORRECCIÓN AQUÍ
    

    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "Pool de DB no inicializado".to_string())?;
    
    // Llama a la lógica de negocio centralizada
    match user_logic::add_user_logic(
        pool_ref,
        &usuario,
        &nombre,
        &correo,
        &autor,
        sql_collate_clause_ref,
    ).await {
        Ok(_) => {
            // Caso de éxito, ahora devolvemos un String como se espera
            Ok("Usuario agregado exitosamente".to_string())
        },
        Err(e) => {
            // Caso de error, ahora hacemos 'match' sobre el 'enum'
            let error_message = match e {
                UserError::AlreadyExists => format!("El usuario '{}' ya existe en el sistema.", usuario),
                UserError::DatabaseError(db_err) => format!("Error en la base de datos: {}", db_err),
                _ => "Ocurrió un error inesperado.".to_string(),
            };
            Err(error_message)
        }
    }
}
    



#[tauri::command]
pub async fn update_user(
    state: tauri::State<'_, AppState>,
    usuario_id: i32, // usuario_id
    correo: String,
    estado: String,
) -> Result<bool, String> {

    // Paso de depuración: Imprimir los datos recibidos
    println!("Datos recibidos en update_user:");
    println!("- usuario_id: {}", usuario_id);
    println!("- correo: {}", correo);
    println!("- estado: {}", estado);

    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "Pool de DB no inicializado".to_string())?;

    // Lógica para obtener el usuario conectado desde el backend
    let usuario_conectado = get_logged_in_username(&state).await?; // Esta función debe existir en tu backend


    // Llama a la función y almacena el resultado para manejar el error
    let resultado = user_logic::update_user_logic(
        pool_ref,
        usuario_id, // usuario_id
        &correo,
        &estado,
        &usuario_conectado,
    )
    .await; // <-- Aquí está el cambio clave

    // Usamos 'match' para manejar los casos de éxito y de error
    match resultado {
        Ok(_) => {
            // Si la operación de lógica fue exitosa, devolvemos Ok(true)
            Ok(true)
        },
        Err(e) => {
            // Si hubo un error, lo convertimos a un String y lo devolvemos
            let error_message = match e {
                UserError::NotFound => "El usuario no fue encontrado.".to_string(),
                UserError::AlreadyExists => "No se puede actualizar el usuario. El usuario ya existe.".to_string(),
                UserError::DatabaseError(db_err) => format!("Error de base de datos: {}", db_err),
            };
            Err(error_message)
        }
    }
}

//   Ok(true)



// Función auxiliar para obtener el nombre de usuario conectado
// La firma del parámetro cambia a una referencia (&)
pub async fn get_logged_in_username(state: &tauri::State<'_, AppState>) -> Result<String, String> {
    let user_state_guard = state.usuario_conectado.lock().await;
    
    let username = user_state_guard.as_ref()
        .map(|u| u.usuario.clone())
        .ok_or_else(|| "No hay un usuario conectado".to_string())?;

    Ok(username)
}