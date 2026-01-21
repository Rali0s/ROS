import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, Lock, Mail, Search } from 'lucide-react';

const BrowserApp = () => {
  const [url, setUrl] = useState("https://mail.proton.me/u/0/inbox");
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="h-full flex flex-col bg-white text-slate-900 font-sans">
      {/* Browser Toolbar */}
      <div className="bg-slate-100 border-b border-slate-300 p-2 flex items-center gap-3">
        <div className="flex gap-2 text-slate-400">
           <ChevronLeft size={18} className="hover:text-slate-600 cursor-pointer"/>
           <ChevronRight size={18} className="hover:text-slate-600 cursor-pointer"/>
           <RotateCw size={18} className={`hover:text-slate-600 cursor-pointer ${loading ? 'animate-spin' : ''}`} onClick={handleRefresh}/>
        </div>
        <div className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs flex items-center gap-2 shadow-sm focus-within:ring-2 ring-purple-500/20 transition-all">
           <Lock size={12} className="text-green-600 shrink-0"/>
           <input
             value={url}
             onChange={(e) => setUrl(e.target.value)}
             className="w-full outline-none text-slate-600 font-medium"
           />
        </div>
      </div>

      {/* Web Content (Mock ProtonMail) */}
      <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
         {loading && (
           <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
             <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
           </div>
         )}

         {/* Sidebar */}
         <div className="w-56 bg-[#181825] text-slate-300 flex flex-col p-4 space-y-6 shrink-0">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
               <Mail size={24} className="fill-current" />
               <span className="font-bold text-lg text-white">Proton Mail</span>
            </div>

            <button className="bg-purple-600 hover:bg-purple-500 text-white py-3 px-4 rounded-full font-bold shadow-lg shadow-purple-900/50 transition-all flex justify-center items-center gap-2">
              <span className="text-lg">+</span> New message
            </button>

            <div className="space-y-1 text-sm font-medium">
               <div className="bg-purple-500/20 text-purple-100 px-3 py-2 rounded-lg flex justify-between items-center cursor-pointer border-l-4 border-purple-500">
                 <div className="flex gap-3">
                   <span className="opacity-90">Inbox</span>
                 </div>
                 <span className="text-xs font-bold text-white bg-purple-600 px-2 py-0.5 rounded-full">2</span>
               </div>
               {['Drafts', 'Sent', 'Starred', 'Archive', 'Spam', 'Trash'].map(item => (
                 <div key={item} className="px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer text-slate-400 hover:text-slate-100 transition-colors">
                   {item}
                 </div>
               ))}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-700">
               <div className="text-xs text-slate-500 font-bold uppercase mb-2">Storage</div>
               <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-purple-500 w-[25%] h-full"></div>
               </div>
               <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>1.25 GB</span>
                  <span>5.00 GB</span>
               </div>
            </div>
         </div>

         {/* Mail List */}
         <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="border-b border-slate-200 p-4 flex justify-between items-center bg-white shadow-sm z-10">
               <div className="font-bold text-lg text-slate-800">Inbox</div>
               <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"><Search size={16}/></div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
               {/* Email Item 1 */}
               <div className="p-4 hover:bg-slate-50 cursor-pointer flex gap-4 items-start group transition-colors border-l-4 border-purple-600 bg-purple-50/10">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">PM</div>
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-baseline mb-1">
                        <span className="font-bold text-slate-900">Proton Team</span>
                        <span className="text-xs text-slate-500 font-medium">10:42 AM</span>
                     </div>
                     <div className="text-sm font-semibold text-slate-800 mb-0.5">Welcome to your secure inbox</div>
                     <div className="text-xs text-slate-500 truncate pr-4">We are excited to have you on board. Your data is protected by Swiss privacy laws and end-to-end encryption.</div>
                  </div>
               </div>

               {/* Email Item 2 */}
               <div className="p-4 hover:bg-slate-50 cursor-pointer flex gap-4 items-start group transition-colors border-l-4 border-transparent">
                  <div className="w-10 h-10 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center font-bold text-sm shrink-0">L</div>
                  <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-baseline mb-1">
                        <span className="font-bold text-slate-700">LimeOS Notification</span>
                        <span className="text-xs text-slate-400">Yesterday</span>
                     </div>
                     <div className="text-sm font-medium text-slate-600 mb-0.5">System Update 1.2.0 Available</div>
                     <div className="text-xs text-slate-400 truncate pr-4">A new update has been installed on your dashboard. Check out the new Quiz App features!</div>
                  </div>
               </div>

               {/* Read Emails */}
               {[1, 2, 3, 4, 5].map((_, i) => (
                  <div key={i} className="p-4 hover:bg-slate-50 cursor-pointer flex gap-4 items-start group transition-colors opacity-70 border-l-4 border-transparent">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline mb-1">
                          <span className="font-bold text-slate-600">Newsletter Service</span>
                          <span className="text-xs text-slate-400">Oct {12 - i}</span>
                       </div>
                       <div className="text-sm font-medium text-slate-500 mb-0.5">Weekly Digest: Tech News</div>
                       <div className="text-xs text-slate-400 truncate pr-4">Here are the top stories from this week in the world of technology and rust programming...</div>
                    </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default BrowserApp;