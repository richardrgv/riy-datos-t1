// backend/middleware/auth_middleware.rs
/*
La forma más robusta de hacer esto en Actix-Web es con un middleware. E
ste middleware se ejecutará antes de cada handler (como addUser o updateUser) y se encargará de:
1. Leer el token de la cabecera Authorization.
2. Verificar el token usando tu clave secreta.
3. Extraer el nombre de usuario (o ID) de los claims del token.
4. Poner esa identidad del usuario en el objeto de la solicitud para que el handler pueda acceder a ella.
*/
use actix_web::{dev::ServiceRequest, dev::ServiceResponse, Error, HttpResponse, web};
use futures_util::future::{FutureExt, LocalBoxFuture};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

// Definimos la estructura de los claims, igual que en el login
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // El usuario que usaremos para el campo 'autor'
    pub permissions: Vec<String>,
    pub exp: u64,
}

const JWT_SECRET: &str = "YOUR_SUPER_SECRET_KEY";

pub struct Authenticated;

impl<S, B> actix_web::dev::Transform<S, ServiceRequest> for Authenticated
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthenticatedMiddleware<S>;
    type Future = LocalBoxFuture<'static, Result<Self::Transform, Self::InitError>>;

    fn new_transform(service: S) -> Self::Future {
        async move { Ok(AuthenticatedMiddleware { service }) }.boxed_local()
    }
}

pub struct AuthenticatedMiddleware<S> {
    service: S,
}

impl<S, B> actix_web::dev::Service<ServiceRequest> for AuthenticatedMiddleware<S>
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let auth_header = req.headers().get("Authorization").and_then(|h| h.to_str().ok());
        let token = auth_header.and_then(|h| h.strip_prefix("Bearer ").map(|s| s.trim()));

        let mut req = req; // Hacemos la solicitud mutable para poder modificarla

        if let Some(token) = token {
            let validation = Validation::new(jsonwebtoken::Algorithm::default());
            match decode::<Claims>(&token, &DecodingKey::from_secret(JWT_SECRET.as_bytes()), &validation) {
                Ok(token_data) => {
                    // Si el token es válido, extraemos el 'sub' (el nombre de usuario)
                    // y lo agregamos al estado de la solicitud para usarlo después.
                    req.extensions_mut().insert(token_data.claims);
                },
                Err(_) => {
                    return Box::pin(async { Ok(req.into_response(HttpResponse::Unauthorized().body("Token inválido"))) });
                }
            }
        } else {
            return Box::pin(async { Ok(req.into_response(HttpResponse::Unauthorized().body("Token faltante"))) });
        }

        self.service.call(req).boxed_local()
    }
}