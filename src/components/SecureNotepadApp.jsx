import React from 'react';
import { NotebookPen, ShieldAlert } from 'lucide-react';

const SecureNotepadApp = () => {
  return (
    <div className="h-full p-4 flex flex-col gap-4 text-slate-100">
      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-400/20 flex items-center justify-center">
          <NotebookPen className="text-amber-300" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-amber-200">Secure Notepad</h3>
          <p className="text-sm text-slate-300">"Sell me this pen."</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-amber-200 mb-3">Mission Notes</h4>
        <div className="text-sm text-slate-300 space-y-2">
          <p><span className="text-amber-300">•</span> Number one focus: secure notepad workflow and clear briefing.</p>
          <p><span className="text-amber-300">•</span> What if I can not afford the proper Dark Lab Materials Sheet?</p>
          <p><span className="text-amber-300">•</span> Local use only for now; keep anything cloud-bound out of scope.</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="text-rose-400 mt-1" size={18} />
          <div>
            <h4 className="text-sm font-semibold text-rose-300 mb-2">PII Guardrail</h4>
            <p className="text-sm text-slate-300">
              "HEY DIPSHIT - You Left Google Logged In Your VPN"
            </p>
            <p className="text-xs text-slate-400 mt-2">Treat as a reminder to audit active sessions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureNotepadApp;
