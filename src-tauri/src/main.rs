#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::Path;
use sqlx::{AssertSqlSafe, SqlitePool};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use tauri::{AppHandle, Manager, Emitter};
use walkdir::WalkDir;

const IMAGE_TYPES: &[&str] = &["jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "svg", "avif", "heic"];
const AUDIO_TYPES: &[&str] = &["mp3", "wav", "ogg", "flac", "aac"];
const VIDEO_TYPES: &[&str] = &["mp4", "webm", "mov", "avi", "mkv"];

struct DbPool(SqlitePool);

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

#[derive(Serialize)]
struct ImportResult {
    inserted: usize,
    total: usize,
}

#[derive(serde::Serialize, sqlx::FromRow)]
struct MediaEntry {
    name: String,
    path: String,
    file_type: String,
}

#[derive(serde::Serialize)]
struct MediaStats {
    total_count: i64,
    total_size: i64,
    image_count: i64,
    audio_count: i64,
    video_count: i64,
}

/// A file found on disk during an import scan.
struct ScannedFile {
    path: String,
    name: String,
    folder: String,
    file_type: String,
    size: i64,
}

/// Lowercased extension of `path` if it's a supported media type.
fn media_type(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    let supported = [IMAGE_TYPES, AUDIO_TYPES, VIDEO_TYPES]
        .iter()
        .any(|types| types.contains(&ext.as_str()));
    supported.then_some(ext)
}

/// Escapes LIKE wildcards so user input matches literally (used with `ESCAPE '\'`).
fn escape_like(input: &str) -> String {
    input.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_")
}

/// `folder` with a trailing separator, for matching paths nested under it.
fn folder_prefix(folder: &str) -> String {
    if folder.ends_with(std::path::MAIN_SEPARATOR) {
        folder.to_string()
    } else {
        format!("{}{}", folder, std::path::MAIN_SEPARATOR)
    }
}

/// `'a','b','c'` for building IN clauses from the constant type lists.
fn sql_list(types: &[&str]) -> String {
    types.iter().map(|t| format!("'{}'", t)).collect::<Vec<_>>().join(",")
}

/// Runs blocking filesystem work off the async runtime.
async fn blocking<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(f).await.map_err(|e| e.to_string())
}

async fn setup_db(app: &AppHandle) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let app_config_dir = app.path().app_config_dir()?;
    std::fs::create_dir_all(&app_config_dir)?;
    let db_path = app_config_dir.join("dfiv.db");

    let connect_options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true)
        .pragma("journal_mode", "WAL")
        .pragma("synchronous", "NORMAL");

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_options)
        .await?;

    create_schema(&pool).await?;
    Ok(pool)
}

async fn create_schema(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            size INTEGER NOT NULL,
            folder TEXT NOT NULL,
            path TEXT UNIQUE NOT NULL,
            file_type TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Create index for search
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_media_name ON media(name)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_media_file_type ON media(file_type)")
        .execute(pool)
        .await?;

    // Normalize rows imported before file_type was lowercased
    sqlx::query("UPDATE media SET file_type = lower(file_type) WHERE file_type != lower(file_type)")
        .execute(pool)
        .await?;

    Ok(())
}

#[tauri::command]
async fn get_all_drives() -> Result<Vec<String>, String> {
    // exists() on empty card readers / disconnected network drives can stall
    blocking(list_roots).await
}

fn list_roots() -> Vec<String> {
    #[cfg(target_os = "windows")]
    {
        use std::path::PathBuf;
        (b'A'..=b'Z')
            .map(|c| format!("{}:\\", c as char))
            .filter(|drive| PathBuf::from(drive).exists())
            .collect()
    }
    #[cfg(not(target_os = "windows"))]
    {
        let mut roots = vec!["/".to_string()];
        if let Ok(home) = std::env::var("HOME") {
            roots.push(home);
        }
        roots.extend(mounted_volumes());
        roots
    }
}

/// External/removable volumes: /Volumes on macOS, the usual automount dirs on Linux.
#[cfg(not(target_os = "windows"))]
fn mounted_volumes() -> Vec<String> {
    volume_bases()
        .iter()
        .filter_map(|base| fs::read_dir(base).ok())
        .flatten()
        .filter_map(Result::ok)
        // file_type() doesn't follow symlinks, which skips macOS's "Macintosh HD" -> "/" alias
        .filter(|entry| entry.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|entry| entry.path().to_string_lossy().into_owned())
        .collect()
}

#[cfg(target_os = "macos")]
fn volume_bases() -> Vec<std::path::PathBuf> {
    vec!["/Volumes".into()]
}

