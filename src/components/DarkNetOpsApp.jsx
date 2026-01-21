import React from 'react';
import { Radar, Server, Code2 } from 'lucide-react';

const DarkNetOpsApp = () => {
  return (
    <div className="h-full p-4 grid grid-cols-1 gap-4 text-slate-100">
      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Radar className="text-purple-300" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-purple-200">DarkNet Operations Monitoring</h3>
          <p className="text-sm text-slate-300">ROS-OS use-case briefing and future tooling.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-200 mb-3 flex items-center gap-2">
            <Code2 size={16} className="text-purple-300" />
            Build Direction
          </h4>
          <ul className="text-sm text-slate-300 space-y-2">
            <li>Language: Python.</li>
            <li>Web interface with DownDetection visibility.</li>
            <li>See all bullets in ROS Checks before execution.</li>
          </ul>
        </div>
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-200 mb-3 flex items-center gap-2">
            <Server size={16} className="text-purple-300" />
            Infrastructure Notes
          </h4>
          <ul className="text-sm text-slate-300 space-y-2">
            <li>TomCat use-case for cloud ops and IPsec: not there yet.</li>
            <li>Fallback-only posture while SGX is out of scope.</li>
            <li>Local use only for now.</li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-purple-200 mb-2">Resource Question</h4>
        <p className="text-sm text-slate-300">
          What if I can not afford the proper Dark Lab Materials Sheet? Capture constraints before planning.
        </p>
      </div>
    </div>
  );
};

export default DarkNetOpsApp;
