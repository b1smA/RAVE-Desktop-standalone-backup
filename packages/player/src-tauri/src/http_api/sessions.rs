use std::{
    collections::HashMap,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::sync::RwLock;
use uuid::Uuid;

use super::routes::AppState;

const MAX_ACTIVITY_ITEMS: usize = 100;

#[derive(Clone, Debug, Deserialize, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionPermissions {
    pub can_add_tracks: bool,
    pub can_vote: bool,
    pub can_control_playback: bool,
    pub can_manage_queue: bool,
}

#[derive(Clone, Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionConfig {
    pub enabled: bool,
    pub permissions: SessionPermissions,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Participant {
    pub id: String,
    pub name: String,
    pub joined_at: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityItem {
    pub id: String,
    pub participant_name: String,
    pub action: String,
    pub created_at: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub active: bool,
    pub permissions: SessionPermissions,
    pub participants: Vec<Participant>,
    pub votes: HashMap<String, i32>,
    pub activity: Vec<ActivityItem>,
}

#[derive(Clone)]
pub struct SessionManager(Arc<RwLock<SessionState>>);

struct SessionState {
    enabled: bool,
    pairing_code: String,
    permissions: SessionPermissions,
    participants: HashMap<String, Participant>,
    tokens: HashMap<String, String>,
    votes: HashMap<String, HashMap<String, i8>>,
    activity: Vec<ActivityItem>,
}

#[derive(Deserialize)]
pub struct JoinBody {
    name: String,
    code: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoteBody {
    item_id: String,
    value: i8,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinResult {
    token: String,
    participant: Participant,
    session: SessionSnapshot,
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

impl SessionManager {
    pub fn new(config: SessionConfig) -> Self {
        let code_value = Uuid::new_v4().as_u128() % 1_000_000;
        Self(Arc::new(RwLock::new(SessionState {
            enabled: config.enabled,
            pairing_code: format!("{code_value:06}"),
            permissions: config.permissions,
            participants: HashMap::new(),
            tokens: HashMap::new(),
            votes: HashMap::new(),
            activity: Vec::new(),
        })))
    }

    pub async fn pairing_code(&self) -> Option<String> {
        let state = self.0.read().await;
        state.enabled.then(|| state.pairing_code.clone())
    }

    async fn snapshot(&self) -> SessionSnapshot {
        let state = self.0.read().await;
        let votes = state
            .votes
            .iter()
            .map(|(item_id, votes)| {
                (
                    item_id.clone(),
                    votes.values().map(|value| i32::from(*value)).sum(),
                )
            })
            .collect();
        SessionSnapshot {
            active: state.enabled,
            permissions: state.permissions.clone(),
            participants: state.participants.values().cloned().collect(),
            votes,
            activity: state.activity.iter().rev().cloned().collect(),
        }
    }

    async fn participant_for_token(&self, token: &str) -> Option<Participant> {
        let state = self.0.read().await;
        state
            .tokens
            .get(token)
            .and_then(|id| state.participants.get(id))
            .cloned()
    }

    async fn join(&self, name: String, code: String) -> Result<JoinResult, StatusCode> {
        let clean_name = name.trim();
        if clean_name.is_empty() || clean_name.chars().count() > 40 {
            return Err(StatusCode::BAD_REQUEST);
        }
        let mut state = self.0.write().await;
        if !state.enabled || code != state.pairing_code {
            return Err(StatusCode::UNAUTHORIZED);
        }
        let participant = Participant {
            id: Uuid::new_v4().to_string(),
            name: clean_name.to_owned(),
            joined_at: now(),
        };
        let token = Uuid::new_v4().to_string();
        state.tokens.insert(token.clone(), participant.id.clone());
        state
            .participants
            .insert(participant.id.clone(), participant.clone());
        push_activity(&mut state, participant.name.clone(), "joined".into());
        drop(state);
        Ok(JoinResult {
            token,
            participant,
            session: self.snapshot().await,
        })
    }

    async fn vote(
        &self,
        participant: &Participant,
        body: VoteBody,
    ) -> Result<SessionSnapshot, StatusCode> {
        if ![-1, 0, 1].contains(&body.value) {
            return Err(StatusCode::BAD_REQUEST);
        }
        let mut state = self.0.write().await;
        if !state.permissions.can_vote {
            return Err(StatusCode::FORBIDDEN);
        }
        let votes = state.votes.entry(body.item_id.clone()).or_default();
        if body.value == 0 {
            votes.remove(&participant.id);
        } else {
            votes.insert(participant.id.clone(), body.value);
        }
        push_activity(
            &mut state,
            participant.name.clone(),
            format!("voted:{}:{}", body.item_id, body.value),
        );
        drop(state);
        Ok(self.snapshot().await)
    }
}

fn push_activity(state: &mut SessionState, participant_name: String, action: String) {
    state.activity.push(ActivityItem {
        id: Uuid::new_v4().to_string(),
        participant_name,
        action,
        created_at: now(),
    });
    if state.activity.len() > MAX_ACTIVITY_ITEMS {
        state.activity.remove(0);
    }
}

fn request_token(request: &Request) -> Option<String> {
    if let Some(token) = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
    {
        return Some(token.to_owned());
    }
    request
        .uri()
        .query()?
        .split('&')
        .find_map(|pair| pair.strip_prefix("token="))
        .map(str::to_owned)
}

pub async fn status(State(state): State<AppState>) -> Json<Value> {
    let manager = state.sessions;
    let state = manager.0.read().await;
    Json(json!({ "active": state.enabled, "requiresPairing": state.enabled }))
}

pub async fn join(
    State(state): State<AppState>,
    Json(body): Json<JoinBody>,
) -> Result<Json<JoinResult>, StatusCode> {
    let manager = state.sessions;
    manager.join(body.name, body.code).await.map(Json)
}

pub async fn snapshot(
    State(state): State<AppState>,
    request: Request,
) -> Result<Json<SessionSnapshot>, StatusCode> {
    let manager = state.sessions;
    let token = request_token(&request).ok_or(StatusCode::UNAUTHORIZED)?;
    manager
        .participant_for_token(&token)
        .await
        .ok_or(StatusCode::UNAUTHORIZED)?;
    Ok(Json(manager.snapshot().await))
}

pub async fn vote(
    State(state): State<AppState>,
    request: Request,
) -> Result<Json<SessionSnapshot>, StatusCode> {
    let manager = state.sessions.clone();
    let token = request_token(&request).ok_or(StatusCode::UNAUTHORIZED)?;
    let participant = manager
        .participant_for_token(&token)
        .await
        .ok_or(StatusCode::UNAUTHORIZED)?;
    let body = axum::body::to_bytes(request.into_body(), 16_384)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    let vote = serde_json::from_slice::<VoteBody>(&body).map_err(|_| StatusCode::BAD_REQUEST)?;
    let snapshot = manager.vote(&participant, vote).await?;
    reorder_queue_by_votes(&state, &snapshot).await;
    Ok(Json(snapshot))
}

async fn reorder_queue_by_votes(state: &AppState, snapshot: &SessionSnapshot) {
    let Ok(queue) = state.bridge.call("Queue.getQueue", json!({})).await else {
        return;
    };
    let current_index = queue
        .get("currentIndex")
        .and_then(Value::as_u64)
        .unwrap_or(0) as usize;
    let Some(items) = queue.get("items").and_then(Value::as_array) else {
        return;
    };
    let mut order = items
        .iter()
        .filter_map(|item| item.get("id").and_then(Value::as_str).map(str::to_owned))
        .collect::<Vec<_>>();
    let pending_start = current_index.saturating_add(1).min(order.len());
    let mut desired = order[pending_start..].to_vec();
    desired.sort_by_key(|item_id| {
        std::cmp::Reverse(snapshot.votes.get(item_id).copied().unwrap_or(0))
    });
    for (offset, item_id) in desired.iter().enumerate() {
        let target_index = pending_start + offset;
        let Some(source_index) = order.iter().position(|candidate| candidate == item_id) else {
            continue;
        };
        if source_index == target_index {
            continue;
        }
        if state
            .bridge
            .call(
                "Queue.reorder",
                json!({ "fromIndex": source_index, "toIndex": target_index }),
            )
            .await
            .is_ok()
        {
            let moved = order.remove(source_index);
            order.insert(target_index, moved);
        }
    }
}

pub async fn authorize(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let manager = state.sessions;
    let enabled = manager.0.read().await.enabled;
    if !enabled {
        return next.run(request).await;
    }
    let participant = match request_token(&request) {
        Some(token) => manager.participant_for_token(&token).await,
        None => None,
    };
    let Some(participant) = participant else {
        return StatusCode::UNAUTHORIZED.into_response();
    };
    let path = request.uri().path().to_owned();
    let method = request.method().clone();
    let permissions = manager.0.read().await.permissions.clone();
    let allowed = method == Method::GET
        || path == "/api/search"
        || (path == "/api/queue/add" && permissions.can_add_tracks)
        || (path.starts_with("/api/playback/") && permissions.can_control_playback)
        || (path.starts_with("/api/queue/") && permissions.can_manage_queue);
    if !allowed {
        return StatusCode::FORBIDDEN.into_response();
    }
    let response = next.run(request).await;
    if response.status().is_success() && method != Method::GET {
        let mut state = manager.0.write().await;
        push_activity(&mut state, participant.name, path);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manager() -> SessionManager {
        SessionManager::new(SessionConfig {
            enabled: true,
            permissions: SessionPermissions {
                can_add_tracks: true,
                can_vote: true,
                can_control_playback: false,
                can_manage_queue: false,
            },
        })
    }

    #[tokio::test]
    async fn requires_correct_pairing_code() {
        let manager = manager();
        assert_eq!(
            manager
                .join("Guest".into(), "000000".into())
                .await
                .unwrap_err(),
            StatusCode::UNAUTHORIZED
        );
        let code = manager.pairing_code().await.unwrap();
        assert!(manager.join("Guest".into(), code).await.is_ok());
    }

    #[tokio::test]
    async fn keeps_one_vote_per_participant() {
        let manager = manager();
        let code = manager.pairing_code().await.unwrap();
        let joined = manager.join("Guest".into(), code).await.unwrap();
        manager
            .vote(
                &joined.participant,
                VoteBody {
                    item_id: "track".into(),
                    value: 1,
                },
            )
            .await
            .unwrap();
        let snapshot = manager
            .vote(
                &joined.participant,
                VoteBody {
                    item_id: "track".into(),
                    value: -1,
                },
            )
            .await
            .unwrap();
        assert_eq!(snapshot.votes.get("track"), Some(&-1));
    }
}
