import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './utils/supabaseClient';
import WelcomeScreen from './components/WelcomeScreen';
import OnboardingFlow from './components/OnboardingFlow';
import MatchPage from './pages/MatchPage';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import AdminCRM from './pages/AdminCRM';
import ThemeToggle from './components/ThemeToggle';
import { Loader2 } from 'lucide-react';

// Cross-fade + slide between routes; exit is quick so back/forward stays snappy.
function AnimatedRoutes({ session }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<WelcomeScreen session={session} />} />
          <Route path="/onboarding" element={<OnboardingFlow session={session} />} />
          <Route path="/match" element={<MatchPage session={session} />} />
          <Route path="/dashboard" element={<Dashboard session={session} />} />
          <Route path="/directory" element={<Directory session={session} />} />
          <Route path="/admin" element={<AdminCRM session={session} />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// Build (or reuse) a stable local session so the app opens straight into the
// experience without a login wall. The id is a valid UUID persisted per device
// so it stays consistent with the Supabase user_id columns.
function ensureLocalSession() {
  let localId = localStorage.getItem('mock_user_id');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!localId || !uuidRegex.test(localId)) {
    localId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem('mock_user_id', localId);
  }

  return {
    user: {
      id: localId,
      email: `chap.${localId.substring(0, 8)}@chapconnect.local`,
      user_metadata: { full_name: '' }
    }
  };
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Use a real Supabase session if one exists; otherwise auto-enter locally.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session || ensureLocalSession());
      setLoading(false);
    });

    // 2. Listen to authentication changes (falls back to local session on sign-out).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session || ensureLocalSession());
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#0c1324]">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Initializing Session...</h2>
      </div>
    );
  }

  return (
    <div className="relative">
      <ThemeToggle />
      <BrowserRouter>
        <AnimatedRoutes session={session} />
      </BrowserRouter>
    </div>
  );
}

export default App;
