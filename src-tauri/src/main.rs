#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::Path;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use tauri::{AppHandle, Manager, Emitter};
use tauri_plugin_sql::{Migration, MigrationKind};
use walkdir::WalkDir;

#[derive(Serialize)]
struct FileEntry {
    name: String,
    size: u64,
    folder: String,
    path: String,
    file_type: String,
    is_directory: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    total_found: usize,
    processed: usize,
    current_file: String,
}

#[tauri::command]
async fn get_all_drives() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::path::PathBuf;
        let drives = (b'A'..=b'Z')
            .map(|c| format!("{}:\\", c as char))
            .filter(|drive| PathBuf::from(drive).exists())
            .collect();
        Ok(drives)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec!["/".to_string()])
    }
}

#[tauri::command]
async fn read_folder(dir: String) -> Result<Vec<FileEntry>, String> {
    let mut result = Vec::new();
    let path = Path::new(&dir);

    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry_result in entries {
        if let Ok(entry) = entry_result {
            let name = entry.file_name().to_string_lossy().to_string();
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let size = metadata.len();
            
            let folder = entry.path().parent()
                .and_then(|p| p.to_str())
                .unwrap_or("")
                .to_string();
                
            let entry_path = entry.path();
            let is_directory = entry_path.is_dir();

            if is_directory {
                result.push(FileEntry {
                    name,
                    size,
                    folder,
                    path: entry_path.to_string_lossy().to_string(),
                    file_type: "directory".to_string(),
                    is_directory: true,
                });
            } else if let Some(ext) = entry_path.extension().and_then(|e| e.to_str()) {
                let ext_lower = ext.to_lowercase();
                if matches!(
                    ext_lower.as_str(),
                    "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff" | "svg" | "avif" | "heic" | 
                    "mp4" | "webm" | "ogg" | "mov" | "avi" | "mkv" | 
                    "mp3" | "wav" | "flac" | "aac"
                ) {
                    result.push(FileEntry {
                        name,
                        size,
                        folder,
                        path: entry_path.to_string_lossy().to_string(),
                        file_type: ext_lower,
                        is_directory: false,
                    });
                }
            }
        }
    }

    Ok(result)
}

#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
async fn import_directory(
    app: AppHandle,
    path: String,
) -> Result<usize, String> {
    let mut media_files = Vec::new();
    
    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        let file_path = entry.path();
        if file_path.is_file() {
            if let Some(ext) = file_path.extension().and_then(|s| s.to_str()) {
                let ext_lower = ext.to_lowercase();
                if matches!(ext_lower.as_str(),
                    "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff" | "svg" | "avif" | "heic" | 
                    "mp4" | "webm" | "ogg" | "mov" | "avi" | "mkv" | 
                    "mp3" | "wav" | "flac" | "aac") {
                    media_files.push(file_path.to_string_lossy().to_string());
                }
            }
        }
    }

    let total = media_files.len();
    println!("Found {} media files in directory.", total);
    if total == 0 { return Ok(0); }

    let app_config_dir = app.path()
        .app_config_dir()
        .map_err(|_| "Could not determine app config directory".to_string())?;
    
    let db_path = app_config_dir.join("dfiv.db");

    let connect_options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .connect_with(connect_options)
        .await
        .map_err(|e| format!("Failed to connect to DB at {:?}: {}", db_path, e))?;

    let mut tx = pool.begin()
        .await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let mut processed = 0;

    for file in media_files {
        let path = Path::new(&file);

        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown");
            
        let folder = path.parent()
            .and_then(|p| p.to_str())
            .unwrap_or("");
            
        let file_type = path.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
            
        let size = fs::metadata(&path)
            .map(|m| m.len() as i64)
            .unwrap_or(0);

        let query_result = sqlx::query("INSERT OR IGNORE INTO media (name, size, folder, path, file_type) VALUES (?, ?, ?, ?, ?)")
            .bind(name) 
            .bind(size) 
            .bind(folder) 
            .bind(&file) 
            .bind(file_type) 
            .execute(&mut *tx)
            .await;

        if query_result.is_ok() {
            processed += 1;
        }

        if processed % 50 == 0 || processed == total {
            let payload = ProgressPayload {
                total_found: total,
                processed,
                current_file: file.clone(),
            };
            let _ = app.emit("import-progress", payload); 
        }
    }

    tx.commit().await.map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(processed)
}

#[tauri::command]
async fn remove(app: AppHandle, item: String, item_type: String) -> Result<(), String> {
    println!("Removing {}: {}", item_type, item);
    let app_config_dir = app.path()
        .app_config_dir()
        .map_err(|_| "Could not determine app config directory".to_string())?;
    
    let db_path = app_config_dir.join("dfiv.db");

    if db_path.exists() {
        let connect_options = SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .connect_with(connect_options)
            .await
            .map_err(|e| format!("Failed to connect to DB at {:?}: {}", db_path, e))?;

        if item_type == "file" {
            let _ = sqlx::query("DELETE FROM media WHERE path = ?")
                .bind(item)
                .execute(&pool)
                .await;
        } else if item_type == "folder" {
            let _ = sqlx::query("DELETE FROM media WHERE folder = ?")
                .bind(item)
                .execute(&pool)
                .await;
        }
    }

    Ok(())
}

#[tauri::command]
async fn nuke_db(app: AppHandle) -> Result<(), String> {
    let app_config_dir = app.path()
        .app_config_dir()
        .map_err(|_| "Could not determine app config directory".to_string())?;
    
    let db_path = app_config_dir.join("dfiv.db");

    if db_path.exists() {
        let connect_options = SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .connect_with(connect_options)
            .await
            .map_err(|e| format!("Failed to connect to DB at {:?}: {}", db_path, e))?;

        let _ = sqlx::query("DELETE FROM media")
            .execute(&pool)
            .await;
    }

    Ok(())
}

fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "Initial migration",
            sql: "CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY, name TEXT NOT NULL, size INTEGER NOT NULL, folder TEXT NOT NULL, path TEXT UNIQUE NOT NULL, file_type TEXT NOT NULL);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 1,
            description: "Rollback initial migration",
            sql: "DROP TABLE IF EXISTS media;",
            kind: MigrationKind::Down,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_libmpv::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:dfiv.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_all_drives,
            read_folder,
            delete_file,
            import_directory,
            remove,
            nuke_db
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
