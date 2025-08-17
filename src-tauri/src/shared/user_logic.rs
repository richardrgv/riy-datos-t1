use sqlx::{Pool, Mssql};
use sqlx::query;
//use crate::models::{Usuario, UserSearchResult}; // Asegúrate de definir UsuarioActualizable
use super::models::{Usuario, UserSearchResult, LoggedInUser};
use super::{auth}; 
use sqlx::Error as SqlxError;

pub enum UserError {
    AlreadyExists,
    DatabaseError(SqlxError),
    NotFound,
    // Otros errores de validación de negocio, si los hay
}
// aqui se llena automaticamente el UserError de Database, usando ? 
impl From<SqlxError> for UserError {
    fn from(error: SqlxError) -> Self {
        UserError::DatabaseError(error)
    }
}


// Función para obtener todos los usuarios (independiente de Tauri)
pub async fn get_all_users_logic(
        pool: &Pool<Mssql>,
        sql_collate_clause: &str,
    ) -> Result<Vec<Usuario>, String> {

    println!("Backend: antes del SELECT.");
    let sql_query = format!(
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
        sql_collate_clause
    );

    let users = sqlx::query_as::<_, Usuario>(&sql_query) // <-- CAMBIO CLAVE AQUÍ
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al leer todos los usuarios: {}", e))?;

    Ok(users)
}


pub async fn search_erp_users_logic(
    pool: &Pool<Mssql>,
    search_term: &str,
    sql_collate_clause: &str,
) -> Result<Vec<UserSearchResult>, String> {

    let sql_query = format!(
        r#"
        SELECT TOP 100 usuario {0} as usuario, nombre {0} as nombre
          FROM dbo.Usuario WITH(NOLOCK)
         WHERE UsuarioPerfil = 'US' {0}
           AND Estado = 'A' {0}
           AND LoginPersonaFlag = 'N' {0}
           AND (LOWER(usuario) LIKE @p1 {0} OR LOWER(nombre) LIKE @p1 {0})
        "#,
        sql_collate_clause
    );

    let users = sqlx::query_as::<_, UserSearchResult>(&sql_query) // <-- CAMBIO CLAVE AQUÍ
        .bind(format!("%{}%", search_term.to_lowercase()))
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al leer todos los usuarios: {}", e))?;

    Ok(users)
}

pub async fn add_user_logic(
    pool: &Pool<Mssql>,
    usuario: &str,
    nombre: &str,
    correo: &str,
    autor: &str,
    sql_collate_clause: &str,
) -> Result<(), UserError> {
//) -> Result<String, String> { // Modifica la firma de la función para usar el nuevo Result

    // 1. Verificar si el usuario ya existe
    let sql_query = format!(
        r#"
        SELECT 1
        FROM riy.riy_usuario WITH(NOLOCK)
        WHERE usuario = @p1 {0}
        "#,
        sql_collate_clause
    );

    let existing_user = sqlx::query(&sql_query)
        .bind(usuario)
        .fetch_optional(pool)
        .await
        //.map_err(|e| format!("Error al verificar si el usuario existe: {}", e))?;
        ?;

    if existing_user.is_some() {
        return Err(UserError::AlreadyExists);
    }

    // 2. Insertar el nuevo usuario
    let estado = "Vigente";
    
    query(
        r#"
        INSERT INTO riy.riy_usuario 
        (usuario, nombre, correo, estado, autor, fechaCreacion)
        VALUES (@p1, @p2, @p3, @p4, @p5, GETDATE())
        "#,
    )
    .bind(usuario)
    .bind(nombre)
    .bind(correo)
    .bind(estado)
    .bind(autor)
    .execute(pool)
    .await
    ?;
    //.map_err(|e| format!("Error al insertar el usuario: {}", e))?;

    // 5. Retorna un Ok vacío, ya que el mensaje de éxito se maneja en el handler
    Ok(()) //format!("Usuario '{}' agregado exitosamente desde el ERP.", usuario))
}

