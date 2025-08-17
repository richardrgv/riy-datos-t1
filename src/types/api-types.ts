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

// La interfaz de TypeScript debe coincidir con el struct de Rust
export interface LoggedInUser {
    usuario: string;
    nombre: string;
    // ... otros campos
}

// Tipo para la respuesta completa del login del backend
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