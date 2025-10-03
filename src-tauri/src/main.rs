#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dirs;
use std::fs;
use std::path::PathBuf;
use serde::Serialize;
use base64::{engine::general_purpose, Engine};

#[derive(Serialize)]
struct FileEntry {
    name: String,
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

/// Returns the user's home directory as a string.
#[tauri::command]
fn get_home_dir() -> Option<String> {
    dirs::home_dir().map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn read_folder(dir: String) -> Vec<FileEntry> {
    let mut result = Vec::new();
    let path = PathBuf::from(dir);

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let is_directory = path.is_dir();
            let name = entry.file_name().to_string_lossy().to_string();

            if is_directory {
                // Always include directories
                result.push(FileEntry {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_directory: true,
                });
            } else {
                // Only include images
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext = ext.to_lowercase();
                    if matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff" | "svg" | "avif" | "heic" | "mp4" | "webm" | "ogg" | "mov" | "avi" | "mkv" | "mp3" | "wav" | "flac" | "aac") {
                        result.push(FileEntry {
                            name,
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
fn read_image_as_data_url(path: String) -> Option<String> {
    let img_data = fs::read(&path).ok()?;
    let ext = PathBuf::from(&path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());
    let mime_type = match ext.as_deref() {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("bmp") => "image/bmp",
        Some("webp") => "image/webp",
        Some("tiff") => "image/tiff",
        Some("avif") => "image/avif",
        Some("heic") => "image/heic",
        _ => return None,
    };

    Some(format!("data:{};base64,{}", mime_type, general_purpose::STANDARD.encode(img_data)))
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_all_drives, get_home_dir, read_folder, read_image_as_data_url, delete_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
