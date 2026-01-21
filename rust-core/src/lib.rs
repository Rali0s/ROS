use wasm_bindgen::prelude::*;
use web_sys::console;
use serde::{Deserialize, Serialize};

// Core LimeOS types
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Process {
    pub id: u32,
    pub name: String,
    pub status: ProcessStatus,
    pub memory_usage: u64,
    pub cpu_usage: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum ProcessStatus {
    Running,
    Sleeping,
    Stopped,
    Zombie,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileSystem {
    pub root: FsNode,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FsNode {
    pub name: String,
    pub node_type: FsNodeType,
    pub children: Vec<FsNode>,
    pub content: Option<String>,
    pub permissions: u16,
    pub size: u64,
    pub modified: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum FsNodeType {
    Directory,
    File,
}

// Core OS kernel simulation
#[wasm_bindgen]
pub struct LimeOSKernel {
    processes: Vec<Process>,
    filesystem: FileSystem,
    next_pid: u32,
}

#[wasm_bindgen]
impl LimeOSKernel {
    #[wasm_bindgen(constructor)]
    pub fn new() -> LimeOSKernel {
        console::log_1(&"LimeOS Kernel initialized with Rust core!".into());

        let mut kernel = LimeOSKernel {
            processes: Vec::new(),
            filesystem: FileSystem {
                root: FsNode {
                    name: "/".to_string(),
                    node_type: FsNodeType::Directory,
                    children: Vec::new(),
                    content: None,
                    permissions: 0o755,
                    size: 0,
                    modified: js_sys::Date::now() as u64,
                },
            },
            next_pid: 1,
        };

        // Initialize with system processes
        kernel.create_process("init".to_string());
        kernel.create_process("shell".to_string());

        kernel
    }

    #[wasm_bindgen]
    pub fn create_process(&mut self, name: String) -> u32 {
        let pid = self.next_pid;
        self.next_pid += 1;

        let process = Process {
            id: pid,
            name,
            status: ProcessStatus::Running,
            memory_usage: 1024, // 1KB
            cpu_usage: 0.0,
        };

        self.processes.push(process);
        console::log_1(&format!("Process {} created", pid).into());
        pid
    }

    #[wasm_bindgen]
    pub fn kill_process(&mut self, pid: u32) -> bool {
        if let Some(pos) = self.processes.iter().position(|p| p.id == pid) {
            self.processes.remove(pos);
            console::log_1(&format!("Process {} killed", pid).into());
            true
        } else {
            false
        }
    }

    #[wasm_bindgen]
    pub fn get_processes(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.processes).unwrap()
    }

    #[wasm_bindgen]
    pub fn create_file(&mut self, path: &str, content: &str) -> bool {
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        LimeOSKernel::create_file_recursive(&mut self.filesystem.root, &parts, content)
    }

    fn create_file_recursive(node: &mut FsNode, parts: &[&str], content: &str) -> bool {
        if parts.is_empty() {
            node.content = Some(content.to_string());
            node.node_type = FsNodeType::File;
            node.size = content.len() as u64;
            node.modified = js_sys::Date::now() as u64;
            return true;
        }

        let dirname = parts[0];
        let remaining = &parts[1..];

        // Find or create directory
        let child = node.children.iter_mut().find(|c| c.name == dirname);
        if let Some(child) = child {
            if let FsNodeType::Directory = child.node_type {
                LimeOSKernel::create_file_recursive(child, remaining, content)
            } else {
                false // Can't create file in file
            }
        } else {
            // Create new directory
            let mut new_dir = FsNode {
                name: dirname.to_string(),
                node_type: FsNodeType::Directory,
                children: Vec::new(),
                content: None,
                permissions: 0o755,
                size: 0,
                modified: js_sys::Date::now() as u64,
            };
            let result = LimeOSKernel::create_file_recursive(&mut new_dir, remaining, content);
            node.children.push(new_dir);
            result
        }
    }

    #[wasm_bindgen]
    pub fn read_file(&self, path: &str) -> Option<String> {
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        LimeOSKernel::read_file_recursive(&self.filesystem.root, &parts)
    }

    fn read_file_recursive(node: &FsNode, parts: &[&str]) -> Option<String> {
        if parts.is_empty() {
            node.content.clone()
        } else {
            let dirname = parts[0];
            let remaining = &parts[1..];
            node.children
                .iter()
                .find(|c| c.name == dirname)
                .and_then(|child| LimeOSKernel::read_file_recursive(child, remaining))
        }
    }

    #[wasm_bindgen]
    pub fn list_directory(&self, path: &str) -> JsValue {
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        let node = self.find_node(&self.filesystem.root, &parts);
        if let Some(node) = node {
            serde_wasm_bindgen::to_value(&node.children).unwrap()
        } else {
            JsValue::NULL
        }
    }

    fn find_node<'a>(&'a self, node: &'a FsNode, parts: &[&str]) -> Option<&'a FsNode> {
        if parts.is_empty() {
            Some(node)
        } else {
            let dirname = parts[0];
            let remaining = &parts[1..];
            node.children
                .iter()
                .find(|c| c.name == dirname)
                .and_then(|child| self.find_node(child, remaining))
        }
    }

    #[wasm_bindgen]
    pub fn get_system_info(&self) -> JsValue {
        let info = serde_json::json!({
            "kernel": "LimeOS 1.0.0",
            "architecture": "WebAssembly",
            "processes": self.processes.len(),
            "uptime": js_sys::Date::now() as u64,
            "memory": {
                "used": self.processes.iter().map(|p| p.memory_usage).sum::<u64>(),
                "total": 134217728, // 128MB
            }
        });
        serde_wasm_bindgen::to_value(&info).unwrap()
    }

    #[wasm_bindgen]
    pub fn execute_command(&mut self, command: &str) -> String {
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            return "No command provided".to_string();
        }

        match parts[0] {
            "ls" => {
                let path = if parts.len() > 1 { parts[1] } else { "/" };
                let listing = self.list_directory(path);
                format!("Directory listing for {}: {:?}", path, listing)
            }
            "ps" => {
                format!("Processes: {:?}", self.processes)
            }
            "echo" => {
                parts[1..].join(" ")
            }
            "uname" => {
                "LimeOS 1.0.0 WebAssembly".to_string()
            }
            _ => {
                format!("Command '{}' not found", parts[0])
            }
        }
    }
}

// Utility functions
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    if n <= 1 {
        n
    } else {
        fibonacci(n - 1) + fibonacci(n - 2)
    }
}

#[wasm_bindgen]
pub fn benchmark_computation(iterations: u32) -> u32 {
    let mut result = 0;
    for i in 0..iterations {
        result += fibonacci((i % 20) + 1);
    }
    result
}