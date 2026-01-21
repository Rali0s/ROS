import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const CHECKLIST = [
  'Ensure VPN is running.',
  'Active ping against DNS.',
  'DNS leak tests.',
  'DNSCrypt status checks.',
  'Notice of any dropped packets.',
  'Safety check to use Proton.',
  'PII checks: "HEY DIPSHIT - You Left Google Logged In Your VPN".',
  'Follow TLDR files for SGX security — leave SGX out for now; use fallback only.',
  'Display NAT IP.',
  'IPv6 valid or not.',
  'I2P status external to Proton.',
  'Tor status external to Proton.',
  'Port checks on 9050, 9051 and I2P router status.',
  'TomCat use-case for cloud ops and IPsec — not there yet.',
  'Local use only for now.',
  'ROS-checks.',
  'ROS-OS use-case: "DarkNet Operations Monitoring".',
];

const ROSChecksApp = () => {
  return (
    <div className="h-full p-4 flex flex-col gap-4 text-slate-100">
      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-400/20 flex items-center justify-center">
          <CheckCircle2 className="text-emerald-300" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-emerald-200">ROS Checks</h3>
          <p className="text-sm text-slate-300">Operational checklist for secure monitoring.</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex-1 overflow-auto">
        <ul className="space-y-3 text-sm text-slate-300">
          {CHECKLIST.map((item, index) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1 text-emerald-400">{index + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="text-amber-300 mt-1" size={18} />
        <p className="text-sm text-slate-300">
          Status indicators are placeholders until a live Python web interface with DownDetection is wired in.
        </p>
      </div>
    </div>
  );
};

export default ROSChecksApp;
