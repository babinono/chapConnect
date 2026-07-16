import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function WelcomeScreen({ session }) {
  const [name, setName] = useState(session?.user?.user_metadata?.full_name || '');
  const [gradYear, setGradYear] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user?.id) {
      // If dev profile was reset, bypass automated dashboard redirect to let them onboard fresh
      if (localStorage.getItem('dev_profile_reset') === 'true') {
        console.log("WelcomeScreen: dev_profile_reset flag is active. Bypassing automatic redirect.");
        return;
      }

      supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
           if (data && data.length > 0) {
             navigate('/dashboard', { replace: true });
           }
        });
    }
  }, [session, navigate]);

  const handleStart = (e) => {
    e.preventDefault();
    if (!name || !gradYear) return;
    
    const year = parseInt(gradYear, 10);
    let flow = 'student';
    if (year <= 2023) flow = 'post_college';
    else if (year <= 2026) flow = 'recent';

    navigate('/onboarding', { state: { name, gradYear: year, flow } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="w-full max-w-sm bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-2xl p-8 brutal-shadow"
      >
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ rotate: -12, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
            className="p-3 gradient-brand rounded-xl brutal-shadow-sm animate-float"
          >
            <Zap className="w-10 h-10 text-white fill-current" />
          </motion.div>
        </div>

        <h1 className="text-4xl font-bold text-center text-slate-900 dark:text-slate-100 mb-2 tracking-tight">
          Chap Connect
        </h1>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-8 font-bold border-b-2 border-slate-200 dark:border-white/10 pb-4">
          The Westlake Network.
        </p>

        <form onSubmit={handleStart} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-wide">Your Name</label>
            <input
              type="text"
              required
              placeholder="Jane Doe"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 dark:bg-[#0c1324] font-medium"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-wide">Grad Year</label>
            <input
              type="number"
              required
              min="1950"
              max="2035"
              placeholder="2024"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 dark:bg-[#0c1324] font-medium"
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="w-full mt-4 bg-blue-600 text-white font-bold py-4 px-4 rounded-xl brutal-shadow flex items-center justify-center space-x-2 tracking-wide cursor-pointer"
          >
            <span>Let's Go</span>
            <ArrowRight className="w-6 h-6" />
          </motion.button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10">
          <motion.button
            type="button"
            onClick={() => navigate('/admin')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-white dark:bg-[#0c1324] text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center space-x-2 tracking-wide cursor-pointer hover:text-blue-700"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Admin Account</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
