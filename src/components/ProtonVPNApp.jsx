import React from 'react';
import { Shield, Wifi, Globe, Router, Activity } from 'lucide-react';

const ProtonVPNApp = () => {
  return (
    <div className="h-full p-4 grid grid-cols-1 gap-4 text-slate-100">
      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Shield className="text-blue-300" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-blue-200">Proton VPN Control</h3>
          <p className="text-sm text-slate-300">Monitor tunnel, DNS, and routing safety.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Wifi size={16} className="text-lime-400" /> VPN Tunnel
            </span>
            <span className="text-xs text-amber-300 bg-amber-400/10 px-2 py-1 rounded">Awaiting check</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Router size={16} className="text-sky-400" /> NAT IP
            </span>
            <span className="text-sm text-slate-200">Pending detection</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Globe size={16} className="text-blue-400" /> IPv6
            </span>
            <span className="text-sm text-slate-200">Unknown</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300 flex items-center gap-2">
              <Activity size={16} className="text-rose-400" /> Dropped Packets
            </span>
            <span className="text-sm text-slate-200">Monitoring</span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-200 mb-3">DNS & Leak Tests</h4>
          <ul className="text-sm text-slate-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-300">•</span>
              Active ping against DNS while tunnel is live.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-300">•</span>
              Run DNS leak test suite and record results.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-300">•</span>
              Confirm DNSCrypt status checks before proceeding.
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-200 mb-3">Safety Checklist</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
          <div className="bg-slate-950/40 border border-slate-800 rounded p-3">
            Ensure VPN is running before any outbound activity.
          </div>
          <div className="bg-slate-950/40 border border-slate-800 rounded p-3">
            Confirm Proton usage for sensitive workflows only.
          </div>
          <div className="bg-slate-950/40 border border-slate-800 rounded p-3">
            Monitor for dropped packets and log any anomalies.
          </div>
          <div className="bg-slate-950/40 border border-slate-800 rounded p-3">
            Verify external Tor/I2P status outside the tunnel.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtonVPNApp;
