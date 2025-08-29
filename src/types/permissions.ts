// src/types/permissions.ts

// Define un enum con todas las claves de permiso de la aplicación
export enum PermissionKey {
  // Permisos de alto nivel para secciones enteras
  AdminUsuariosGeneral = 'administrar_usuarios',
  AdminMenus = 'administrar_menus',
  //VerDashboard = 'ver_dashboard',


  // Permisos para funcionalidades específicas

  //ListaMenus = 'lista_menus',

  ListaUsuarios = 'lista_usuarios',
  ListaModulos = 'lista_modulos',
  ListaRoles = 'lista_roles',
  /*CrearUsuario = 'crear_usuario',
  EditarUsuario = 'editar_usuario',
  EliminarUsuario = 'eliminar_usuario',*/
  
  // Agrega aquí más permisos a medida que los definas
}