import React from 'react';
import { Mail, ShieldCheck, Inbox, Lock } from 'lucide-react';

const ProtonMailApp = () => {
  return (
    <div className="h-full p-4 grid grid-cols-1 gap-4 text-slate-100">
      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-lime-500/20 flex items-center justify-center">
          <Mail className="text-lime-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-lime-300">Proton Mail Status</h3>
          <p className="text-sm text-slate-300">Encrypted inbox overview for secure operations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            <Inbox size={16} className="text-blue-400" />
            Inbox Snapshot
          </div>
          <p className="text-2xl font-semibold text-white">0 New</p>
          <p className="text-xs text-slate-400">Awaiting secure sync.</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            <Lock size={16} className="text-lime-400" />
            Encryption
          </div>
          <p className="text-sm text-slate-200">End-to-end encryption enforced.</p>
          <p className="text-xs text-slate-400">No plaintext storage detected.</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            Safety Check
          </div>
          <p className="text-sm text-slate-200">Use Proton when handling sensitive comms.</p>
          <p className="text-xs text-slate-400">PII checks run before sending.</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-lime-300 mb-3">Secure Messaging Guardrails</h4>
        <ul className="text-sm text-slate-300 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-lime-400">•</span>
            Verify VPN status prior to sending encrypted mail.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lime-400">•</span>
            Confirm no external accounts are logged in before composing sensitive drafts.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lime-400">•</span>
            Keep message metadata minimal: no unnecessary identifiers.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ProtonMailApp;
