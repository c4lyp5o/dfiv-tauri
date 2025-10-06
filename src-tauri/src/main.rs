#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri_plugin_sql::{Migration, MigrationKind};
#[derive(Serialize)]
struct FileEntry {
  name: String,
  size: u64,
  folder: String,
  path: String,
  file_type: String,
  is_directory: bool,
}

#[tauri::command]
fn get_all_drives() -> Vec<String> {
  #[cfg(target_os = "windows")]
  {
    (b'A'..=b'Z')
      .map(|c| format!("{}:\\", c as char))
      .filter(|drive| PathBuf::from(drive).exists())
      .collect()
  }
  #[cfg(not(target_os = "windows"))]
  {
    vec!["/".to_string()]
  }
}

#[tauri::command]
fn read_folder(dir: String) -> Vec<FileEntry> {
  let mut result = Vec::new();
  let path = PathBuf::from(dir);

  if let Ok(entries) = fs::read_dir(path) {
    for entry in entries.flatten() {
      let name = entry.file_name().to_string_lossy().to_string();
      let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
      let folder = entry.path().parent().and_then(|p| p.to_str()).unwrap_or("").to_string();
      let path = entry.path();
      let is_directory = path.is_dir();

      if is_directory {
          // Always include directories
          result.push(FileEntry {
              name,
              size: entry.metadata().map(|m| m.len()).unwrap_or(0),
              folder: folder.clone(),
              path: path.to_string_lossy().to_string(),
              file_type: "directory".to_string(),
              is_directory: true,
          });
      } else {
          // Only include images
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
          let ext = ext.to_lowercase();
          if matches!(
              ext.as_str(),
              "jpg"
                  | "jpeg"
                  | "png"
                  | "gif"
                  | "bmp"
                  | "webp"
                  | "tiff"
                  | "svg"
                  | "avif"
                  | "heic"
                  | "mp4"
                  | "webm"
                  | "ogg"
                  | "mov"
                  | "avi"
                  | "mkv"
                  | "mp3"
                  | "wav"
                  | "flac"
                  | "aac"
          ) {
            result.push(FileEntry {
                name,
                size,
                folder,
                path: path.to_string_lossy().to_string(),
                file_type: ext,
                is_directory: false,
            });
          }
        }
      }
    }
  }

  result
}

#[tauri::command]
fn read_folder_recursive(dir: String) -> Vec<FileEntry> {
  let mut result = Vec::new();
  let path = PathBuf::from(dir);

  fn walk_dir(path: &PathBuf, result: &mut Vec<FileEntry>) {
    if let Ok(entries) = fs::read_dir(path) {
      for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let folder = entry_path
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();

        if entry_path.is_dir() {
          // recurse into subdirectories
          walk_dir(&entry_path, result);
        } else if let Some(ext) = entry_path.extension().and_then(|e| e.to_str()) {
          let ext = ext.to_lowercase();
          if matches!(
            ext.as_str(),
            "jpg"
                | "jpeg"
                | "png"
                | "gif"
                | "bmp"
                | "webp"
                | "tiff"
                | "svg"
                | "avif"
                | "heic"
                | "mp4"
                | "webm"
                | "ogg"
                | "mov"
                | "avi"
                | "mkv"
                | "mp3"
                | "wav"
                | "flac"
                | "aac"
        ) {
            result.push(FileEntry {
              name,
              size: entry.metadata().map(|m| m.len()).unwrap_or(0),
              folder: folder.clone(),
              path: entry_path.to_string_lossy().to_string(),
              file_type: ext,
              is_directory: false,
            });
          }
        }
      }
    }
  }

  walk_dir(&path, &mut result);
  result
}       
              
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
  fs::remove_file(&path).map_err(|e| e.to_string())
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
  .plugin(
    tauri_plugin_sql::Builder::default()
      .add_migrations("sqlite:dfiv.db", migrations)
      .build(),
  )
  .invoke_handler(tauri::generate_handler![
      get_all_drives,
      read_folder,
      read_folder_recursive,
      delete_file
  ])
  .run(tauri::generate_context!())
  .expect("error while running tauri application");
}
