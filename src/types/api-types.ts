// src/types/api-types.ts

// Tipo para las credenciales que se envían al backend
export interface UserCredentials {
  usuario: string;
  password: string;
}

// Tipo para el objeto de usuario (sin contraseña)
export interface User {
  usuario: string;
  nombre: string;
  correo: string;
}


// 🚨 MODIFICADO: Interfaz que el backend de Rust devolverá tras la autenticación.
// Incluye campos necesarios para la lógica de negocio (id y role).
export interface LoggedInUser {
    // CRÍTICO: Mapea a 'usuario_id' de Rust, pero lo enviaremos como 'usuarioID' o 'usuario_id'
    // Asumimos que la serialización de Rust lo envía como 'usuario_id' (snake_case)
    usuario_id: number;

    // ✅ Coincide con el campo `pub usuario: String` de Rust
    usuario: string; 
    // ✅ Coincide con el campo `pub nombre: String` de Rust
    nombre: string; 
    // ✅ Coincide con el campo `pub correo: String` de Rust (se elimina el '?:')
    correo: string; 
    // ... otros campos que necesite
}
    // ... otros campos que necesite

// 🚨 Interfaz de la respuesta completa del backend (AuthResponsePayload de Rust)
export interface AuthResponse {
    user: LoggedInUser;
    // La lista de permisos (ej: "dashboard", "users_module")
    permissions: string[]; 
    // El JWT de sesión que se guardará en el almacenamiento local
    token: string;
}
// 🚨 EL CONTRATO OFICIAL (Coincide con AuthResponsePayload de Rust)

//Tipo para la respuesta completa del login del backend
export interface LoginResponse {
  token: string;
  user: User;
  permissions: string[]; // <-- ¡Agrega esta propiedad!
}


// Tipo para el resultado de la búsqueda de usuarios
export interface UserSearchResult {
  usuario: string;
  nombre: string;
}

// Tipo para el objeto de usuario completo con ID (para edición)
export interface Usuario {
  usuarioId: number;
  usuario: string;
  nombre: string;
  correo: string;
  estado: number;
  fechaCreacion: string;
}


// ------------------------------------------
// TIPOS DE AUTENTICACIÓN UNIFICADA (NUEVOS)
// ------------------------------------------

/**
 * Payload enviado por el frontend (api-client.ts) al endpoint de Rust 
 * para el proceso de intercambio de código/validación de token (3 flujos).
 */
export interface AuthRequestPayload {
    /** El código de OAuth (Google) O el Access Token (MSAL). */
    proof_of_identity: string; 
    /** Identificador: 'google', 'msal-corp', o 'msal-personal'. */
    provider: 'google' | 'msal-corp' | 'msal-personal'; 
    /** URI de redirección (solo necesaria para el intercambio de código de Google). */
    redirect_uri: string; 
}

/**
 * Respuesta que el backend de Rust debe devolver tras una autenticación exitosa.
 */
export interface AuthResponsePayload {
    /** El JWT de sesión propio de su aplicación (se almacena en el frontend). */
    app_jwt: string; 
    /** Datos del usuario (para el UserContext de React). */
    user: LoggedInUser; 
    /** Permisos necesarios para el MainLayout. */
    permissions: string[]; 
}