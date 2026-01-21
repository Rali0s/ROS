import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { callGemini } from '../utils/gemini';

const AIAssistantApp = () => {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Hello! I am Lime, your AI assistant. Ask me anything about programming, this OS, or coding in general!' }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const prompt = `You are a helpful AI assistant named "Lime" inside a web-based operating system simulation. You love programming and technology.
    User query: ${userMsg}`;

    const response = await callGemini(prompt);
    setMessages(prev => [...prev, { role: 'system', text: response }]);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm shadow-md ${
              msg.role === 'user'
                ? 'bg-orange-600 text-white rounded-br-none'
                : 'bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600'
            }`}>
              {msg.role === 'system' && <div className="flex items-center gap-2 mb-1 text-lime-400 font-bold text-xs"><Sparkles size={10} /> Lime</div>}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-slate-700 p-3 rounded-lg rounded-bl-none flex items-center gap-2 text-xs text-slate-400">
               <Sparkles size={12} className="animate-spin text-lime-500" /> Thinking...
             </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Lime anything..."
          className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-lime-500 transition"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-lime-600 hover:bg-lime-500 disabled:opacity-50 text-white p-2 rounded transition"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIAssistantApp;