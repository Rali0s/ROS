import React, { useState, useEffect, useRef } from 'react';
import { callGemini } from '../utils/gemini';
import { useCommandExecution } from '../utils/useLimeOSKernel';

const TerminalApp = () => {
  const executeCommand = useCommandExecution();
  const [history, setHistory] = useState([
    "Welcome to LimeTerm v1.1.0",
    "Type 'help' for commands, 'lime' for a tip, or 'ask <query>' to ask AI.",
    ""
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = async (e) => {
    if (e.key === 'Enter' && !isProcessing) {
      const cmdRaw = input;
      const cmd = input.trim();
      setInput("");
      setIsProcessing(true);

      // Add user command to history immediately
      setHistory(prev => [...prev, `> ${cmdRaw}`]);

      const parts = cmd.split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      let response = "";

      if (command === 'ask') {
        if (!args) {
          response = "Usage: ask <your question>";
        } else {
          // Temporary loading message
          setHistory(prev => [...prev, "Processing query with AI..."]);
          const aiResponse = await callGemini(`Answer this terminal command query briefly and technically: ${args}`);

          // Replace loading message with actual response
          setHistory(prev => {
            const newHist = [...prev];
            newHist.pop(); // Remove "Processing..."
            return [...newHist, aiResponse];
          });
          setIsProcessing(false);
          return;
        }
      } else {
        switch(command) {
          case 'help':
            response = "Available commands: help, clear, lime, whoami, date, ask <query>, ls, ps, uname, echo";
            break;
          case 'lime':
            const tips = [
              "LimeOS Tip: This operating system is built with modern web technologies.",
              "LimeOS Tip: You can run multiple applications simultaneously in windows.",
              "LimeOS Tip: The AI assistant can help you with programming questions.",
              "LimeOS Tip: Use the terminal to interact with the system directly.",
              "LimeOS Tip: The core is written in Rust for high performance."
            ];
            response = tips[Math.floor(Math.random() * tips.length)];
            break;
          case 'clear':
            setHistory([]);
            setIsProcessing(false);
            return;
          case 'whoami':
            response = "user@lime-os";
            break;
          case 'date':
            response = new Date().toString();
            break;
          case 'ls':
          case 'ps':
          case 'uname':
          case 'echo':
            response = executeCommand(cmd);
            break;
          case '':
            response = null;
            break;
          default:
            response = `Command not found: ${command}`;
        }
      }

      if (response) {
        setHistory(prev => [...prev, response]);
      }
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col font-mono text-sm bg-black p-2 text-green-400">
      <div className="flex-1 overflow-y-auto space-y-1">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line}</div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex items-center mt-2 border-t border-green-900 pt-2">
        <span className="mr-2 text-blue-400">~</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleCommand}
          disabled={isProcessing}
          className="flex-1 bg-transparent outline-none text-green-400 placeholder-green-800 disabled:opacity-50"
          placeholder={isProcessing ? "Processing..." : "Enter command..."}
          autoFocus
        />
      </div>
    </div>
  );
};

export default TerminalApp;