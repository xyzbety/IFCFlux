// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(windows)]
    {
        use windows::Win32::System::Console::{AttachConsole, ATTACH_PARENT_PROCESS};
        let _ = unsafe { AttachConsole(ATTACH_PARENT_PROCESS) };
    }
    tuari_vue_ts_starter_lib::run()
}
