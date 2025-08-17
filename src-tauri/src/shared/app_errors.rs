// src-tauri/src/app_errors.rs

use serde::Serialize;

// Enum para nuestros códigos de error personalizados
#[derive(Serialize)]
pub enum AppErrorCode {
    // Cuando se intenta crear un usuario que ya existe
    #[serde(rename = "USER_ALREADY_EXISTS")]
    UserAlreadyExists,

    // Cuando se intenta actualizar y un usuario no existe
    #[serde(rename = "USER_NOT_FOUND")]
    UserNotFound,

    // Para error de base de datos
    #[serde(rename = "DATABASE_ERROR")]
    DatabaseError,
    
    // Para cualquier otro error de validación
    #[serde(rename = "VALIDATION_ERROR")]
    ValidationError,

    // Error interno del servidor genérico
    #[serde(rename = "INTERNAL_ERROR")]
    InternalError,

    // Error de solicitud inválida del cliente
    #[serde(rename = "BAD_REQUEST")]
    BadRequest,
}

// Estructura que enviamos al frontend
#[derive(Serialize)]
pub struct ApiError {
    pub code: AppErrorCode,
    pub message: String,
}