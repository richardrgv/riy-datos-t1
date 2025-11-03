// src-tauri/src/models.rs

use serde::{Serialize, Deserialize};
use sqlx::FromRow;
//use std::collections::HashMap; // Para los permisos

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



// Añade el ID para asegurarte de que Serde no falle al recibirlo del frontend.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsuarioActualizable {
    pub correo: String,
    pub estado: String,
}


// estructuras que existen en frontend en types/api-types.ts
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// 1. Estructura para el Usuario (sin rol/subRol, porque están en la tabla de mapeo)
#[derive(Debug, Clone, Deserialize, Serialize, FromRow)] 
//                 |          |          |
//                 |          |          └── sqlx (para mapeo DB)
//                 |          └── serde (para JSON)
//                 └── serde (para recibir JSON)
// Usamos el nombre 'LoggedInUser' para ser más explícitos en el flujo
pub struct LoggedInUser {
    #[serde(rename = "usuarioID")]
    pub usuario_id: i32,
    // 🚨 Estos campos deben coincidir con el JSON y la DB
    pub usuario: Option<String>,
    pub nombre: Option<String>,
    // Lo hacemos obligatorio, ya que es crucial para el login B2B/B2C
    pub correo: Option<String>,
}
// 2. Estructura para la ASIGNACIÓN DE ROL ESPECÍFICA DE LA APLICACIÓN
#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct UserRoleAssignment {
    pub rol: String,
    // Usamos el alias de Rust, pero sqlx lo mapea de 'subRol' de la DB
    #[sqlx(rename = "subRol")] 
    pub sub_rol: String, 
}




// se usara LoggedInUser

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct User {
    // 🚨 CAMBIO: ID opcional (None antes de insertar, Some(id) después)
    pub usuario_id: Option<i32>,

    pub usuario: String,
    pub nombre: String,
    pub correo: String,
}

/* 
se usara: AuthResponsePayload

// Tipo para la respuesta completa del login del backend
#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: User,
    pub permissions: Vec<String>,
}
*/


#[derive(Debug, Deserialize, Serialize)]
pub struct LoginData {
    pub usuario: String,
    pub password: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MsalClaims {
    // ⚠️ CRÍTICO: El campo 'upn' contiene el correo electrónico/usuario.
    // Azure AD usa 'upn' (User Principal Name) o a veces 'preferred_username'.
    // Si tu token usa 'upn', déjalo así. Si usa 'preferred_username', cámbialo.
    pub upn: String,
    
    // El campo 'aud' (Audiencia) es necesario para jwt-auth (pero la librería lo valida)
    pub aud: String,
    
    // El campo 'exp' (Expiración) es necesario para jwt-auth (pero la librería lo valida)
    pub exp: i64,
    
    // Puedes añadir otros campos comunes si los usas, como:
    // pub name: String,
    // pub given_name: String,
    // pub family_name: String,
}



// --- Solicitud (Input) ---+++++++++++++++++++++++++++++++++++++++++++++++++++
#[derive(Debug, Deserialize)]
pub struct AuthRequestPayload {
    // El 'code' de Google O el 'access token' de MSAL
    pub proof_of_identity: String, 
    // Identificador: 'google', 'msal-corp', o 'msal-personal'
    pub provider: String, 
    // URI necesaria para el intercambio de código (solo para Google)
    pub redirect_uri: String, 
}

// --- Respuesta (Output) ---
// Esta estructura debe coincidir con la interfaz `AuthResponse` en api-client.ts
#[derive(Debug, Serialize)]
pub struct AuthResponsePayload {
    // El JWT propio de la aplicación (para la sesión de React)
    pub app_jwt: String, 
    // Datos del usuario (de su DB), que UserContext necesita
    pub user: LoggedInUser, 
    // Permisos necesarios para el MainLayout (ej. ["DASHBOARD_VIEW", "ADMIN_PANEL"])
    pub permissions: Vec<String>, 
}

