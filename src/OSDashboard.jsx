
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Cpu, Settings, X, Minus, Square, Code, Activity, Wifi, Battery, Volume2, Search, Menu, MessageSquare, Sparkles, Send, Brain, RefreshCw } from 'lucide-react';
import { SYSTEM_THEME, APPS } from './utils/constants.js';

// Import all app components
import ProtonMailApp from './components/ProtonMailApp.jsx';
import ProtonVPNApp from './components/ProtonVPNApp.jsx';
import SecureNotepadApp from './components/SecureNotepadApp.jsx';
import ROSChecksApp from './components/ROSChecksApp.jsx';
import DarkNetOpsApp from './components/DarkNetOpsApp.jsx';

// Component mapping
const COMPONENT_MAP = {
  ProtonMailApp,
  ProtonVPNApp,
  SecureNotepadApp,
  ROSChecksApp,
  DarkNetOpsApp,
};

// --- MAIN OS COMPONENT ---

export default function App() {
  const [windows, setWindows] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  // Dragging state
  const dragInfo = useRef({ isDragging: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0, windowId: null });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openApp = (appKey) => {
    const app = APPS[appKey];
    if (windows.find(w => w.id === app.id)) {
      setActiveWindowId(app.id);
      // Bring to front and un-minimize
      setWindows(prev => prev.map(w => w.id === app.id ? { ...w, isMinimized: false, zIndex: getNextZ() } : w));
      return;
    }

    const newWindow = {
      ...app,
      x: 50 + (windows.length * 30),
      y: 50 + (windows.length * 30),
      zIndex: getNextZ(),
      isMinimized: false,
      isMaximized: false
    };

    setWindows([...windows, newWindow]);
    setActiveWindowId(app.id);
    setMenuOpen(false);
  };

  const closeWindow = (id, e) => {
    e.stopPropagation();
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const minimizeWindow = (id, e) => {
    e.stopPropagation();
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
    setActiveWindowId(null);
  };

  const toggleMaximize = (id, e) => {
    e.stopPropagation();
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  const focusWindow = (id) => {
    setActiveWindowId(id);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: getNextZ() } : w));
  };

  const getNextZ = () => {
    const maxZ = Math.max(0, ...windows.map(w => w.zIndex || 0));
    return maxZ + 1;
  };

  // Drag Handlers
  const handleMouseDown = (e, id) => {
    if (e.target.closest('.window-controls')) return; // Don't drag if clicking buttons
    const win = windows.find(w => w.id === id);
    if (!win || win.isMaximized) return;

    focusWindow(id);
    dragInfo.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: win.x,
      initialTop: win.y,
      windowId: id
    };
  };

  const handleMouseMove = (e) => {
    if (!dragInfo.current.isDragging) return;
    
    const { startX, startY, initialLeft, initialTop, windowId } = dragInfo.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    setWindows(prev => prev.map(w => {
      if (w.id === windowId) {
        return { ...w, x: initialLeft + dx, y: initialTop + dy };
      }
      return w;
    }));
  };

  const handleMouseUp = () => {
    dragInfo.current.isDragging = false;
  };



  return (
    <>
    <style>{`
      /* Custom Scrollbar Styling (Matches OS Theme) */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #0f172a;
      }
      ::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 4px;
        border: 2px solid #0f172a;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #ea580c;
      }
      /* Animation Utilities */
      @keyframes fadeInSlideUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-in {
        animation: fadeInSlideUp 0.2s ease-out forwards;
      }
    `}</style>
    <div 
      className={`h-screen w-full overflow-hidden flex flex-col ${SYSTEM_THEME.bg} text-slate-100 font-sans select-none`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* DESKTOP AREA */}
      <div className="flex-1 relative p-4">
        {/* Desktop Icons */}
        <div className="flex flex-col flex-wrap gap-4 items-start content-start h-full absolute top-4 left-4 z-0">
          {Object.keys(APPS).map(key => {
            const app = APPS[key];
            return (
              <div 
                key={app.id} 
                className="w-24 flex flex-col items-center gap-1 group cursor-pointer p-2 rounded hover:bg-white/10 transition"
                onClick={() => openApp(key)}
              >
                <div className={`w-12 h-12 rounded-xl ${SYSTEM_THEME.accent} text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                  {app.icon}
                </div>
                <span className="text-xs font-medium text-center drop-shadow-md">{app.title}</span>
              </div>
            );
          })}
        </div>

        {/* Windows */}
        {windows.map(win => !win.isMinimized && (
          <div
            key={win.id}
            onMouseDown={(e) => handleMouseDown(e, win.id)}
            style={{
              zIndex: win.zIndex,
              left: win.isMaximized ? 0 : win.x,
              top: win.isMaximized ? 0 : win.y,
              width: win.isMaximized ? '100%' : win.defaultSize.w,
              height: win.isMaximized ? '100%' : win.defaultSize.h,
            }}
            className={`absolute flex flex-col ${SYSTEM_THEME.windowBg} rounded-lg border ${SYSTEM_THEME.border} shadow-2xl overflow-hidden backdrop-blur-sm bg-opacity-95 transition-all duration-75`}
          >
            {/* Window Title Bar */}
            <div className={`h-8 ${SYSTEM_THEME.bg} flex items-center justify-between px-3 border-b ${SYSTEM_THEME.border} cursor-default`}>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                {win.icon}
                <span>{win.title}</span>
              </div>
              <div className="flex items-center gap-1 window-controls">
                <button onClick={(e) => minimizeWindow(win.id, e)} className="p-1 hover:bg-slate-700 rounded"><Minus size={14}/></button>
                <button onClick={(e) => toggleMaximize(win.id, e)} className="p-1 hover:bg-slate-700 rounded"><Square size={12}/></button>
                <button onClick={(e) => closeWindow(win.id, e)} className="p-1 hover:bg-red-600 rounded group"><X size={14} className="group-hover:text-white"/></button>
              </div>
            </div>
            
            {/* Window Content */}
            <div className="flex-1 overflow-auto bg-opacity-90 relative">
              {React.createElement(COMPONENT_MAP[win.component])}
            </div>
          </div>
        ))}
      </div>

      {/* TASKBAR */}
      <div className={`h-12 ${SYSTEM_THEME.windowBg} border-t ${SYSTEM_THEME.border} flex items-center px-2 justify-between z-50 relative shadow-xl`}>
        
        <div className="flex items-center gap-2">
          {/* Start Button */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-2 rounded hover:bg-white/10 transition ${menuOpen ? 'bg-white/10' : ''}`}
          >
            <div className="flex items-center gap-2 font-bold text-lime-500">
              <Code size={24} strokeWidth={2.5} />
              <span className="hidden sm:inline">LIMEOS</span>
            </div>
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-black/20 rounded px-2 py-1 ml-2 border border-white/5">
            <Search size={14} className="text-slate-400 mr-2"/>
            <input className="bg-transparent border-none outline-none text-xs w-32 placeholder-slate-500" placeholder="Type to search..." />
          </div>
        </div>

        {/* Taskbar Items */}
        <div className="flex-1 flex justify-center gap-1 px-4">
          {windows.map(win => (
            <button
              key={win.id}
              onClick={() => win.isMinimized ? openApp(Object.keys(APPS).find(key => APPS[key].id === win.id)) : focusWindow(win.id)}
              className={`p-2 rounded transition flex items-center gap-2 max-w-[150px] ${
                activeWindowId === win.id && !win.isMinimized ? 'bg-white/10 shadow-inner border-b-2 border-lime-500' : 'hover:bg-white/5 opacity-70'
              }`}
            >
              {win.icon}
              <span className="text-xs truncate hidden sm:block">{win.title}</span>
            </button>
          ))}
        </div>

        {/* System Tray */}
        <div className="flex items-center gap-4 px-2 text-slate-400 text-xs">
          <div className="flex gap-2">
             <Wifi size={16} />
             <Volume2 size={16} />
             <Battery size={16} />
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-200">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            <div className="text-[10px]">{time.toLocaleDateString()}</div>
          </div>
        </div>

        {/* START MENU */}
        {menuOpen && (
          <div className="absolute bottom-14 left-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-2 flex flex-col gap-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
             <div className="p-3 border-b border-slate-700 mb-2">
               <div className="font-bold text-lg">Guest User</div>
               <div className="text-xs text-slate-400">Local Account</div>
             </div>
             
             <div className="space-y-1">
               <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1">Applications</div>
               {Object.keys(APPS).map(key => (
                 <button 
                  key={key}
                  onClick={() => openApp(key)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-lime-600/20 hover:text-lime-400 transition flex items-center gap-3"
                 >
                   {APPS[key].icon}
                   <span className="text-sm font-medium">{APPS[key].title}</span>
                 </button>
               ))}
             </div>

             <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between px-2 pb-1">
                <button className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><Settings size={18} /></button>
                <button className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded text-xs font-bold transition">SHUT DOWN</button>
             </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
