use serde_json::Value;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
};
use tauri::Manager;

const ALLOWED_OPERATIONS: [&str; 4] = ["audit", "privacy", "ship", "doctor"];
const ALLOWED_PROVIDERS: [&str; 3] = ["ollama", "lmstudio", "openai-compatible"];

#[derive(Default)]
struct ProviderSecrets(Mutex<HashMap<String, String>>);

fn resolve_cli(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(configured) = std::env::var_os("LOCALIS_CLI_PATH") {
        let path = PathBuf::from(configured);
        if path.is_file() {
            return Ok(path);
        }
        return Err("LOCALIS_CLI_PATH does not point to a file.".into());
    }
    let development = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../cli/dist/index.js");
    if development.is_file() {
        return Ok(development);
    }
    let bundled = app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?
        .join("cli/index.js");
    if bundled.is_file() {
        return Ok(bundled);
    }
    Err("The Localis CLI bundle was not found. Run npm run build first.".into())
}

fn execute_cli_json(
    app: &tauri::AppHandle,
    arguments: &[String],
    root: Option<&Path>,
    api_key: Option<&str>,
) -> Result<Value, String> {
    let cli = resolve_cli(&app)?;
    let mut command = Command::new("node");
    command.arg(cli).args(arguments).arg("--json");
    if let Some(root) = root {
        command.current_dir(root);
    }
    command.env_remove("LOCALIS_API_KEY");
    if let Some(key) = api_key {
        command.env("LOCALIS_API_KEY", key);
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let output = command
        .output()
        .map_err(|error| format!("Could not start Localis: {error}"))?;
    if output.stdout.len() > 8 * 1024 * 1024 {
        return Err("Localis report exceeded the desktop safety limit.".into());
    }
    if let Ok(report) = serde_json::from_slice::<Value>(&output.stdout) {
        return Ok(report);
    }
    let error = String::from_utf8_lossy(&output.stderr);
    Err(if error.trim().is_empty() {
        format!("Localis exited with status {}.", output.status)
    } else {
        error.trim().to_string()
    })
}

fn project_root(project: &str) -> Result<PathBuf, String> {
    let root = PathBuf::from(project)
        .canonicalize()
        .map_err(|_| "The selected project folder does not exist.".to_string())?;
    if !root.is_dir() {
        return Err("The selected project path is not a directory.".into());
    }
    Ok(root)
}

fn validate_provider(provider: &str, endpoint: &str) -> Result<(), String> {
    if !ALLOWED_PROVIDERS.contains(&provider) {
        return Err("This AI provider is not supported.".into());
    }
    if endpoint.trim().is_empty() || endpoint.len() > 2_048 || endpoint.contains('\0') {
        return Err("The provider endpoint is invalid.".into());
    }
    Ok(())
}

fn validate_connection_id(value: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > 80
        || !value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err("The provider connection ID is invalid.".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{validate_connection_id, validate_provider};

    #[test]
    fn accepts_supported_provider_and_endpoint() {
        assert!(validate_provider("openai-compatible", "https://api.example.com/v1").is_ok());
        assert!(validate_provider("ollama", "http://127.0.0.1:11434").is_ok());
    }

    #[test]
    fn rejects_unknown_provider_and_invalid_connection_id() {
        assert!(validate_provider("shell", "https://api.example.com").is_err());
        assert!(validate_connection_id("provider;remove").is_err());
        assert!(validate_connection_id("openrouter-session_1").is_ok());
    }
}

fn update_secret(
    secrets: &ProviderSecrets,
    connection_id: &str,
    api_key: Option<String>,
) -> Result<Option<String>, String> {
    validate_connection_id(connection_id)?;
    let mut values = secrets
        .0
        .lock()
        .map_err(|_| "The provider secret store is unavailable.".to_string())?;
    if let Some(key) = api_key {
        let key = key.trim().to_string();
        if key.len() > 32_768 || key.contains('\0') {
            return Err("The API key is invalid.".into());
        }
        if key.is_empty() {
            values.remove(connection_id);
        } else {
            values.insert(connection_id.to_string(), key);
        }
    }
    Ok(values.get(connection_id).cloned())
}

fn execute_localis(
    app: tauri::AppHandle,
    project: String,
    operation: String,
) -> Result<Value, String> {
    if !ALLOWED_OPERATIONS.contains(&operation.as_str()) {
        return Err("This Localis operation is not available in Desktop.".into());
    }
    let root = project_root(&project)?;
    let mut arguments = vec![operation.clone()];
    if operation != "doctor" {
        arguments.push(root.to_string_lossy().into_owned());
    }
    execute_cli_json(&app, &arguments, Some(&root), None)
}

#[tauri::command]
async fn run_localis(
    app: tauri::AppHandle,
    project: String,
    operation: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || execute_localis(app, project, operation))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn discover_provider_models(
    app: tauri::AppHandle,
    secrets: tauri::State<'_, ProviderSecrets>,
    connection_id: String,
    provider: String,
    endpoint: String,
    api_key: Option<String>,
) -> Result<Value, String> {
    validate_provider(&provider, &endpoint)?;
    let secret = update_secret(&secrets, &connection_id, api_key)?;
    let arguments = vec![
        "models".into(),
        "--provider".into(),
        provider,
        "--endpoint".into(),
        endpoint,
        "--api-key-env".into(),
        "LOCALIS_API_KEY".into(),
    ];
    tauri::async_runtime::spawn_blocking(move || {
        execute_cli_json(&app, &arguments, None, secret.as_deref())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn ask_provider(
    app: tauri::AppHandle,
    secrets: tauri::State<'_, ProviderSecrets>,
    connection_id: String,
    project: String,
    question: String,
    provider: String,
    endpoint: String,
    model: String,
) -> Result<Value, String> {
    validate_provider(&provider, &endpoint)?;
    if question.trim().is_empty() || question.len() > 4_000 || question.contains('\0') {
        return Err("The AI question must contain between 1 and 4000 characters.".into());
    }
    if model.trim().is_empty() || model.len() > 500 || model.contains('\0') {
        return Err("Choose a valid model before asking Localis AI.".into());
    }
    let secret = update_secret(&secrets, &connection_id, None)?;
    let root = project_root(&project)?;
    let arguments = vec![
        "ask".into(),
        question,
        root.to_string_lossy().into_owned(),
        "--provider".into(),
        provider,
        "--endpoint".into(),
        endpoint,
        "--model".into(),
        model,
        "--api-key-env".into(),
        "LOCALIS_API_KEY".into(),
    ];
    tauri::async_runtime::spawn_blocking(move || {
        execute_cli_json(&app, &arguments, Some(&root), secret.as_deref())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn forget_provider_secret(
    secrets: tauri::State<'_, ProviderSecrets>,
    connection_id: String,
) -> Result<(), String> {
    validate_connection_id(&connection_id)?;
    secrets
        .0
        .lock()
        .map_err(|_| "The provider secret store is unavailable.".to_string())?
        .remove(&connection_id);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ProviderSecrets::default())
        .invoke_handler(tauri::generate_handler![
            run_localis,
            discover_provider_models,
            ask_provider,
            forget_provider_secret,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Localis Desktop");
}
