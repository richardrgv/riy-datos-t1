// shared/middelware/auth_claims.rs

use actix_web::{
    error::ErrorUnauthorized,
    FromRequest, HttpRequest,
    HttpMessage,
    dev::Payload,
};
use futures_util::future::{self, Ready};

use serde::{Serialize, Deserialize};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub permissions: Vec<String>,
    pub exp: u64,
}

impl FromRequest for Claims {
    type Error = actix_web::Error;
    type Future = Ready<Result<Claims, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut Payload) -> Self::Future {
        let claims = req
            .extensions()
            .get::<Claims>()
            .cloned()
            .ok_or_else(|| ErrorUnauthorized("Unauthorized"));

        future::ready(claims)
    }
}