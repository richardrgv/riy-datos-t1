// backend/middleware/auth_middleware.rs
/*
La forma más robusta de hacer esto en Actix-Web es con un middleware. E
ste middleware se ejecutará antes de cada handler (como addUser o updateUser) y se encargará de:
1. Leer el token de la cabecera Authorization.
2. Verificar el token usando tu clave secreta.
3. Extraer el nombre de usuario (o ID) de los claims del token.
4. Poner esa identidad del usuario en el objeto de la solicitud para que el handler pueda acceder a ella.
*/

// In your src/shared/middleware/auth_middleware.rs
use crate::state::AppState;


use actix_web::{
    body::BoxBody,
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    http::header,
    web, Error, HttpResponse,
    HttpMessage,
};
use futures_util::{
    future::{self, LocalBoxFuture, Ready},
    FutureExt,
};
use std::{rc::Rc, task::Poll};


use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::middleware::auth_claims::Claims;



pub struct Authenticated;

impl<S> Transform<S, ServiceRequest> for Authenticated
where
    S: Service<ServiceRequest, Response = ServiceResponse<BoxBody>, Error = Error> + 'static,
    S::Future: 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthenticatedMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        future::ok(AuthenticatedMiddleware {
            service: Rc::new(service),
        })
    }
}

pub struct AuthenticatedMiddleware<S> {
    service: Rc<S>,
}

impl<S> Service<ServiceRequest> for AuthenticatedMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<BoxBody>, Error = Error> + 'static,
    S::Future: 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut std::task::Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        println!("Middleware: Starting authentication process for {}", req.uri());

        let secret = match req.app_data::<web::Data<AppState>>() {
            Some(state) => state.jwt_secret.clone(),
            None => {
                let (req_parts, _pl) = req.into_parts();
                let res = HttpResponse::InternalServerError().finish().map_into_boxed_body();
                return future::ready(Ok(ServiceResponse::new(req_parts, res))).boxed_local();
            }
        };

        let auth_header_option = req.headers().get(header::AUTHORIZATION).cloned();

        let token_data = auth_header_option.and_then(|auth_header| {
            let auth_str = auth_header.to_str().ok()?;
            if auth_str.starts_with("Bearer ") {
                let token = auth_str.trim_start_matches("Bearer ");
                let decoding_key = DecodingKey::from_secret(secret.as_ref());
                let validation = Validation::default();
                decode::<Claims>(&token, &decoding_key, &validation).ok()
            } else {
                None
            }
        });

        let svc = self.service.clone();
        
        // Deconstruct the request into its parts so we can modify it
        let (mut http_req, pl) = req.into_parts();

        if let Some(token) = token_data {
            println!("Middleware: Token is valid. Attaching claims to request extensions.");
            
            http_req.extensions_mut().insert(token.claims.clone());

            let updated_req = ServiceRequest::from_parts(http_req, pl);
            
            Box::pin(async move {
                let res = svc.call(updated_req).await?;
                println!("Middleware: Request handled successfully.");
                Ok(res.map_into_boxed_body())
            })
        } else {
            println!("Middleware: Authorization failed. Returning 401.");
            let res = HttpResponse::Unauthorized().finish().map_into_boxed_body();
            let final_req = ServiceRequest::from_parts(http_req, pl);
            Box::pin(future::ready(Ok(ServiceResponse::new(final_req.into_parts().0, res))))
        }
    }
}

