use log::{error, trace, warn};
use percent_encoding::percent_decode_str;
use reqwest::{header::HeaderMap, header::HeaderName, header::HeaderValue, Client, Method};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::LazyLock;
use tauri::command;

const REDACTED_QUERY_PARAMS: &[&str] = &[
    "api_key",
    "api-key",
    "apikey",
    "api_sig",
    "api-sig",
    "apisig",
    "token",
    "access_token",
    "refresh_token",
    "auth_token",
    "secret",
    "password",
    "passwd",
    "sig",
    "signature",
];

static HTTP_CLIENT: LazyLock<Client> = LazyLock::new(Client::new);

fn is_sensitive_param(name: &str) -> bool {
    let decoded = percent_decode_str(name).decode_utf8_lossy();
    let lower = decoded.to_lowercase();
    REDACTED_QUERY_PARAMS.contains(&lower.as_str())
}

fn redact_url(url: &str) -> String {
    let Some(query_start) = url.find('?') else {
        return url.to_string();
    };

    let (base, query_with_marker) = url.split_at(query_start);
    let query = &query_with_marker[1..];

    if query.is_empty() {
        return url.to_string();
    }

    let redacted_params: Vec<String> = query
        .split('&')
        .map(|param| {
            if let Some(eq_pos) = param.find('=') {
                let (name, _) = param.split_at(eq_pos);
                if is_sensitive_param(name) {
                    format!("{}=[REDACTED]", name)
                } else {
                    param.to_string()
                }
            } else {
                param.to_string()
            }
        })
        .collect();

    format!("{}?{}", base, redacted_params.join("&"))
}

#[derive(Debug, Deserialize, specta::Type)]
pub struct HttpRequest {
    url: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

#[derive(Debug, Serialize, specta::Type)]
pub struct HttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

#[command]
#[specta::specta]
pub async fn http_fetch(request: HttpRequest) -> Result<HttpResponse, String> {
    let method = request
        .method
        .as_ref()
        .and_then(|m| Method::from_str(m).ok())
        .unwrap_or(Method::GET);

    let method_str = method.to_string();

    let mut req_builder = HTTP_CLIENT.request(method, &request.url);

    if let Some(ref headers) = request.headers {
        let mut header_map = HeaderMap::new();
        for (key, value) in headers {
            if let (Ok(name), Ok(val)) = (HeaderName::from_str(key), HeaderValue::from_str(value)) {
                header_map.insert(name, val);
            }
        }
        req_builder = req_builder.headers(header_map);
    }

    if let Some(ref body) = request.body {
        req_builder = req_builder.body(body.clone());
    }

    let redacted_url = redact_url(&request.url);
    let response = req_builder.send().await.map_err(|e| {
        error!(target: "http", "{} {} failed: {}", method_str, redacted_url, e);
        format!("HTTP request failed: {}", e)
    })?;

    let status = response.status().as_u16();

    let headers: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let body = response.text().await.map_err(|e| {
        error!(target: "http", "{} {} failed to read body: {}", method_str, redacted_url, e);
        format!("Failed to read response body: {}", e)
    })?;

    match status {
        500..=599 => {
            error!(
                target: "http",
                "{} {} -> {}",
                method_str, redacted_url, status
            );
        }
        400..=499 => {
            warn!(
                target: "http",
                "{} {} -> {}",
                method_str, redacted_url, status
            );
        }
        _ => {
            trace!(
                target: "http",
                "{} {} -> {}",
                method_str, redacted_url, status
            );
        }
    }

    Ok(HttpResponse {
        status,
        headers,
        body,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    mod redact_url {
        use super::*;

        #[test]
        fn redacts_api_key_param() {
            let url = "https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=cher&api_key=abc123&format=json";
            let redacted = redact_url(url);
            assert_eq!(
                redacted,
                "https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=cher&api_key=[REDACTED]&format=json"
            );
        }

        #[test]
        fn redacts_multiple_sensitive_params() {
            let url = "https://api.example.com?api_key=key123&secret=shhh&query=music&token=tok456";
            let redacted = redact_url(url);
            assert_eq!(
                redacted,
                "https://api.example.com?api_key=[REDACTED]&secret=[REDACTED]&query=music&token=[REDACTED]"
            );
        }

        #[test]
        fn is_case_insensitive() {
            let url = "https://api.example.com?API_KEY=key123&Token=tok&SECRET=shh";
            let redacted = redact_url(url);
            assert_eq!(
                redacted,
                "https://api.example.com?API_KEY=[REDACTED]&Token=[REDACTED]&SECRET=[REDACTED]"
            );
        }

        #[test]
        fn preserves_safe_params() {
            let url = "https://api.example.com/search?query=hello&limit=10&offset=0";
            let redacted = redact_url(url);
            assert_eq!(
                redacted,
                "https://api.example.com/search?query=hello&limit=10&offset=0"
            );
        }

        #[test]
        fn handles_url_without_query_params() {
            let url = "https://api.example.com/users/123";
            let redacted = redact_url(url);
            assert_eq!(redacted, "https://api.example.com/users/123");
        }

        #[test]
        fn handles_malformed_url_gracefully() {
            let url = "not a valid url";
            let redacted = redact_url(url);
            assert_eq!(redacted, "not a valid url");
        }

        #[test]
        fn redacts_url_encoded_param_names() {
            // api%5Fkey is URL-encoded api_key
            let url = "https://api.example.com?api%5Fkey=secret123&query=test";
            let redacted = redact_url(url);
            assert_eq!(
                redacted,
                "https://api.example.com?api%5Fkey=[REDACTED]&query=test"
            );
        }
    }
}
