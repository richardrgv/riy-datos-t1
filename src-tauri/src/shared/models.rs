// src-tauri/src/models.rs
use serde::{Serialize, Deserialize};
use sqlx::FromRow;


// Estructura para representar un usuario
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Usuario {
    pub usuario_id: i32,
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
    pub estado: String,
    pub autor: String,
    pub fecha_creacion: String, // Usa un tipo de dato de fecha/hora más preciso
    pub modificado_por: Option<String>,
    pub fecha_modificacion: Option<String>, // Usa un tipo de dato de fecha/hora más preciso
    pub codigo_verificacion: Option<i32>,
    pub fecha_codigo_verificacion: Option<String>, // Usa un tipo de dato de fecha/hora más preciso
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewUsuario {
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
    pub estado: String,
    pub autor: String,
    pub fecha_creacion: String, // Usa un tipo de dato de fecha/hora más preciso
}
#[derive(serde::Serialize, serde::Deserialize, Debug, FromRow)]
pub struct UserSearchResult {
    pub usuario: String,
    pub nombre: Option<String>, // <-- ¡CORREGIDO! Ahora es un Option<String>
} 

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, FromRow)]
pub struct LoggedInUser {
    pub usuario: String,
    pub nombre: Option<String>, // <-- CORREGIDO: Ahora es un Option<String>
    // Puedes añadir otros campos que necesites, como rol, etc.
}

// Añade el ID para asegurarte de que Serde no falle al recibirlo del frontend.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsuarioActualizable {
    pub correo: String,
    pub estado: String,
}

// Manejo de errores
#[derive(Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}