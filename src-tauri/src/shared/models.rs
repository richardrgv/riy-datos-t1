// src-tauri/src/shared/models.rs

use serde::{Serialize, Deserialize};
use sqlx::FromRow;

/// Estructura para los claims de un JWT emitido por la aplicación.
/// Contiene la información mínima necesaria para identificar al usuario en el backend.
#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    /// Sujeto (Subject): ID del usuario como String.
    pub sub: String,
    /// Emisor (Issuer)
    pub iss: String,
    /// Tiempo de expiración (Expiration Time)
    pub exp: usize,
    /// Emitido en (Issued At)
    pub iat: usize,
    /// ID del usuario (específico de la aplicación)
    pub usuario_id: i32,
}

/// Define el tipo de autenticación solicitada por el cliente.
#[derive(Debug, serde::Deserialize, Clone)] // <--- CLONE AÑADIDO AQUÍ
pub enum LoginType {
    /// Autenticación usando Microsoft Azure AD (MSAL).
    MsftMsal,
    /// Autenticación contra la base de datos de un sistema ERP.
    Erp,
    /// Autenticación contra la tabla de usuarios local (e.g., para administradores).
    Local,
}

// --- Modelos de persistencia ---

/// Estructura para representar un usuario almacenado en la DB local (riy.riy_usuario).
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Usuario {
    pub usuario_id: i32,
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
    pub estado: String,
    pub autor: String,
    pub fecha_creacion: String, // Usar un tipo de dato de fecha/hora más preciso (e.g., NaiveDateTime) si no es String
    pub modificado_por: Option<String>,
    pub fecha_modificacion: Option<String>, // Usar un tipo de dato de fecha/hora más preciso
    pub codigo_verificacion: Option<i32>,
    pub fecha_codigo_verificacion: Option<String>, // Usar un tipo de dato de fecha/hora más preciso
}

/// Estructura para crear un nuevo usuario (sin el ID).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewUsuario {
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
    pub estado: String,
    pub autor: String,
    pub fecha_creacion: String, // Usar un tipo de dato de fecha/hora más preciso
}

/// Estructura para el resultado de búsqueda en el ERP.
#[derive(serde::Serialize, serde::Deserialize, Debug, FromRow)]
pub struct UserSearchResult {
    pub usuario: String,
    pub nombre: Option<String>, 
}

/// Estructura para la actualización parcial de un usuario desde el frontend.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsuarioActualizable {
    pub correo: String,
    pub estado: String,
}

// --- Modelos de Autenticación y Sesión ---

/// Estructura de usuario completa usada en el contexto de la aplicación después del login.
/// Es el tipo que se almacena en el `UserContext` de React.
#[derive(Debug, Clone, Deserialize, Serialize, FromRow)] 
pub struct LoggedInUser {
    #[serde(rename = "usuarioID")] // Mapeo del campo de la DB o API
    pub usuario_id: Option<i32>,
    pub usuario: Option<String>,
    pub nombre: Option<String>,
    pub correo: Option<String>,
    // Nota: Aunque no estaba en tu struct original, es necesario para el flujo de autenticación
    #[serde(default)] 
    pub roles: Vec<String>, 
}

/// Estructura de usuario más simple, para el flujo de inserción/lógica interna.
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct User {
    pub usuario_id: Option<i32>,
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
}

/// Estructura para la solicitud de autenticación (Input) unificada:
/// Soporta token externo (MSAL/Google) o credenciales de ERP.
#[derive(Debug, Deserialize, Clone)]
pub struct AuthRequestPayload {
    /// Tipo de login: MsftMsal, Erp, o Local.
    pub login_type: LoginType,
    /// Nombre de usuario (utilizado para Erp y Local).
    pub username: Option<String>,
    /// Contraseña (utilizada para Erp y Local).
    pub password: Option<String>,
    /// Token ID o cualquier otra prueba de identidad (utilizado para MsftMsal).
    pub proof_of_identity: String,
    /// URI necesaria para el intercambio de código (solo para Google)
    pub redirect_uri: Option<String>, // Lo hacemos opcional ya que no siempre es necesario
    
}

/// Estructura para la respuesta de autenticación (Output) que se envía al frontend.
#[derive(Debug, Serialize, Clone)]
pub struct AuthResponsePayload {
    /// El JWT propio de la aplicación (para la sesión de React).
    #[serde(rename = "appJWT")]
    pub app_jwt: String, 
    /// Datos del usuario (de su DB), que UserContext necesita.
    pub user: LoggedInUser, 
    /// Permisos necesarios para el MainLayout (ej. ["DASHBOARD_VIEW", "ADMIN_PANEL"]).
    pub permissions: Vec<String>, 
}

// --- Modelos de JWT y Proveedores de Identidad ---

/// Estructura para claims de JWT de MSAL (Ejemplo).
#[derive(Debug, Deserialize, Serialize)]
pub struct MsalClaims {
    /// User Principal Name (a menudo el correo/usuario).
    pub upn: String,
    /// Audience (para validación de jwt-auth).
    pub aud: String,
    /// Expiration time (para validación de jwt-auth).
    pub exp: i64,
    // Puedes añadir otros campos comunes si los usas:
    // pub name: String,
}


/// Información del usuario extraída de una fuente de autenticación (MSAL, ERP, Local).
/// Esta estructura se usa para sincronizar o buscar el usuario en la DB local.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserInfo {
    pub username: String, // Clave principal de identificación
    pub email: String,
    pub name: Option<String>,
    // Podríamos añadir más datos como roles si la fuente externa los proporciona.
}

/// Estructura para la ASIGNACIÓN DE ROL ESPECÍFICA DE LA APLICACIÓN.
#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct UserRoleAssignment {
    pub rol: String,
    #[sqlx(rename = "subRol")] 
    pub sub_rol: String, 
}

