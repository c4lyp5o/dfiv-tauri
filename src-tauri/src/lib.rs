
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // let migrations = vec![
  //   Migration {
  //       version: 1,
  //       description: "Initial migration",
  //       sql: "CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY, name TEXT NOT NULL, folder TEXT NOT NULL, path TEXT UNIQUE NOT NULL, file_type TEXT NOT NULL);",
  //       kind: MigrationKind::Up,
  //   },
  //     Migration {
  //       version: 1,
  //       description: "Rollback initial migration",
  //       sql: "DROP TABLE IF EXISTS media;",
  //       kind: MigrationKind::Down,
  //   },
  // ];

  tauri::Builder::default()
    // .plugin(
    //   tauri_plugin_sql::Builder::default()
    //     .add_migrations("sqlite:dfiv.db", migrations)
    //     .build(),
    // )
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
