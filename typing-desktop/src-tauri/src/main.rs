#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Menu, Submenu};

fn main() {
    let settings_item = CustomMenuItem::new("change_server".to_string(), "Alterar Servidor");
    let submenu = Submenu::new("Configurações", Menu::new().add_item(settings_item));
    let menu = Menu::new().add_submenu(submenu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "change_server" => {
                    let window = event.window();
                    // Limpar a URL no localStorage via script e recarregar a página inicial
                    window.eval("localStorage.removeItem('server_url'); window.location.replace('index.html');").unwrap();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
