// src-tauri/src/user.rs

use tauri::State;
use sqlx::{Pool, Mssql, Row};
use crate::models::{Usuario, NewUsuario, UserSearchResult, LoggedInUser};
use crate::AppState;
use sqlx::{query, query_as};

use crate::auth::authenticate_erp_user; // <-- Importa la función de autenticación

use chrono::{Utc, DateTime, NaiveDateTime};
use chrono::format::strftime::StrftimeItems;



// ... (El comando get_users se mantiene igual) ...

#[tauri::command]
pub async fn get_users(state: State<'_, AppState>) -> Result<Vec<Usuario>, String> {
    // ...
    let db_pool_guard = state.db_pool.lock().await;
    let db_pool = db_pool_guard.as_ref().ok_or_else(|| {
        "El pool de la base de datos no está inicializado".to_string()
    })?;
    let sql_collate_clause_ref = &state.sql_collate_clause;
    let users = query_as::<_, Usuario>(
        &format!(
            r#"
                SELECT
                    usuarioID as usuario_id,
                    usuario {0} as usuario,
                    nombre {0} as nombre,
                    correo {0} as correo,
                    estado {0} as estado,
                    autor {0} as autor,
                    CONVERT(VARCHAR, fechaCreacion, 120) {0} as fecha_creacion,
                    modificadoPor {0} as modificado_por,
                    CONVERT(VARCHAR, fechaModificacion, 120) {0} as fecha_modificacion,
                    codigoVerificacion as codigo_verificacion,
                    CONVERT(VARCHAR, fechaCodigoVerificacion, 120) {0} as fecha_codigo_verificacion
                FROM riy.riy_usuario WITH(NOLOCK)
            "#,
            sql_collate_clause_ref
        )
    )
    .fetch_all(db_pool)
    .await
    .map_err(|e| format!("Error al obtener usuarios: {}", e))?;
    Ok(users)
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

    let users = query_as::<_, UserSearchResult>(
        &format!(r#"
        SELECT TOP 100 usuario {0} as usuario, nombre {0} as nombre
        FROM dbo.Usuario WITH(NOLOCK)
        WHERE LOWER(usuario) LIKE @p1 {0}
        OR LOWER(nombre) LIKE @p1 {0}
        "#,
            sql_collate_clause_ref
        )
    )
    .bind(format!("%{}%", search_term.to_lowercase()))
    .fetch_all(pool_ref)
    .await
    .map_err(|e| format!("Error al buscar usuarios en el ERP: {}", e))?;
    Ok(users)
}



#[tauri::command]
pub async fn add_user_from_erp(
    state: State<'_, AppState>,
    usuario: String, // El `usuario` del ERP seleccionado
    nombre: String,  // El `nombre` del ERP seleccionado
    correo: String,  // El correo ingresado por el usuario
) -> Result<String, String> {

    // Aquí puedes imprimir el valor de `usuario`
    println!("El valor de 'usuario' recibido es: {}", usuario);

    let sql_collate_clause_ref = &state.sql_collate_clause;
    // LLAMADA ESCALABLE: Obtenemos el nombre del autor con la función auxiliar
    let autor = get_logged_in_username(&state).await?; // CORRECCIÓN AQUÍ
    

    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "Pool de DB no inicializado".to_string())?;
    
    // CORRECCIÓN CLAVE AQUÍ: Usamos sqlx::query() para construir la consulta dinámicamente
    let sql_query = format!(
        r#"
        SELECT 1
        FROM riy.riy_usuario WITH(NOLOCK)
        WHERE usuario = @p1 {0}
        "#,
        sql_collate_clause_ref
    );

    let existing_user = sqlx::query(&sql_query) // <-- No especificamos una estructura para mapear
        .bind(&usuario)
        .fetch_optional(pool_ref)
        .await
        .map_err(|e| format!("Error al verificar si el usuario existe: {}", e))?;



    if existing_user.is_some() {
        return Err("El usuario ya existe en el sistema.".to_string());
    }

    // 2. Completamos los campos para la inserción
    let estado = "Vigente"; // Fijo
 
    // 3. Insertamos en la base de datos
    query(
        r#"
        INSERT INTO riy.riy_usuario 
        (usuario, nombre, correo, estado, autor, fechaCreacion)
        VALUES (@p1, @p2, @p3, @p4, @p5, GETDATE())
        "#,
    )
    .bind(usuario.clone()) // <-- CORRECCIÓN: Clona la String aquí)
    .bind(nombre)
    .bind(correo)
    .bind(estado)
    .bind(autor)
    .execute(pool_ref)
    .await
    .map_err(|e| format!("Error al insertar el usuario: {}", e))?;

    Ok(format!("Usuario '{}' agregado exitosamente desde el ERP.", usuario))
}