#[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
fn volume_bases() -> Vec<std::path::PathBuf> {
    use std::path::PathBuf;

    let mut dirs = vec![PathBuf::from("/mnt")];
    if let Ok(user) = std::env::var("USER") {
        dirs.push(PathBuf::from("/media").join(&user));
        dirs.push(PathBuf::from("/run/media").join(&user));
    }
    dirs
}

#[tauri::command]
async fn read_folder(dir: String) -> Result<Vec<FileEntry>, String> {
    blocking(move || list_folder(Path::new(&dir))).await?
}

fn list_folder(path: &Path) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut dirs = Vec::new();
    let mut files = Vec::new();

    for entry in entries.filter_map(Result::ok) {
        let name = entry.file_name().to_string_lossy().to_string();
        // Dotfiles are hidden by convention on macOS/Linux
        if name.starts_with('.') {
            continue;
        }
        // Skip entries we can't stat (e.g. permission denied) instead of failing the whole listing
        let Ok(metadata) = entry.metadata() else { continue };
        let size = metadata.len();

        let entry_path = entry.path();
        let folder = entry_path.parent()
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();

        if entry_path.is_dir() {
            dirs.push(FileEntry {
                name,
                size,
                folder,
                path: entry_path.to_string_lossy().to_string(),
                file_type: "directory".to_string(),
                is_directory: true,
            });
        } else if let Some(file_type) = media_type(&entry_path) {
            files.push(FileEntry {
                name,
                size,
                folder,
                path: entry_path.to_string_lossy().to_string(),
                file_type,
                is_directory: false,
            });
        }
    }

    // Sort each group by name (case-insensitive)
    dirs.sort_by_key(|e| e.name.to_lowercase());
    files.sort_by_key(|e| e.name.to_lowercase());

    // Directories first, then files
    dirs.extend(files);
    Ok(dirs)
}

#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    // Only delete files this app lists, never arbitrary paths
    let target = Path::new(&path);
    if !target.is_file() || media_type(target).is_none() {
        return Err(format!("Refusing to delete non-media file: {}", path));
    }
    fs::remove_file(target).map_err(|e| format!("Failed to delete file: {}", e))
}

fn scan_media(root: &str) -> Vec<ScannedFile> {
    WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| {
            let path = entry.path();
            let file_type = media_type(path)?;
            Some(ScannedFile {
                path: path.to_string_lossy().to_string(),
                name: path.file_name().and_then(|n| n.to_str()).unwrap_or("Unknown").to_string(),
                folder: path.parent().and_then(|p| p.to_str()).unwrap_or("").to_string(),
                file_type,
                size: entry.metadata().map(|m| m.len() as i64).unwrap_or(0),
            })
        })
        .collect()
}

