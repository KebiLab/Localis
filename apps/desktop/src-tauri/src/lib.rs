use serde_json::Value;
use std::{path::{Path, PathBuf}, process::Command};
use tauri::Manager;

const ALLOWED_OPERATIONS: [&str; 4] = ["audit", "privacy", "ship", "doctor"];

fn resolve_cli(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(configured) = std::env::var_os("LOCALIS_CLI_PATH") {
        let path = PathBuf::from(configured);
        if path.is_file() { return Ok(path); }
        return Err("LOCALIS_CLI_PATH does not point to a file.".into());
    }
    let development = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../cli/dist/index.js");
    if development.is_file() { return Ok(development); }
    let bundled = app.path().resource_dir().map_err(|error| error.to_string())?.join("cli/index.js");
    if bundled.is_file() { return Ok(bundled); }
    Err("The Localis CLI bundle was not found. Run npm run build first.".into())
}

fn execute_localis(app: tauri::AppHandle, project: String, operation: String) -> Result<Value, String> {
    if !ALLOWED_OPERATIONS.contains(&operation.as_str()) {
        return Err("This Localis operation is not available in Desktop.".into());
    }
    let root = PathBuf::from(project).canonicalize().map_err(|_| "The selected project folder does not exist.".to_string())?;
    if !root.is_dir() { return Err("The selected project path is not a directory.".into()); }
    let cli = resolve_cli(&app)?;
    let mut command = Command::new("node");
    command.arg(cli).arg(&operation);
    if operation != "doctor" { command.arg(&root); }
    command.arg("--json").current_dir(&root);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let output = command.output().map_err(|error| format!("Could not start Localis: {error}"))?;
    if output.stdout.len() > 8 * 1024 * 1024 { return Err("Localis report exceeded the desktop safety limit.".into()); }
    if let Ok(report) = serde_json::from_slice::<Value>(&output.stdout) { return Ok(report); }
    let error = String::from_utf8_lossy(&output.stderr);
    Err(if error.trim().is_empty() { format!("Localis exited with status {}.", output.status) } else { error.trim().to_string() })
}

#[tauri::command]
async fn run_localis(app: tauri::AppHandle, project: String, operation: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || execute_localis(app, project, operation))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![run_localis])
        .run(tauri::generate_context!())
        .expect("error while running Localis Desktop");
}
