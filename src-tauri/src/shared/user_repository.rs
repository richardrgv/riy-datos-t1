// src-tauri/src/shared/user_repository.rs

use anyhow::{anyhow, Result};
use sqlx::{query_as, query, FromRow, Row}; // Importamos Row para result.try_get
use chrono::Utc; // Necesario para la fecha de creación
use crate::models::{Usuario, LoggedInUser, UserInfo, NewUsuario};
// 🏆 CORRECCIÓN: Importamos DbPool desde el módulo compartido 'auth'
// donde ya está definida como pública (pub type DbPool = Pool<Mssql>;).
use super::auth::DbPool;
use crate::models::{User};

use std::error::Error;
use std::fmt;

// -------------------------------------------------------------------------
// ESTRUCTURAS DE MAPEO INTERNO (Solo para consultas específicas)
// -------------------------------------------------------------------------

/// Estructura simplificada para mapear el SELECT inicial desde la DB.
/// Incluye `estado` para que el mapeo sea completo para `LoggedInUser`.
#[derive(Debug, FromRow)]
pub struct UserDbRecord {
    pub usuario_id: i32,
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
    pub estado: String, // **CORREGIDO**
}


// --- MANEJO DE ERRORES PERSONALIZADO ---

/// Tipo simulado para el error de la librería de SQL (ej. sqlx::Error)
#[derive(Debug)]
pub struct SqlxError; 
impl fmt::Display for SqlxError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result { write!(f, "Error de la base de datos SQLX simulado") }
}
impl Error for SqlxError {}


/// Tipo de error de la capa de Repositorio que envuelve errores específicos.
// CORRECCIÓN: Definición del tipo UserError
#[derive(Debug)]
pub enum UserError {
    DatabaseError(SqlxError), // Para errores de comunicación o DB
    ValidationError(String), // Para errores de datos o lógica de negocio
    NotFound(String),        // Para indicar que un usuario no existe
}

impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            UserError::DatabaseError(e) => write!(f, "Error de base de datos: {}", e),
            UserError::ValidationError(msg) => write!(f, "Error de validación: {}", msg),
            UserError::NotFound(msg) => write!(f, "No encontrado: {}", msg),
        }
    }
}

impl Error for UserError {}

// CORRECCIÓN: Implementación del trait From para mapear errores externos a UserError
// Esto es necesario para que el .map_err(UserError::from)? funcione correctamente.
impl From<SqlxError> for UserError {
    fn from(error: SqlxError) -> Self {
        UserError::DatabaseError(error)
    }
}



// -------------------------------------------------------------------------
// REPOSITORIO DE USUARIOS
// -------------------------------------------------------------------------

/// Busca un usuario en la tabla `riy.riy_usuario` por correo electrónico.
/// Si no existe, lo crea usando los datos de `UserInfo`.
pub async fn find_or_create_user(
    pool: &DbPool,
    user_info: &UserInfo,
    collate_clause: &str,
) -> Result<LoggedInUser> {
    
    // 1. Intentar buscar el usuario por correo
    let email = user_info.email.to_lowercase();

    // La consulta debe incluir todos los campos de UserDbRecord
    let select_query = format!(
        "SELECT usuario_id, usuario, nombre, correo, estado \
         FROM riy.riy_usuario WITH(NOLOCK) \
         WHERE correo = $1 COLLATE {}",
        collate_clause
    );

    let user_record_result: Result<UserDbRecord, sqlx::Error> = query_as(&select_query)
        .bind(&email)
        .fetch_one(pool)
        .await;

    match user_record_result {
        // A. Usuario encontrado
        Ok(user_record) => {
            
            let roles: Vec<String> = vec!["Temporal".to_string()]; 


            // Mapear a LoggedInUser
            // **CORREGIDO**: Incluimos 'estado' y 'permissions' para resolver el error E0560.
            let logged_in_user = LoggedInUser {
                usuario_id: Some(user_record.usuario_id),
                usuario: Some(user_record.usuario),
                nombre: Some(user_record.nombre),
                correo: Some(user_record.correo),
                roles: roles,
                //estado: user_record.estado, // Campo 'estado' incluido
                //permissions: Vec::new(), // Campo 'permissions' incluido (vacío por ahora)
            };
            
            // NOTA: Aquí se podría añadir lógica para obtener permisos reales de otra tabla
            
            Ok(logged_in_user)
        },
        
        // B. Usuario no encontrado (NotFound) -> Crear nuevo usuario
        Err(sqlx::Error::RowNotFound) => {
            // Construir el nuevo usuario
            let new_user = NewUsuario {
                // Usamos el preferred_username si existe, sino el nombre completo.
                usuario: user_info.username.clone(),
                nombre: user_info.name.clone().unwrap_or_default(),
                correo: email,
                estado: "Activo".to_string(), // Estado inicial por defecto
                autor: "System".to_string(), // Autor por defecto
                fecha_creacion: Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            };
            
            // Crear en la DB
            let created_user_result = create_new_user(pool, new_user).await;

            match created_user_result {
                Ok(usuario) => {
                    // Mapear el Usuario recién creado a LoggedInUser
                    Ok(LoggedInUser {
                        usuario_id: usuario.usuario_id,
                        usuario: Some(usuario.usuario),
                        nombre: Some(usuario.nombre),
                        correo: Some(usuario.correo),
                        // Campo 'roles' inicializado con un vector vacío (el valor por defecto).
                        roles: Vec::new(),
                    })
                },
                Err(e) => Err(e),
            }
        },
        
        // C. Otro error de DB
        Err(e) => Err(UserError::DatabaseError(e)),
    }
}


/// Inserta un nuevo usuario en la tabla `riy.riy_usuario` y retorna la estructura `Usuario` completa.
///
/// NOTA: Asume que la columna `usuario_id` es de tipo `IDENTITY(1,1)` y retorna el ID generado.
pub async fn create_new_user(
    pool: &DbPool,
    user: NewUsuario,
) -> Result<User> {
    
    let insert_query = "
        INSERT INTO riy.riy_usuario (usuario, nombre, correo, estado, autor, fecha_creacion)
        VALUES (@p1, @p2, @p3, @p4, @p5, @p6);
        SELECT SCOPE_IDENTITY() AS usuario_id;
    ";

    // 1. Insertar y obtener el nuevo ID
    let result = query(insert_query)
        .bind(&user.usuario)
        .bind(&user.nombre)
        .bind(&user.correo)
        .bind(&user.estado)
        .bind(&user.autor)
        .bind(&user.fecha_creacion)
        .fetch_one(pool)
        .await
        .map_err(UserError::from)?; // Usa el trait From para convertir SqlxError a UserError

    // 2. Extraer el ID
    let new_id: i32 = result.try_get("usuario_id")
        .map_err(|e| UserError::ValidationError(format!("Error al obtener SCOPE_IDENTITY: {}", e)))?;

    // 3. Devolver la estructura completa del nuevo usuario
    Ok(Usuario {
        usuario_id: new_id,
        usuario: user.usuario,
        nombre: user.nombre,
        correo: user.correo,
        estado: user.estado,
        autor: user.autor,
        fecha_creacion: user.fecha_creacion,
        modificado_por: None,
        fecha_modificacion: None,
        codigo_verificacion: None,
        fecha_codigo_verificacion: None,
    })
}

// --- Otras funciones CRUD irían aquí (e.g., update_user_status, delete_user, etc.) ---