#[tauri::command]
async fn import_directory(
    app: AppHandle,
    db: tauri::State<'_, DbPool>,
    path: String,
) -> Result<ImportResult, String> {
    let media_files = blocking(move || scan_media(&path)).await?;

    let total = media_files.len();
    if total == 0 { return Ok(ImportResult { inserted: 0, total: 0 }); }

    let mut tx = db.0.begin().await.map_err(|e| format!("Failed to start transaction: {}", e))?;
    let mut inserted = 0;

    for (index, file) in media_files.iter().enumerate() {
        let processed = index + 1;

        let result = sqlx::query(
            "INSERT OR IGNORE INTO media (name, size, folder, path, file_type) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&file.name).bind(file.size).bind(&file.folder).bind(&file.path).bind(&file.file_type)
        .execute(&mut *tx)
        .await;

        // INSERT OR IGNORE succeeds for duplicates, so only count rows actually written
        if matches!(result, Ok(r) if r.rows_affected() > 0) { inserted += 1; }

        if processed % 50 == 0 || processed == total {
            let _ = app.emit("import-progress", ProgressPayload {
                total_found: total,
                processed,
                current_file: file.path.clone(),
            });
        }
    }

    tx.commit().await.map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(ImportResult { inserted, total })
}

#[tauri::command]
async fn remove(db: tauri::State<'_, DbPool>, item: String, item_type: String) -> Result<(), String> {
    remove_media(&db.0, &item, &item_type).await
}

async fn remove_media(pool: &SqlitePool, item: &str, item_type: &str) -> Result<(), String> {
    match item_type {
        "file" => {
            sqlx::query("DELETE FROM media WHERE path = ?")
                .bind(item).execute(pool).await.map_err(|e| e.to_string())?;
        }
        "folder" => {
            // Match the folder itself and everything nested under it
            let prefix = folder_prefix(item);
            sqlx::query("DELETE FROM media WHERE folder = ? OR substr(folder, 1, length(?)) = ?")
                .bind(item).bind(&prefix).bind(&prefix)
                .execute(pool).await.map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("Unknown item type: {}", item_type)),
    }
    Ok(())
}

#[tauri::command]
async fn nuke_db(db: tauri::State<'_, DbPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM media").execute(&db.0).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_media(db: tauri::State<'_, DbPool>) -> Result<Vec<MediaEntry>, String> {
    sqlx::query_as::<_, MediaEntry>(
        "SELECT name, path, file_type FROM media ORDER BY name COLLATE NOCASE ASC"
    )
    .fetch_all(&db.0)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_media_stats(db: tauri::State<'_, DbPool>) -> Result<MediaStats, String> {
    let sql = format!(
        "SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(size), 0) as total_size,
            COALESCE(SUM(CASE WHEN file_type IN ({}) THEN 1 ELSE 0 END), 0) as image_count,
            COALESCE(SUM(CASE WHEN file_type IN ({}) THEN 1 ELSE 0 END), 0) as audio_count,
            COALESCE(SUM(CASE WHEN file_type IN ({}) THEN 1 ELSE 0 END), 0) as video_count
        FROM media",
        sql_list(IMAGE_TYPES),
        sql_list(AUDIO_TYPES),
        sql_list(VIDEO_TYPES),
    );
    // Only the constant type lists are interpolated
    let row = sqlx::query(AssertSqlSafe(sql))
        .fetch_one(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    use sqlx::Row;
    Ok(MediaStats {
        total_count: row.get("total_count"),
        total_size: row.get("total_size"),
        image_count: row.get("image_count"),
        audio_count: row.get("audio_count"),
        video_count: row.get("video_count"),
    })
}

#[tauri::command]
async fn search_media(
    db: tauri::State<'_, DbPool>,
    query: String,
    types: Vec<String>,
) -> Result<Vec<MediaEntry>, String> {
    search(&db.0, &query, &types).await
}

async fn search(pool: &SqlitePool, query: &str, types: &[String]) -> Result<Vec<MediaEntry>, String> {
    if types.is_empty() {
        return Ok(vec![]);
    }

    let placeholders: String = types.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!(
        "SELECT name, path, file_type FROM media \
         WHERE file_type IN ({}) AND name LIKE ? ESCAPE '\\' \
         ORDER BY name COLLATE NOCASE ASC",
        placeholders
    );

    // Only `?` placeholders are interpolated; all values are bound
    let mut q = sqlx::query_as::<_, MediaEntry>(AssertSqlSafe(sql));
    for t in types {
        q = q.bind(t);
    }
    q = q.bind(format!("%{}%", escape_like(query)));

    q.fetch_all(pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_media_by_type(
    db: tauri::State<'_, DbPool>,
    types: Vec<String>,
) -> Result<Vec<MediaEntry>, String> {
    if types.is_empty() {
        return Ok(vec![]);
    }

    let placeholders: String = types.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!(
        "SELECT name, path, file_type FROM media \
         WHERE file_type IN ({}) \
         ORDER BY name COLLATE NOCASE ASC",
        placeholders
    );

    // Only `?` placeholders are interpolated; all values are bound
    let mut q = sqlx::query_as::<_, MediaEntry>(AssertSqlSafe(sql));
    for t in &types {
        q = q.bind(t);
    }

    q.fetch_all(&db.0).await.map_err(|e| e.to_string())
}

fn main() {
    // mpv embeds into the native window, which Wayland doesn't allow; run under XWayland instead
    #[cfg(target_os = "linux")]
    if std::env::var_os("GDK_BACKEND").is_none() {
        // SAFETY: called at the very start of main, before any other threads exist.
        unsafe { std::env::set_var("GDK_BACKEND", "x11") };
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_libmpv::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async {
                let pool = setup_db(&handle).await.expect("Failed to setup database");
                handle.manage(DbPool(pool));
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_all_drives,
            read_folder,
            delete_file,
            import_directory,
            remove,
            nuke_db,
            get_media,
            get_media_stats,
            search_media,
            get_media_by_type,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        create_schema(&pool).await.unwrap();
        pool
    }

    async fn insert(pool: &SqlitePool, folder: &str, name: &str, file_type: &str) {
        let path = format!("{}{}", folder_prefix(folder), name);
        sqlx::query("INSERT INTO media (name, size, folder, path, file_type) VALUES (?, 0, ?, ?, ?)")
            .bind(name).bind(folder).bind(path).bind(file_type)
            .execute(pool).await.unwrap();
    }

    async fn count(pool: &SqlitePool) -> i64 {
        sqlx::query_scalar("SELECT COUNT(*) FROM media").fetch_one(pool).await.unwrap()
    }

    /// Fresh empty directory under the system temp dir, unique per test.
    fn temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("dfmv-test-{}-{}", std::process::id(), name));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn list_folder_puts_dirs_first_and_skips_dotfiles_and_non_media() {
        let dir = temp_dir("list");
        fs::create_dir(dir.join("Zebra")).unwrap();
        fs::create_dir(dir.join(".hidden")).unwrap();
        for file in ["b.PNG", "a.mp3", "notes.txt", ".secret.jpg"] {
            fs::write(dir.join(file), b"x").unwrap();
        }

        let entries = list_folder(&dir).unwrap();
        let names: Vec<_> = entries.iter().map(|e| e.name.as_str()).collect();

        assert_eq!(names, ["Zebra", "a.mp3", "b.PNG"]);
        assert!(entries[0].is_directory);
        assert_eq!(entries[2].file_type, "png");
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn list_folder_errors_on_missing_directory() {
        let missing = std::env::temp_dir().join("dfmv-test-does-not-exist");
        assert!(list_folder(&missing).is_err());
    }

    #[test]
    fn scan_media_walks_nested_folders_and_records_metadata() {
        let dir = temp_dir("scan");
        fs::create_dir_all(dir.join("2024").join("trip")).unwrap();
        fs::write(dir.join("top.JPG"), b"12345").unwrap();
        fs::write(dir.join("2024").join("trip").join("clip.mkv"), b"x").unwrap();
        fs::write(dir.join("2024").join("readme.md"), b"x").unwrap();

        let mut found = scan_media(dir.to_str().unwrap());
        found.sort_by_key(|f| f.name.clone());

        assert_eq!(found.len(), 2);
        assert_eq!(found[0].name, "clip.mkv");
        assert!(found[0].folder.ends_with("trip"));
        assert_eq!(found[1].file_type, "jpg");
        assert_eq!(found[1].size, 5);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn media_type_lowercases_supported_extensions() {
        assert_eq!(media_type(Path::new("IMG_001.JPG")).as_deref(), Some("jpg"));
        assert_eq!(media_type(Path::new("song.Flac")).as_deref(), Some("flac"));
        assert_eq!(media_type(Path::new("clip.mkv")).as_deref(), Some("mkv"));
    }

    #[test]
    fn media_type_rejects_unsupported_or_missing_extensions() {
        assert_eq!(media_type(Path::new("notes.txt")), None);
        assert_eq!(media_type(Path::new("README")), None);
    }

    #[test]
    fn escape_like_escapes_wildcards_and_escape_char() {
        assert_eq!(escape_like(r"100%_a\b"), r"100\%\_a\\b");
    }

    #[test]
    fn folder_prefix_adds_separator_once() {
        let sep = std::path::MAIN_SEPARATOR;
        assert_eq!(folder_prefix("photos"), format!("photos{sep}"));
        assert_eq!(folder_prefix(&format!("photos{sep}")), format!("photos{sep}"));
    }

    #[test]
    fn remove_folder_deletes_nested_rows_but_not_siblings() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            let sep = std::path::MAIN_SEPARATOR;
            insert(&pool, "photos", "a.jpg", "jpg").await;
            insert(&pool, &format!("photos{sep}2024"), "b.jpg", "jpg").await;
            insert(&pool, "photos-old", "c.jpg", "jpg").await;

            remove_media(&pool, "photos", "folder").await.unwrap();

            assert_eq!(count(&pool).await, 1); // only photos-old remains
        });
    }

    #[test]
    fn search_matches_wildcard_characters_literally() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            insert(&pool, "x", "100%_done.jpg", "jpg").await;
            insert(&pool, "x", "100abc.jpg", "jpg").await;

            let results = search(&pool, "100%", &["jpg".to_string()]).await.unwrap();

            assert_eq!(results.len(), 1);
            assert_eq!(results[0].name, "100%_done.jpg");
        });
    }

    #[test]
    fn schema_setup_normalizes_uppercase_file_types() {
        tauri::async_runtime::block_on(async {
            let pool = test_pool().await;
            insert(&pool, "x", "a.JPG", "JPG").await;

            create_schema(&pool).await.unwrap();

            let file_type: String = sqlx::query_scalar("SELECT file_type FROM media")
                .fetch_one(&pool).await.unwrap();
            assert_eq!(file_type, "jpg");
        });
    }
}
