#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

struct AppState {
    vault_path: Mutex<Option<PathBuf>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_vault_path(state: State<AppState>) -> Option<PathBuf> {
    state.vault_path.lock().unwrap().clone()
}

#[tauri::command]
fn set_vault_path(path: String, state: State<AppState>) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    *state.vault_path.lock().unwrap() = Some(path_buf);
    Ok(())
}

#[tauri::command]
fn list_notes(vault_path: String) -> Result<Vec<NoteInfo>, String> {
    let path = PathBuf::from(&vault_path);
    let mut notes = Vec::new();

    if !path.exists() {
        return Err("Vault path does not exist".to_string());
    }

    for entry in walkdir::WalkDir::new(&path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path();
        if file_path.is_file() {
            if let Some(ext) = file_path.extension() {
                if ext == "md" || ext == "markdown" {
                    if let Ok(content) = std::fs::read_to_string(file_path) {
                        let relative_path = file_path
                            .strip_prefix(&path)
                            .unwrap_or(file_path)
                            .to_string_lossy()
                            .to_string();

                        notes.push(NoteInfo {
                            path: relative_path,
                            title: file_path
                                .file_stem()
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_default(),
                            size: content.len(),
                        });
                    }
                }
            }
        }
    }

    Ok(notes)
}

#[tauri::command]
fn read_note(vault_path: String, note_path: String) -> Result<String, String> {
    let full_path = PathBuf::from(&vault_path).join(&note_path);
    std::fs::read_to_string(&full_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_note(vault_path: String, note_path: String, content: String) -> Result<(), String> {
    let full_path = PathBuf::from(&vault_path).join(&note_path);

    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&full_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_note(vault_path: String, note_path: String) -> Result<(), String> {
    let full_path = PathBuf::from(&vault_path).join(&note_path);
    std::fs::remove_file(&full_path).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct NoteInfo {
    path: String,
    title: String,
    size: usize,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(AppState {
            vault_path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_vault_path,
            set_vault_path,
            list_notes,
            read_note,
            write_note,
            delete_note,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
