import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('cc_theme', dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
  }, [dark]);

  return (
    <motion.button
      onClick={() => setDark(d => !d)}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 brutal-shadow-sm cursor-pointer"
    >
      <motion.span
        key={dark ? 'moon' : 'sun'}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </motion.span>
    </motion.button>
  );
}
