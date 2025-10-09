// src-tauri/src/api/errors.rs (Código corregido)

use actix_web::{error::ResponseError, http::StatusCode, HttpResponse};
use std::fmt::{Display, Formatter, Result as FmtResult};
use std::error::Error as StdError; // Alias for clarity

// El tipo de error personalizado para toda la API
#[derive(Debug)]
pub struct CustomError {
    pub status_code: u16,
    pub message: String,
}

impl CustomError {
    // Constructor simple
    pub fn new(status_code: u16, message: &str) -> Self {
        CustomError {
            status_code,
            message: message.to_string(),
        }
    }
}

// 1. Permite que CustomError se use en funciones que devuelven Result<T, E>
impl Display for CustomError {
    fn fmt(&self, f: &mut Formatter) -> FmtResult {
        write!(f, "{}", self.message)
    }
}

// 2. Permite que Rust lo reconozca como un Error estándar
impl std::error::Error for CustomError {}

// 3. Permite convertir CustomError directamente a una respuesta HTTP de Actix
impl ResponseError for CustomError {
    fn status_code(&self) -> StatusCode {
        // Usamos el código HTTP que almacenamos
        StatusCode::from_u16(self.status_code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
    }

    fn error_response(&self) -> HttpResponse {
        // CORRECCIÓN CLAVE: Usamos .as_str() para obtener un &str, 
        // que Actix Web acepta como MessageBody.
        HttpResponse::build(self.status_code())
            .body(self.message.clone()) // This satisfies the 'static lifetime requirement
    }
}

// 4. Implementación para convertir errores comunes (ej. String o sqlx::Error)
impl From<String> for CustomError {
    fn from(err: String) -> Self {
        CustomError::new(500, &err)
    }
}
// ✅ Implement From<Box<dyn StdError>> for CustomError
impl From<Box<dyn StdError>> for CustomError {
    fn from(err: Box<dyn StdError>) -> Self {
        // Here you decide how to map the boxed error into your CustomError.
        // We'll map it to a 500 status code and use the error's display message.
        CustomError {
            status_code: 500, // Use 500 Internal Server Error for generic boxed errors
            message: format!("Error interno en la validación del token: {}", err),
        }
    }
}