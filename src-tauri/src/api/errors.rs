
// src-tauri/src/api/errors.rs (Código corregido con ENUM)

use actix_web::{error::ResponseError, http::StatusCode, HttpResponse};
use std::fmt::{Display, Formatter, Result as FmtResult};
use std::error::Error as StdError;

// 🚨 CAMBIO CRÍTICO: Definir CustomError como un ENUM 🚨
// Esto permite las llamadas CustomError::AuthError(...) y CustomError::Unauthorized(...)
#[derive(Debug)]
pub enum CustomError {
    // Variante genérica para usar CustomError::new(status, message)
    HttpError {
        status_code: u16,
        message: String,
    },
    // Variante usada en external_auth_handler's .map_err()
    AuthError(String), 
    // Variante usada en external_login_handler
    Unauthorized(String), 
}

impl CustomError {
    // El constructor 'new' original ahora crea la variante HttpError
    pub fn new(status_code: u16, message: &str) -> Self {
        CustomError::HttpError {
            status_code,
            message: message.to_string(),
        }
    }
}

// 1. Implementación de Display (para Result<T, E>)
impl Display for CustomError {
    fn fmt(&self, f: &mut Formatter) -> FmtResult {
        // Extrae el mensaje de cualquier variante
        match self {
            CustomError::HttpError { message, .. } => write!(f, "{}", message),
            CustomError::AuthError(msg) | CustomError::Unauthorized(msg) => write!(f, "{}", msg),
        }
    }
}

// 2. Implementación de Error estándar
impl std::error::Error for CustomError {}

// 3. Implementación de ResponseError (para Actix-Web)
impl ResponseError for CustomError {
    fn status_code(&self) -> StatusCode {
        match self {
            CustomError::HttpError { status_code, .. } => {
                // Asegúrate de que el código sea válido, sino usa 500
                StatusCode::from_u16(*status_code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
            }
            // Mapea AuthError y Unauthorized al código 401
            CustomError::AuthError(_) | CustomError::Unauthorized(_) => StatusCode::UNAUTHORIZED, 
        }
    }
    fn error_response(&self) -> HttpResponse {
        // 🚨 La clave: Construir siempre un objeto JSON en el cuerpo 🚨
        let error_message = format!("{}", self); // Usamos 'self' para obtener el mensaje detallado

        HttpResponse::build(self.status_code())
            .insert_header(actix_web::http::header::ContentType::json())
            .json(serde_json::json!({
                "error": true,
                "status": self.status_code().as_u16(),
                "message": error_message,
                "detail": "Fallo en el proceso de autenticación externa."
            }))
    }
    /*
    fn error_response(&self) -> HttpResponse {
        let message = match self {
            CustomError::HttpError { message, .. } => message.clone(),
            CustomError::AuthError(msg) | CustomError::Unauthorized(msg) => msg.clone(),
        };
        
        HttpResponse::build(self.status_code())
            .body(message)
    }
    */
}

// 4. Implementación From<String> (para conversiones automáticas)
impl From<String> for CustomError {
    fn from(err: String) -> Self {
        // Usamos el constructor para crear un error 500
        CustomError::new(500, &err)
    }
}

// 5. Implementación From<Box<dyn StdError>> (para errores de librerías)
impl From<Box<dyn StdError>> for CustomError {
    fn from(err: Box<dyn StdError>) -> Self {
        CustomError::HttpError {
            status_code: 500,
            message: format!("Error interno en la validación del token: {}", err),
        }
    }
}