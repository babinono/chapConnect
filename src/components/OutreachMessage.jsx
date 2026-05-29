import React, { useState } from 'react';
import { Copy, Check, MessageSquare } from 'lucide-react';
import { cn } from '../utils/cn';

export default function OutreachMessage({ outreachMessage }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(outreachMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border-4 border-slate-900 rounded-2xl brutal-shadow p-6 flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-red-500 border-2 border-slate-900 rounded-lg brutal-shadow-sm rotate-[-4deg]">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Reach Out</h3>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase tracking-widest">Pre-drafted template</p>
        </div>
      </div>

      <div className="flex-grow flex flex-col">
        <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-4 text-slate-900 whitespace-pre-wrap font-medium text-sm leading-relaxed mb-6 flex-grow shadow-[inset_3px_3px_0px_0px_rgba(0,0,0,0.1)]">
          {outreachMessage}
        </div>
        
        <button
          onClick={handleCopy}
          className={cn(
            "w-full py-4 px-6 rounded-xl font-black uppercase tracking-wider flex items-center justify-center space-x-2 border-2 border-slate-900 brutal-shadow transition-all",
            copied 
              ? "bg-green-500 text-white" 
              : "bg-blue-600 text-white"
          )}
        >
          {copied ? (
            <>
              <Check className="w-6 h-6 stroke-[3]" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-6 h-6 stroke-[3]" />
              <span>Copy Message</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
