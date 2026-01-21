import { useState, useEffect, useRef } from 'react';

// Dynamic import for WASM module
let wasmModule = null;
let LimeOSKernel = null;

const loadWasm = async () => {
  if (!wasmModule) {
    try {
      // Try to import WASM module, but handle if it doesn't exist
      const modulePath = '../rust-core/pkg/limeos_core.js';
      wasmModule = await import(/* @vite-ignore */ modulePath);
      await wasmModule.default();
      LimeOSKernel = wasmModule.LimeOSKernel;
    } catch (error) {
      console.warn('WASM module not available, using mock kernel:', error.message);
      // Fallback: create a mock kernel for development
      LimeOSKernel = class MockKernel {
        constructor() {
          this.processes = [];
          this.nextPid = 1;
        }

        create_process(name) {
          const pid = this.nextPid++;
          this.processes.push({ id: pid, name, status: 'Running' });
          return pid;
        }

        get_processes() {
          return this.processes;
        }

        execute_command(cmd) {
          return `Mock execution: ${cmd}`;
        }

        get_system_info() {
          return {
            kernel: 'LimeOS Mock',
            processes: this.processes.length,
            uptime: Date.now(),
          };
        }
      };
    }
  }
  return LimeOSKernel;
};

export const useLimeOSKernel = () => {
  const [kernel, setKernel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initKernel = async () => {
      try {
        const KernelClass = await loadWasm();
        const kernelInstance = new KernelClass();
        setKernel(kernelInstance);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    initKernel();
  }, []);

  return { kernel, isLoading, error };
};

export const useSystemInfo = () => {
  const { kernel } = useLimeOSKernel();
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    if (kernel && kernel.get_system_info) {
      const info = kernel.get_system_info();
      setSystemInfo(info);
    }
  }, [kernel]);

  return systemInfo;
};

export const useProcesses = () => {
  const { kernel } = useLimeOSKernel();
  const [processes, setProcesses] = useState([]);

  useEffect(() => {
    if (kernel && kernel.get_processes) {
      const procs = kernel.get_processes();
      setProcesses(procs);
    }
  }, [kernel]);

  const createProcess = (name) => {
    if (kernel && kernel.create_process) {
      return kernel.create_process(name);
    }
  };

  const killProcess = (pid) => {
    if (kernel && kernel.kill_process) {
      return kernel.kill_process(pid);
    }
  };

  return { processes, createProcess, killProcess };
};

export const useFileSystem = () => {
  const { kernel } = useLimeOSKernel();

  const createFile = (path, content) => {
    if (kernel && kernel.create_file) {
      return kernel.create_file(path, content);
    }
  };

  const readFile = (path) => {
    if (kernel && kernel.read_file) {
      return kernel.read_file(path);
    }
  };

  const listDirectory = (path) => {
    if (kernel && kernel.list_directory) {
      return kernel.list_directory(path);
    }
  };

  return { createFile, readFile, listDirectory };
};

export const useCommandExecution = () => {
  const { kernel } = useLimeOSKernel();

  const executeCommand = (command) => {
    if (kernel && kernel.execute_command) {
      return kernel.execute_command(command);
    }
    return `Command not supported: ${command}`;
  };

  return executeCommand;
};