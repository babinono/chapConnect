import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

// Clean logo intro: the gradient logo tile pops in with a ripple, then the
// wordmark fades/rises in, then the whole overlay fades away.
export default function IntroSplash() {
  return (
    <motion.div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(1200px 700px at 50% 42%, #16306e 0%, #0a1224 55%, #05070f 100%)' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(6px)' }}
      transition={{ duration: 0.6, ease: [0.7, 0, 0.84, 0] }}
    >
      <div className="relative flex items-center justify-center mb-8">
        {/* ripple ring */}
        <motion.span
          className="absolute rounded-2xl border-2 border-white/25"
          style={{ width: 108, height: 108 }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.9], opacity: [0.7, 0] }}
          transition={{ duration: 1.1, delay: 0.25, ease: 'easeOut' }}
        />
        {/* soft glow */}
        <motion.span
          className="absolute rounded-full"
          style={{ width: 160, height: 160, background: 'radial-gradient(circle, rgba(37,99,235,0.5), transparent 65%)' }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.8, 0.4], scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        {/* logo tile pops in */}
        <motion.div
          className="relative p-5 rounded-2xl gradient-brand shadow-2xl"
          initial={{ scale: 0, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 12 }}
        >
          <Zap className="w-16 h-16 text-white fill-current" />
        </motion.div>
      </div>

      {/* Wordmark fades + rises in */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
        style={{ fontFamily: 'Lexend, sans-serif' }}
      >
        Chap Connect
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="mt-4 text-white/60 font-bold tracking-[0.3em] text-xs"
      >
        THE WESTLAKE NETWORK
      </motion.p>
    </motion.div>
  );
}
