use tauri::Manager;
use tauri_plugin_cli::CliExt;
use tauri_plugin_fs::FsExt;

#[tauri::command]
fn convert_to_glb(_input_path: String, _output_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    if !cfg!(debug_assertions) {
        println!("");
    }
    Ok(())
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("文件读取失败: {}", e))
}
#[tauri::command]
fn exit_process(app: tauri::AppHandle) {
    #[cfg(target_os = "windows")]
    if !cfg!(debug_assertions) {
        println!("请按任意键继续...");
    }
    app.exit(0)
}

#[tauri::command]
fn print_to_terminal(message: String) {
    println!("{}", message);
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("你好, {}! Rust欢迎你!", name)
}

#[tauri::command]
async fn show_mainscreen(window: tauri::Window, app: tauri::AppHandle) {
    // 检查是否为命令行调用且包含 "convert" 子命令
    let is_cli_convert = match app.cli().matches() {
        Ok(matches) => matches.subcommand.as_ref().map_or(false, |sc| sc.name == "convert"),
        Err(_) => false,
    };

    // 仅在非命令行模式时显示窗口
    if !is_cli_convert {
        window.get_webview_window("main").unwrap().show().unwrap();
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())

        .invoke_handler(tauri::generate_handler![greet, show_mainscreen, convert_to_glb, read_file, print_to_terminal,exit_process])
        .setup(|app| {
            match app.cli().matches() {
                Ok(matches) => {
                    if let Some(subcommand) = matches.subcommand {
                        match subcommand.name.as_str() {
                            "convert" => {
                                let input = subcommand.matches.args.get("input").unwrap().value.as_str().unwrap();
                                let output = subcommand.matches.args.get("output").unwrap().value.as_str().unwrap();
                                convert_to_glb(input.to_string(), output.to_string()).unwrap();
                                // 动态允许 output 目录
                                let scope = app.fs_scope();
                                scope.allow_directory(output, false)
                                    .unwrap_or_else(|e| eprintln!("无法设置目录权限: {}", e));
                                    }
                            _ => {}
                        }
                    }
                }
                Err(e) => eprintln!("命令行错误: {}", e),
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行tauri应用程序失败");
}
