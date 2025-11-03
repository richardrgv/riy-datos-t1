// src-tauri/src/shared/user_repository.rs

use sqlx::{Pool, Mssql}; //, FromRow};
use sqlx::query; // 👈 Asegúrate de que esta línea esté presente
use anyhow::Result;
use crate::models::{LoggedInUser}; 

pub type DbPool = Pool<Mssql>;

// 1. BUSCAR USUARIO POR CORREO (SELECT)
pub async fn get_user_by_email(
    pool: &DbPool, 
    email: &str,
    sql_collate_clause: &str
) -> Result<LoggedInUser, anyhow::Error> {
    let sql_collate_clause_ref = sql_collate_clause;
    let sql_query = format!(
        r#"
        SELECT 
          usuarioID as usuario_id
        , usuario {0} as usuario
        , nombre {0} as nombre
        , correo {0} as correo
        FROM riy.riy_usuario WITH(NOLOCK)
        WHERE correo = @p1 {0}
        "#,
        sql_collate_clause_ref
    );
    eprintln!("SQL Query (get_user_by_email): {}", sql_query);

    // 2. Usar la FUNCIÓN sqlx::query_as (en lugar de la macro sqlx::query_as!)
    //    y especificar el tipo de BD y el tipo de retorno (LoggedInUser).
    let result = sqlx::query_as::<sqlx::Mssql, LoggedInUser>(&sql_query)
        // 🚨 Usar .bind() para enlazar el parámetro @p1
        .bind(email)
        .fetch_one(pool)
        .await; 

    // 3. Manejar el resultado (RowNotFound, etc.)
    match result {
        Ok(user) => Ok(user),
        // 🚨 CASO CRÍTICO: Si no se encuentra, devolvemos un error descriptivo.
        Err(sqlx::Error::RowNotFound) => {
            Err(anyhow::anyhow!("Usuario con email {} no encontrado.", email)) 
        }
        // 🚨 Si es cualquier otro error (conexión, etc.), lo devolvemos para un manejo de 500
        Err(e) => Err(e.into()), 
    }
  
}

// 2. CREAR O VINCULAR LA IDENTIDAD (INSERT / UPDATE)
pub async fn create_or_update_user(
    pool: &DbPool, 
    user: &mut LoggedInUser, 
    provider: &str, 
    unique_id: &str
) -> Result<i32, anyhow::Error> {
    // ... (Implementación de INSERT y UPDATE con SQL Server OUTPUT INSERTED.usuarioID)
    if user.usuario_id == 0 {
        // Lógica de Creación:
        let inserted_id = sqlx::query!(
            r#"
            INSERT INTO riy.riy_usuario (usuario, nombre, correo, external_provider, external_id)
            OUTPUT INSERTED.usuarioID 
            VALUES (@p1, @p2, @p3, @p4, @p5)
            "#,
            user.usuario, user.nombre, user.correo, provider, unique_id
        )
        .fetch_one(pool)
        .await?
        .usuarioID;

        user.usuario_id = inserted_id; 
        Ok(inserted_id)
        
    } else {
        // Lógica de Actualización:
        let query_string = r#"
            UPDATE riy.riy_usuario
            -- 🚨 CORRECCIÓN: Usar @p1, @p2, @p3 para coincidir con .bind()
            SET external_provider = @p1, external_id = @p2
            WHERE UsuarioID = @p3 
        "#;

        // Nota: Asegúrate de importar `sqlx::query` o usar `sqlx::query(...)`
        sqlx::query(query_string) 
            // 🚨 El orden de .bind() debe coincidir con el orden de @p1, @p2, @p3 🚨
            .bind(provider)          // @p1
            .bind(unique_id)         // @p2
            .bind(user.usuario_id)   // @p3
            .execute(pool) 
            .await?;
              
        Ok(user.usuario_id)
    }
}