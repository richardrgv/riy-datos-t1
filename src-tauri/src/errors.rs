// errors.rs

// Importaciones necesarias para manejar y convertir errores.
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::{Serialize, Deserialize};

// =========================================================================
// 1. Enumeración Principal de Errores (Error)
// =========================================================================

/// Enumeración que representa todos los posibles errores de la aplicación.
/// Este tipo será el valor de retorno en todos nuestros métodos que puedan fallar.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    // --- Errores de Base de Datos ---
    #[error("Error de base de datos: {0}")]
    DatabaseError(#[from] sqlx::Error),

    // --- Errores de Autenticación/Negocio ---
    #[error("Usuario no encontrado")]
    UserNotFound,

    #[error("Contraseña o usuario inválido")]
    InvalidCredentials,

    #[error("Permisos insuficientes")]
    Unauthorized,

    #[error("Datos de entrada inválidos: {0}")]
    ValidationError(String),

    // --- Errores de Configuración/Inicialización ---
    #[error("Error de Configuración: {0}")]
    ConfigError(String),

    // --- Error Genérico de E/S (Input/Output) ---
    #[error("Error de I/O: {0}")]
    IoError(#[from] std::io::Error),
    
    // --- Error del Sidecar (Tauri) ---
    #[error("Error al interactuar con el proceso Sidecar: {0}")]
    SidecarError(String),
}

// NOTE: Este error debe implementarse en 'src-tauri/Cargo.toml'
// [dependencies]
// thiserror = "1.0"
// sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "sqlite"] } 
// =========================================================================
// 2. Estructura de Respuesta de Error (ApiErrorResponse)
// =========================================================================

/// Estructura utilizada para dar formato al JSON de respuesta de error
/// que se envía al cliente (navegador o frontend de Tauri).
#[derive(Debug, Serialize, Deserialize)]
struct ApiErrorResponse {
    /// Código de estado HTTP (aunque solo se usa para el cuerpo del JSON).
    status_code: u16,
    /// Mensaje de error legible por humanos.
    message: String,
}

// =========================================================================
// 3. Implementación de Conversión HTTP (para Axum/APIs)
// =========================================================================

/// Permite que nuestro tipo `Error` se convierta directamente en una
/// respuesta HTTP para el framework Axum.
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        // Determinar el StatusCode y el mensaje basado en el tipo de error
        let (status, message) = match &self {
            // Base de Datos
            Error::DatabaseError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Error interno de la base de datos."),

            // Negocio/Autenticación
            Error::UserNotFound => (StatusCode::NOT_FOUND, "El recurso solicitado no fue encontrado."),
            Error::InvalidCredentials => (StatusCode::UNAUTHORIZED, "Credenciales incorrectas."),
            Error::Unauthorized => (StatusCode::FORBIDDEN, "Acceso denegado. Permisos insuficientes."),
            
            // Validación/Cliente
            Error::ValidationError(msg) => (StatusCode::BAD_REQUEST, msg.clone()),

            // Errores Internos/Configuración
            Error::ConfigError(msg) | Error::SidecarError(msg) | Error::IoError(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, format!("Error interno del servidor: {}", msg))
            },
        };

        // Crear la estructura de respuesta de error
        let response_body = ApiErrorResponse {
            status_code: status.as_u16(),
            message: message.to_string(),
        };

        // Serializar la respuesta a JSON y devolverla
        (status, axum::Json(response_body)).into_response()
    }
}

// =========================================================================
// 4. Implementación de Conversión de Tauri (para comandos)
// =========================================================================

/// Permite que el error se convierta en una cadena (String) para ser usado
/// como el tipo de error de retorno en los comandos de Tauri.
impl From<Error> for String {
    fn from(error: Error) -> Self {
        error.to_string()
    }
}

// Alias de Resultado genérico para simplificar firmas de funciones.
pub type Result<T> = std::result::Result<T, Error>;