// src/types/user.ts
// Asegúrate de que esta interfaz se encuentra en tu archivo `user.ts` junto a la interfaz 'Usuario'

export interface UserSearchResult {
  usuario: string;
  nombre: string;
}

// La interfaz de TypeScript debe coincidir con el struct de Rust
export interface LoggedInUser {
    usuario: string;
    nombre: string;
    // ... otros campos
}