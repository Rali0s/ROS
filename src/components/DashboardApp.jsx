import React, { useState, useEffect } from 'react';
import { Sparkles, Cpu, Activity } from 'lucide-react';
import { callGemini } from '../utils/gemini';
import { useSystemInfo, useProcesses } from '../utils/useLimeOSKernel';

const DashboardApp = () => {
  const systemInfo = useSystemInfo();
  const { processes, createProcess } = useProcesses();
  const [stats, setStats] = useState({ cpu: 12, ram: 34, temp: 45 });
  const [dailyQuote, setDailyQuote] = useState("Loading system wisdom...");

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 30) + 10,
        ram: Math.floor(Math.random() * 10) + 30,
        temp: Math.floor(Math.random() * 5) + 40
      });
    }, 2000);

    // Fetch daily quote on mount
    const fetchQuote = async () => {
      const q = await callGemini("Give me a short, inspiring, one-sentence quote about low-level programming, Rust, or computer science. No quotes around the response.");
      setDailyQuote(q);
    };
    fetchQuote();

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full p-4 grid grid-cols-1 gap-4 text-slate-200 grid-rows-[auto_1fr_1fr]">
      {/* AI QUOTE SECTION */}
      <div className="bg-slate-800 p-3 rounded-lg border border-lime-500/20 shadow-lg flex items-start gap-3">
        <Sparkles size={20} className="text-lime-500 mt-1 shrink-0" />
        <div>
           <h4 className="text-xs font-bold text-lime-400 uppercase tracking-wider mb-1">Daily Wisdom</h4>
           <p className="text-sm italic text-slate-300">"{dailyQuote}"</p>
        </div>
      </div>

      {/* SYSTEM INFO */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold mb-3 text-lime-400">System Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Kernel:</span>
            <span className="ml-2 text-lime-300">{systemInfo?.kernel || 'Loading...'}</span>
          </div>
          <div>
            <span className="text-slate-400">Processes:</span>
            <span className="ml-2 text-lime-300">{processes?.length || 0}</span>
          </div>
          <div>
            <span className="text-slate-400">Architecture:</span>
            <span className="ml-2 text-lime-300">{systemInfo?.architecture || 'WebAssembly'}</span>
          </div>
          <div>
            <span className="text-slate-400">Memory Used:</span>
            <span className="ml-2 text-lime-300">
              {systemInfo?.memory?.used ? `${(systemInfo.memory.used / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* PERFORMANCE METRICS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
          <Cpu className="text-lime-500 mb-2" size={32} />
          <span className="text-2xl font-bold">{stats.cpu}%</span>
          <span className="text-xs text-slate-400">CPU Usage</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
          <Activity className="text-blue-500 mb-2" size={24} />
          <span className="text-xl font-bold">{stats.ram}%</span>
          <span className="text-xs text-slate-400">RAM</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
          <Activity className="text-red-500 mb-2" size={24} />
          <span className="text-xl font-bold">{stats.temp}°C</span>
          <span className="text-xs text-slate-400">Temp</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardApp;