use base64::{
    engine::general_purpose::{STANDARD as BASE64, URL_SAFE_NO_PAD},
    Engine as _,
};
use dirs::{config_local_dir, data_local_dir};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const LICENSE_FILE_NAME: &str = "license.json";
const LICENSE_TOKEN_PREFIX: &str = "ros1";
const KEYGEN_SIGNING_PREFIX: &str = "key";
const PUBLIC_KEY_BASE64: &str = "CYSFepQ7jNM9kXTDmVUrfNhHCfhkNDVJ9PF19eLtGfE=";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LicenseClaims {
    pub license_id: String,
    pub tier: String,
    #[serde(default)]
    pub features: Vec<String>,
    #[serde(default)]
    pub issued_at: Value,
    #[serde(default)]
    pub expires_at: Value,
    #[serde(default)]
    pub customer_email: String,
    #[serde(default)]
    pub key_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredLicense {
    key: String,
    installed_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseState {
    pub status: String,
    pub tier: String,
    pub label: String,
    pub expires_at: String,
    pub issued_at: String,
    pub license_id: String,
    pub customer_email: String,
    pub features: Vec<String>,
    pub warning: String,
    pub last_validated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureCheck {
    pub feature_id: String,
    pub allowed: bool,
    pub tier: String,
    pub label: String,
    pub reason: String,
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn now_string() -> String {
    now_unix().to_string()
}

fn app_dir() -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("OSA_MIDNIGHT_OIL_DATA_DIR") {
        if !path.trim().is_empty() {
            return Ok(PathBuf::from(path));
        }
    }

    let base = data_local_dir()
        .or_else(config_local_dir)
        .ok_or_else(|| "no local app data directory available".to_string())?;
    Ok(base.join("osa-midnight-oil"))
}

fn license_path() -> Result<PathBuf, String> {
    Ok(app_dir()?.join(LICENSE_FILE_NAME))
}

fn ensure_app_dir() -> Result<(), String> {
    fs::create_dir_all(app_dir()?).map_err(|error| error.to_string())
}

fn value_to_string(value: &Value) -> String {
    match value {
        Value::String(inner) => inner.clone(),
        Value::Number(number) => number.to_string(),
        _ => String::new(),
    }
}

fn parse_unix_value(value: &Value) -> Option<u64> {
    match value {
        Value::Number(number) => number.as_u64(),
        Value::String(inner) => inner.parse::<u64>().ok(),
        _ => None,
    }
}

fn base_features() -> Vec<String> {
    vec![
        "core_cockpit",
        "encrypted_workspace",
        "manual_memory_capture",
        "basic_search",
        "command_memory_console",
        "core_modules",
    ]
    .into_iter()
    .map(String::from)
    .collect()
}

fn tier_features(tier: &str, claims_features: &[String]) -> Vec<String> {
    let mut features: HashSet<String> = base_features().into_iter().collect();

    let normalized = tier.trim().to_ascii_lowercase();
    if matches!(
        normalized.as_str(),
        "founder" | "founder-edition" | "pro" | "operator-pro" | "enterprise" | "developer"
    ) {
        features.extend(
            [
                "unlimited_projects",
                "full_module_access",
                "model_workspace",
                "security_model_v1",
                "advanced_backup_export",
                "fsociety_lan",
                "founder_badge",
            ]
            .into_iter()
            .map(String::from),
        );
    }

    if matches!(normalized.as_str(), "enterprise" | "developer") {
        features.extend(
            [
                "organization_panel",
                "linked_ros_nodes",
                "controller_node_teaming",
                "fleet_policy",
                "enterprise_branding",
            ]
            .into_iter()
            .map(String::from),
        );
    }

    if normalized == "developer" {
        features.insert("developer_mode".to_string());
        features.insert("all_features".to_string());
    }

    features.extend(
        claims_features
            .iter()
            .filter(|entry| !entry.trim().is_empty())
            .cloned(),
    );
    let mut sorted = features.into_iter().collect::<Vec<_>>();
    sorted.sort();
    sorted
}

fn tier_label(tier: &str) -> String {
    match tier.trim().to_ascii_lowercase().as_str() {
        "founder" | "founder-edition" => "Founder Edition".to_string(),
        "pro" | "operator-pro" => "Pro ROS".to_string(),
        "enterprise" => "Enterprise ROS".to_string(),
        "developer" => "Developer".to_string(),
        _ => "Individual ROS".to_string(),
    }
}

fn individual_state(status: &str, warning: &str) -> LicenseState {
    LicenseState {
        status: status.to_string(),
        tier: "individual".to_string(),
        label: "Individual ROS".to_string(),
        expires_at: String::new(),
        issued_at: String::new(),
        license_id: String::new(),
        customer_email: String::new(),
        features: base_features(),
        warning: warning.to_string(),
        last_validated_at: now_string(),
    }
}

#[cfg(debug_assertions)]
fn developer_bypass_state() -> LicenseState {
    LicenseState {
        status: "dev-bypass".to_string(),
        tier: "developer".to_string(),
        label: "Developer".to_string(),
        expires_at: String::new(),
        issued_at: String::new(),
        license_id: "debug-build-dev-bypass".to_string(),
        customer_email: String::new(),
        features: tier_features("developer", &[]),
        warning: "Development build: signed-license enforcement is bypassed. Remove or verify disabled before public release.".to_string(),
        last_validated_at: now_string(),
    }
}

fn normalize_keygen_claims(value: Value) -> Result<LicenseClaims, String> {
    if value.get("tier").is_some() || value.get("licenseId").is_some() {
        return serde_json::from_value::<LicenseClaims>(value)
            .map_err(|error| format!("Keygen license claims are invalid: {error}"));
    }

    let license = value.get("license").unwrap_or(&Value::Null);
    let user = value.get("user").unwrap_or(&Value::Null);
    let policy = value.get("policy").unwrap_or(&Value::Null);
    let license_id = license
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let tier = policy
        .get("metadata")
        .and_then(|metadata| metadata.get("tier"))
        .and_then(Value::as_str)
        .or_else(|| policy.get("name").and_then(Value::as_str))
        .unwrap_or_default()
        .to_string();
    let issued_at = license.get("created").cloned().unwrap_or(Value::Null);
    let expires_at = license
        .get("expiry")
        .cloned()
        .or_else(|| license.get("expires").cloned())
        .unwrap_or(Value::Null);
    let customer_email = user
        .get("email")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();

    Ok(LicenseClaims {
        license_id,
        tier,
        features: Vec::new(),
        issued_at,
        expires_at,
        customer_email,
        key_id: String::new(),
    })
}

fn decode_keygen_key(key: &str) -> Result<(Vec<u8>, Vec<u8>, LicenseClaims), String> {
    let trimmed = key.trim();
    let signing_prefix = format!("{KEYGEN_SIGNING_PREFIX}/");
    if !trimmed.starts_with(&signing_prefix) {
        return Err("not a Keygen signed key".to_string());
    }

    let Some((signing_data, signature_part)) = trimmed.rsplit_once('.') else {
        return Err("Keygen license key must use key/<payload>.<signature> format.".to_string());
    };
    let payload_part = signing_data
        .strip_prefix(&signing_prefix)
        .ok_or_else(|| "Keygen license key payload is missing.".to_string())?;
    let payload = URL_SAFE_NO_PAD
        .decode(payload_part)
        .map_err(|_| "Keygen license payload is not valid base64url.".to_string())?;
    let signature = URL_SAFE_NO_PAD
        .decode(signature_part)
        .map_err(|_| "Keygen license signature is not valid base64url.".to_string())?;
    let payload_value = serde_json::from_slice::<Value>(&payload)
        .map_err(|error| format!("Keygen license payload is invalid JSON: {error}"))?;
    let claims = normalize_keygen_claims(payload_value)?;

    Ok((signing_data.as_bytes().to_vec(), signature, claims))
}

fn decode_ros_key(key: &str) -> Result<(Vec<u8>, Vec<u8>, LicenseClaims), String> {
    let trimmed = key.trim();
    let parts = trimmed.split('.').collect::<Vec<_>>();

    if parts.len() != 3 || parts[0] != LICENSE_TOKEN_PREFIX {
        return Err("License key must use ros1.<payload>.<signature> format.".to_string());
    }

    let payload = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| "License payload is not valid base64url.".to_string())?;
    let signature = URL_SAFE_NO_PAD
        .decode(parts[2])
        .map_err(|_| "License signature is not valid base64url.".to_string())?;
    let claims = serde_json::from_slice::<LicenseClaims>(&payload)
        .map_err(|error| format!("License claims are invalid: {error}"))?;

    Ok((payload, signature, claims))
}

fn decode_key(key: &str) -> Result<(Vec<u8>, Vec<u8>, LicenseClaims), String> {
    decode_keygen_key(key).or_else(|keygen_error| {
        decode_ros_key(key).map_err(|ros_error| {
            format!(
                "License key is not a valid Keygen signed key ({keygen_error}) or ROS dev key ({ros_error})."
            )
        })
    })
}

fn verify_key(key: &str) -> Result<LicenseState, String> {
    let (payload, signature_bytes, claims) = decode_key(key)?;
    let public_key_bytes = BASE64
        .decode(PUBLIC_KEY_BASE64)
        .map_err(|_| "License public key is invalid.".to_string())?;
    let public_key_array: [u8; 32] = public_key_bytes
        .as_slice()
        .try_into()
        .map_err(|_| "License public key must be 32 bytes.".to_string())?;
    let verifying_key = VerifyingKey::from_bytes(&public_key_array)
        .map_err(|_| "License public key could not be loaded.".to_string())?;
    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|_| "License signature must be 64 bytes.".to_string())?;

    verifying_key
        .verify(&payload, &signature)
        .map_err(|_| "License signature is invalid.".to_string())?;

    let expires_at_unix = parse_unix_value(&claims.expires_at);
    let mut status = "valid".to_string();
    let mut warning = String::new();

    if let Some(expires_at) = expires_at_unix {
        let now = now_unix();
        if expires_at <= now {
            return Ok(individual_state(
                "expired",
                "License expired. Renew to unlock paid features.",
            ));
        }

        let days_remaining = (expires_at - now) / 86_400;
        if days_remaining <= 14 {
            warning = format!("License expires in {days_remaining} day(s). Renew soon to keep paid features active.");
        }
    } else if claims.expires_at != Value::Null {
        status = "valid".to_string();
        warning = "License expiry could not be evaluated locally. Use Unix seconds for short-expiry keys.".to_string();
    }

    let tier = claims.tier.trim().to_ascii_lowercase();
    Ok(LicenseState {
        status,
        tier: if tier.is_empty() {
            "individual".to_string()
        } else {
            tier.clone()
        },
        label: tier_label(&tier),
        expires_at: value_to_string(&claims.expires_at),
        issued_at: value_to_string(&claims.issued_at),
        license_id: claims.license_id,
        customer_email: claims.customer_email,
        features: tier_features(&tier, &claims.features),
        warning,
        last_validated_at: now_string(),
    })
}

#[cfg(not(debug_assertions))]
fn read_stored_license() -> Result<Option<StoredLicense>, String> {
    let path = license_path()?;
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str::<StoredLicense>(&content)
        .map(Some)
        .map_err(|error| format!("Stored license file is invalid: {error}"))
}

pub fn current_license() -> LicenseState {
    #[cfg(debug_assertions)]
    {
        developer_bypass_state()
    }

    #[cfg(not(debug_assertions))]
    {
        match read_stored_license() {
            Ok(Some(stored)) => match verify_key(&stored.key) {
                Ok(state) => state,
                Err(error) => individual_state("invalid", &error),
            },
            Ok(None) => individual_state(
                "individual",
                "No license installed. Individual ROS is active.",
            ),
            Err(error) => individual_state("invalid", &error),
        }
    }
}

pub fn install_license_key(key: &str) -> Result<LicenseState, String> {
    let state = verify_key(key)?;
    ensure_app_dir()?;
    let stored = StoredLicense {
        key: key.trim().to_string(),
        installed_at: now_string(),
    };
    let content = serde_json::to_string_pretty(&stored).map_err(|error| error.to_string())?;
    fs::write(license_path()?, content).map_err(|error| error.to_string())?;
    Ok(state)
}

pub fn remove_license() -> Result<LicenseState, String> {
    let path = license_path()?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    Ok(current_license())
}

pub fn check_feature(feature_id: &str) -> FeatureCheck {
    let state = current_license();
    let allowed = state
        .features
        .iter()
        .any(|entry| entry == feature_id || entry == "all_features");
    FeatureCheck {
        feature_id: feature_id.to_string(),
        allowed,
        tier: state.tier.clone(),
        label: state.label.clone(),
        reason: if allowed {
            "Feature available for current license.".to_string()
        } else {
            format!("Upgrade from {} to unlock this feature.", state.label)
        },
    }
}

pub fn require_feature(feature_id: &str) -> Result<(), String> {
    let check = check_feature(feature_id);
    if check.allowed {
        Ok(())
    } else {
        Err(check.reason)
    }
}
