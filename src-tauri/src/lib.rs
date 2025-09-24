use tauri::Manager;
use tauri_plugin_cli::CliExt;
use std::process;


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
async fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    use tokio::fs::File;
    use tokio::io::AsyncWriteExt;

    let total_size = data.len();
    let mut file = File::create(&path)
        .await
        .map_err(|e| format!("文件创建失败: {}", e))?;

    let chunk_size = total_size / 10; 
    for (_i, chunk) in data.chunks(chunk_size).enumerate() {
        file.write_all(chunk)
            .await
            .map_err(|e| format!("数据块写入失败: {}", e))?;
    }

    println!("文件写入完成！");
    #[cfg(target_os = "windows")]
    if !cfg!(debug_assertions) {
        println!("请按任意键继续...");
    }
    process::exit(0);
}

#[tauri::command]
async fn write_json_file(path: String, contents: String) -> Result<(), String> {
    use tokio::fs::File;
    use tokio::io::AsyncWriteExt;

    // 创建文件并写入 JSON 数据
    let mut file = File::create(&path)
        .await
        .map_err(|e| format!("文件创建失败: {}", e))?;

    file.write_all(contents.as_bytes())
        .await
        .map_err(|e| format!("文件写入失败: {}", e))?;

    println!("JSON 文件写入完成！");
    #[cfg(target_os = "windows")]
    if !cfg!(debug_assertions) {
        println!("请按任意键继续...");
    }
    process::exit(0);
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

        .invoke_handler(tauri::generate_handler![greet, show_mainscreen, convert_to_glb, read_file, write_binary_file,write_json_file,print_to_terminal])
        .setup(|app| {
            match app.cli().matches() {
                Ok(matches) => {
                    if let Some(subcommand) = matches.subcommand {
                        match subcommand.name.as_str() {
                            "convert" => {
                                let input = subcommand.matches.args.get("input").unwrap().value.as_str().unwrap();
                                let output = subcommand.matches.args.get("output").unwrap().value.as_str().unwrap();
                                convert_to_glb(input.to_string(), output.to_string()).unwrap();
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
