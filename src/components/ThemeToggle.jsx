import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
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
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-9 h-9 flex items-center justify-center bg-surface border border-rule text-ink cursor-pointer hover:border-rule-strong transition-colors ${className}`}
    >
      <motion.span
        key={dark ? 'moon' : 'sun'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </motion.span>
    </motion.button>
  );
}
