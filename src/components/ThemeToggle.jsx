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
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed top-4 right-4 z-50 w-11 h-11 flex items-center justify-center bg-surface border border-rule text-ink cursor-pointer panel"
    >
      <motion.span
        key={dark ? 'moon' : 'sun'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </motion.span>
    </motion.button>
  );
}
