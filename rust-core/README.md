# LimeOS Rust Core

This directory contains the core LimeOS functionality implemented in Rust and compiled to WebAssembly for high-performance operations.

## Features

- **Process Management**: Create, manage, and monitor system processes
- **File System**: Virtual file system with directory and file operations
- **System Commands**: Basic shell command execution
- **Performance**: High-performance computations using Rust's efficiency

## Building

### Prerequisites

1. Install Rust: https://rustup.rs/
2. Install wasm-pack:
   ```bash
   cargo install wasm-pack
   ```

### Build WebAssembly

```bash
cd rust-core
wasm-pack build --target web --out-dir pkg
```

This will generate the WebAssembly files in `pkg/` directory.

## Usage in React

The WASM module can be imported and used in React components:

```javascript
import init, { LimeOSKernel } from './pkg/limeos_core.js';

async function loadKernel() {
  await init();
  const kernel = new LimeOSKernel();
  // Use kernel methods
}
```

## API Reference

### LimeOSKernel

- `new()` - Create new kernel instance
- `create_process(name)` - Create a new process
- `kill_process(pid)` - Kill a process by ID
- `get_processes()` - Get all processes as JSON
- `create_file(path, content)` - Create/update a file
- `read_file(path)` - Read file content
- `list_directory(path)` - List directory contents
- `execute_command(cmd)` - Execute system command
- `get_system_info()` - Get system information

### Utility Functions

- `fibonacci(n)` - Calculate nth Fibonacci number
- `benchmark_computation(iterations)` - Performance benchmark