#[tauri::command]
pub async fn add_user(
    state: tauri::State<'_, AppState>,
    new_user_data: NewUsuario,
) -> Result<String, String> {

    // LLAMADA ESCALABLE: Obtenemos el nombre del autor con la función auxiliar
   let autor = get_logged_in_username(&state).await?; // CORRECCIÓN AQUÍ

    let pool_guard = state.db_pool.lock().await;
    let pool = pool_guard.as_ref().ok_or("Pool de DB no inicializado".to_string())?;

    let current_time_str = chrono::Utc::now().to_rfc3339();

    /*  Verificamos si el usuario ya existe para evitar duplicados
    let existing_user = sqlx::query!(
        "SELECT usuario FROM riy.riy_usuario WITH(NOLOCK)
          WHERE usuario = @p1",
        new_user_data.usuario.clone() // <-- Clona aquí para el primer uso
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error al verificar usuario: {}", e))?;

    if existing_user.is_some() {
        return Err(format!("El usuario '{}' ya existe.", new_user_data.usuario));
    }
    */
    sqlx::query(
    "INSERT INTO riy.riy_usuario (usuario, nombre, correo, estado, autor, fechaCreacion) VALUES (@p1, @p2, @p3, @p4, @p5, @p6)"
    )
    .bind(new_user_data.usuario.clone())
    .bind(new_user_data.nombre)
    .bind(new_user_data.correo)
    .bind(new_user_data.estado)
    .bind(autor)
    .bind(current_time_str)
    .execute(pool)
    .await
    .map_err(|e| format!("Error al crear el usuario: {}", e))?;

    Ok(format!("El usuario '{}' ha sido creado exitosamente.", new_user_data.usuario))
}

/*
// LLAMADA ESCALABLE: Obtenemos el nombre del autor con la función auxiliar
    let modificado_por = get_logged_in_username(state).await?;
*/


#[tauri::command]
pub async fn update_user(
    state: tauri::State<'_, AppState>,
    usuario_id: i32,
    correo: String,
    estado: String,
) -> Result<bool, String> {

    let pool_guard = state.db_pool.lock().await;
    let pool_ref = pool_guard.as_ref().ok_or_else(|| "Pool de DB no inicializado".to_string())?;

    // Lógica para obtener el usuario conectado desde el backend
    let usuario_conectado = get_logged_in_username(&state).await?; // Esta función debe existir en tu backend

    query(
            "UPDATE riy.riy_usuario
                SET correo = @p1, 
                    estado = @p2, 
                    modificadoPOr = @p3,
                    fechaModificacion = GETDATE()
             WHERE usuarioID = @p4" 
         )
        .bind(correo)
        .bind(estado)
        .bind(usuario_conectado)
        .bind(usuario_id)
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Error al actualizar usuario: {}", e))?;

    // Aquí iría la lógica de actualización en tu base de datos
    // sqlx::query!("UPDATE usuarios SET correo = $1, estado = $2, modificado_por = $3, fecha_modificacion = GETDATE() WHERE usuario_id = $4",
    //    correo, estado, usuario_conectado, usuario_id)
    //    .execute(&pool)
    //    .await
    //    .map(|_| true)
    //    .map_err(|e| e.to_string())

    /* Simulación de una actualización exitosa
    println!("Actualizando usuario_id: {}, con correo: {}, estado: {}, modificado_por: {}",
             usuario_id, correo, estado, usuario_conectado);
    */

    Ok(true)
}



// Función auxiliar para obtener el nombre de usuario conectado
// La firma del parámetro cambia a una referencia (&)
async fn get_logged_in_username(state: &tauri::State<'_, AppState>) -> Result<String, String> {
    let user_state_guard = state.usuario_conectado.lock().await;
    
    let username = user_state_guard.as_ref()
        .map(|u| u.usuario.clone())
        .ok_or_else(|| "No hay un usuario conectado".to_string())?;

    Ok(username)
}