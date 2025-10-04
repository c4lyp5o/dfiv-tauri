#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize)]
struct FileEntry {
  name: String,
  folder: String,
  path: String,
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
      let folder = entry.path().parent().and_then(|p| p.to_str()).unwrap_or("").to_string();
      let path = entry.path();
      let is_directory = path.is_dir();

      if is_directory {
          // Always include directories
          result.push(FileEntry {
              name,
              folder: folder.clone(),
              path: path.to_string_lossy().to_string(),
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
                folder: folder.clone(),
                path: path.to_string_lossy().to_string(),
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
fn delete_file(path: String) -> Result<(), String> {
  fs::remove_file(&path).map_err(|e| e.to_string())
}

fn main() {
  tauri::Builder::default()      
    .invoke_handler(tauri::generate_handler![
        get_all_drives,
        read_folder,
        delete_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
