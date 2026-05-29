import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

export default function WelcomeScreen() {
  const [name, setName] = useState('');
  const [gradYear, setGradYear] = useState('');
  const navigate = useNavigate();

  const handleStart = (e) => {
    e.preventDefault();
    if (!name || !gradYear) return;
    
    const year = parseInt(gradYear, 10);
    let flow = 'student';
    if (year <= 2010) flow = 'established';
    else if (year <= 2025) flow = 'recent';

    navigate('/onboarding', { state: { name, gradYear: year, flow } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border-4 border-slate-900 rounded-2xl p-8 brutal-shadow transition-all">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-red-500 border-2 border-slate-900 rounded-xl brutal-shadow-sm rotate-[-5deg]">
            <Zap className="w-10 h-10 text-white fill-current" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-center text-slate-900 mb-2 uppercase tracking-tight">
          Chap Connect
        </h1>
        <p className="text-center text-slate-600 mb-8 font-bold border-b-2 border-slate-200 pb-4">
          The Westlake Network.
        </p>

        <form onSubmit={handleStart} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-slate-900 mb-2 uppercase tracking-wide">Your Name</label>
            <input
              type="text"
              required
              placeholder="Jane Doe"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 font-medium"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-black text-slate-900 mb-2 uppercase tracking-wide">Grad Year</label>
            <input
              type="number"
              required
              min="1950"
              max="2035"
              placeholder="2024"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 font-medium"
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 text-white font-black py-4 px-4 border-2 border-slate-900 rounded-xl brutal-shadow flex items-center justify-center space-x-2 transition-all uppercase tracking-wider"
          >
            <span>Let's Go</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}
