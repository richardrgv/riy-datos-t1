// src-tauri/src/shared/config.rs

/**
 * Estructura para contener la configuración de la aplicación
 * (ej. claves secretas, URLs de servicios, flags de entorno).
 * * Esta estructura se debe inicializar en el `main.rs` de tu binario
 * y pasarse a través del estado de Tauri o Axum.
 */
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// Clave secreta utilizada para firmar los JWT de sesión internos de la aplicación.
    pub app_jwt_secret: String,
    
    // CAMPOS AÑADIDOS para la lógica de autenticación y base de datos
    /// URL para obtener las claves JWKS de MSAL/Azure AD.
    pub msal_jwks_url: String, 
    /// ID del cliente (Audience) de MSAL/Azure AD.
    pub msal_client_id: String,
    /// Cláusula de colación de SQL Server para búsquedas sensibles a mayúsculas/minúsculas.
    pub sql_collate_clause: String,
}

impl AppConfig {
    /// Función de utilidad para crear una configuración de prueba o default.
    /// ⚠️ NOTA: En una aplicación real, esta configuración se cargaría 
    /// desde variables de entorno o un archivo de configuración.
    pub fn new_default() -> Self {
        AppConfig {
            app_jwt_secret: "clave_secreta_de_ejemplo_debe_ser_larga_y_fuerte".to_string(),
            // Valores por defecto para que la lógica de autenticación compile:
            msal_jwks_url: "https://ejemplo.microsoft.com/.well-known/openid-configuration/jwks".to_string(),
            msal_client_id: "client-id-msal-ejemplo".to_string(),
            sql_collate_clause: "COLLATE SQL_Latin1_General_CP1_CI_AS".to_string(),
        }
    }
}