// Función para actualizar un usuario (independiente de Tauri)
pub async fn update_user_logic(
    pool: &sqlx::Pool<sqlx::Mssql>,
    usuario_id: i32,
    correo: &str,
    estado: &str,
    modificado_por: &str,
) -> Result<usize, UserError> { 
    
    // This is the correct, standard way to write the query.
    // The macro automatically maps the Rust variables to the SQL placeholders.
    let rows_affected = sqlx::query!(
        r#"
        UPDATE riy.riy_usuario
        SET 
            correo = @p1,
            estado = @p2,
            fechaModificacion = GETDATE(),
            modificadoPor = @p3
        WHERE
            usuarioID = @p4
        "#,
        )
        .bind(correo)
        .bind(estado)
        .bind(modificado_por)
        .bind(usuario_id)
        .execute(pool)
        .await?
        //.map_err(|e| e.to_string())?
        .rows_affected();
    

    if rows_affected == 0 {
        // En lugar de un String, devuelve la variante del enum
        return Err(UserError::NotFound); 
        //return Err(format!("No se encontró ningún usuario con el ID: {} para actualizar.", usuario_id));
    }

    // Convierte `u64` a `usize` de manera segura antes de devolverlo
    Ok(rows_affected.try_into().unwrap())
}
    

    /*  Tu consulta SQL de actualización
    let query = "
        UPDATE
            riy.riy_usuario
        SET
            correo = ?,
            estado = ?,
            fechaModificacion = GETDATE(),
            modificadoPor = ?
        WHERE
            usuarioID = ?;
    ";
     // AÑADE ESTE PRINT PARA VER LA CONSULTA QUE SE VA A EJECUTAR
    println!("Ejecutando la siguiente consulta SQL:");
    println!("{}", query);
    println!("Valores a usar en la query:");
    println!("- correo: {}", correo);
    println!("- estado: {}", estado);
    println!("- autor: {}", modificado_por);
    println!("- usuario_id: {}", usuario_id);

    // Intenta ejecutar la consulta y maneja el error
    // It captures the number of rows affected by the query.
    let rows_affected =sqlx::query(query)
        .bind(correo)
        .bind(estado)
        .bind(modificado_por)
        .bind(usuario_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error al actualizar el usuario: {}", e))?
        .rows_affected(); // <-- Captura cuántas filas fueron afectadas
    
    if rows_affected == 0 {
        return Err(format!("No se encontró ningún usuario con el ID: {} para actualizar.", usuario_id));
    }

    println!("La actualización del usuario {} se ha ejecutado con éxito.", usuario_id);
    Ok(())
    
}*/
// Agrega aquí la lógica para add_user_from_erp
// ...



// La nueva función central con un nombre más claro
pub async fn authenticate_user_logic(
    pool: &Pool<Mssql>,
    username: &str,
    password: &str,
    auth_method: &str,
    sql_collate_clause: &str
) -> Result<Option<LoggedInUser>, String> {
    match auth_method {
        "ERP" => auth::authenticate_erp_user(&pool, username, password, sql_collate_clause).await,
        _ => auth::authenticate_user(&pool, username, password).await,
    }
}


pub async fn get_user_permissions_logic(
    pool: &Pool<Mssql>,
    user_id: &str, // O el tipo de dato que uses para el ID
) -> Result<Vec<String>, String> {
    // Aquí va tu lógica de base de datos para obtener los permisos
    // Por ejemplo:
    // let rows = sqlx::query!(...).fetch_all(pool).await.map_err(|e| e.to_string())?;
    // let permissions = rows.iter().map(|r| r.permission.clone()).collect();
    // Ok(permissions)

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
    Ok(permissions)

    
    // Para que compile, puedes usar un valor por defecto temporal
    //Ok(vec!["permiso_ejemplo".to_string()])
}