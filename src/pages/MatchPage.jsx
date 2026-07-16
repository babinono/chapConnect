import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import { findBestMatch } from '../utils/matchingEngine';
import { checkLimit, recordMatch } from '../utils/rateLimiter';
import { supabase } from '../utils/supabaseClient';
import MatchCard from '../components/MatchCard';
import OutreachMessage from '../components/OutreachMessage';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Loader2, Calendar, ShieldAlert, Home } from 'lucide-react';

export default function MatchPage({ session }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [matchData, setMatchData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rateLimitData, setRateLimitData] = useState(null);
  
  const [loadingStep, setLoadingStep] = useState("Analyzing Westlake Alumni Database...");
  
  // Guard against React Strict Mode double-running useEffect in development
  const didRun = useRef(false);

  useEffect(() => {
    if (!isLoading) return;
    const steps = [
      "Analyzing Westlake Alumni Database...",
      "Consulting Gemini AI Matcher...",
      "Synthesizing career & major interests...",
      "Drafting highly customized outreach message..."
    ];
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep]);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    // If no state or profile, navigate away immediately to prevent hanging spinner
    if (!location.state || !location.state.profile) {
      console.warn("MatchPage accessed without location profile state, redirecting to dashboard...");
      navigate(session ? '/dashboard' : '/', { replace: true });
      return;
    }

    if (didRun.current) return;
    didRun.current = true;

    async function getMatch() {
      console.log("MatchPage: starting matchmaking process for profile:", location.state.profile);
      
      // 1. Check rate limit
      const limit = checkLimit();
      if (!limit.allowed) {
        console.warn("MatchPage: Rate limit exceeded");
        setRateLimitData(limit);
        setIsLoading(false);
        return;
      }

      try {
        let result;
        try {
          result = await findBestMatch(location.state.profile);
        } catch (err) {
          const errMsg = err.message || '';
          const isServerError = errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('502') || errMsg.includes('504') || errMsg.includes('500') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch') || errMsg.includes('connection');
          
          if (location.state.profile.matchType === 'ai' && isServerError) {
            console.warn("MatchPage: Gemini AI Match failed with server error. Falling back to Quick Algo Match...", err);
            const fallbackProfile = { ...location.state.profile, matchType: 'algo' };
            result = await findBestMatch(fallbackProfile);
            if (result) {
              result.fallbackToAlgo = true;
              result.fallbackError = errMsg;
            }
          } else {
            throw err;
          }
        }
        console.log("MatchPage: match engine result:", result);
        
        if (result && result.mentor) {
          setMatchData(result);
          // 2. Log match successfully in local storage
          recordMatch();

          // 3. Dynamically increment the match count in Supabase to balance load
          try {
            const currentCount = result.mentor.match_count || 0;
            console.log(`MatchPage: updating mentor ${result.mentor.id} match count to ${currentCount + 1}`);
            await supabase
              .from('mentors')
              .update({ match_count: currentCount + 1 })
              .eq('id', result.mentor.id);
          } catch (updateErr) {
            console.error("MatchPage: failed to update mentor match count:", updateErr);
          }

          // 4. Save match relation securely to user's networking CRM table if not already created
          if (session?.user?.id) {
            try {
              console.log("MatchPage: checking for existing student match entry in database...");
              const { data: existingMatch, error: selectErr } = await supabase
                .from('student_matches')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('mentor_id', result.mentor.id)
                .maybeSingle();

              if (selectErr) {
                console.error("MatchPage: error checking existing matches:", selectErr);
              }

              if (!existingMatch) {
                console.log(`MatchPage: inserting new match for user ${session.user.id} and mentor ${result.mentor.id}`);
                const { error: insertErr } = await supabase
                  .from('student_matches')
                  .insert([{
                    user_id: session.user.id,
                    mentor_id: result.mentor.id,
                    status: 'Matched'
                  }]);
                
                if (insertErr) {
                  console.error("MatchPage: failed to insert student match:", insertErr);
                }
              } else {
                console.log("MatchPage: match entry already exists in database, skipping insert.");
              }
            } catch (dbErr) {
              console.error("MatchPage: database exception during CRM sync:", dbErr);
            }
          }
        } else {
          console.error("MatchPage: match engine returned a null result or missing mentor");
          setError(true);
          setErrorMessage("No matching alumni profiles could be found in the system right now.");
        }
      } catch (err) {
        console.error("MatchPage: uncaught exception during matchmaking:", err);
        setError(true);
        setErrorMessage(err.message || "An unexpected error occurred while looking for your match.");
      } finally {
        setIsLoading(false);
      }
    }

    getMatch();
  }, [location.state, session, navigate]);

  // If no state or profile, return a replacement Navigate component as a secondary guard
  if (!location.state || !location.state.profile) {
    return <Navigate to={session ? "/dashboard" : "/"} replace />;
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="relative mb-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
            className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center brutal-shadow"
          >
            <Sparkles className="w-9 h-9 text-white fill-current" />
          </motion.div>
          <motion.span
            className="absolute inset-0 rounded-2xl border-2 border-blue-500/40"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
          />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
        >
          Finding Your Match...
        </motion.h2>
        <AnimatePresence mode="wait">
          <motion.p
            key={loadingStep}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-blue-600 dark:text-blue-400 font-bold mt-3 tracking-wide text-xs"
          >
            {loadingStep}
          </motion.p>
        </AnimatePresence>
      </div>
    );
  }

  // Rate limit screen
  if (rateLimitData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 brutal-shadow p-8 rounded-2xl max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500 border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow-sm">
              <ShieldAlert className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-4">Rate Limit Exceeded</h2>
          <p className="text-slate-700 dark:text-slate-300 font-bold mb-6">
            To keep connections meaningful, Chap Connect limits matchmaking to **2 matches every 2 weeks**. 
          </p>
          {rateLimitData.nextAvailableDate && (
            <div className="bg-slate-100 dark:bg-[#18213a] border border-slate-200 dark:border-white/10 rounded-xl p-4 mb-8 flex items-center justify-center space-x-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Next Match Available</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {rateLimitData.nextAvailableDate.toLocaleDateString()} at {rateLimitData.nextAvailableDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )}
          <Link to={session ? "/dashboard" : "/"} className="inline-block w-full bg-blue-600 text-white py-4 rounded-xl font-bold border border-slate-200 dark:border-white/10 brutal-shadow hover:translate-y-0.5 active:translate-y-1 transition-all tracking-wide">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (error || !matchData || !matchData.mentor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 brutal-shadow p-8 rounded-2xl max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500 border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow-sm">
              <ShieldAlert className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-red-600 tracking-tight mb-4">Oops!</h2>
          <p className="text-slate-900 dark:text-slate-100 font-bold mb-8">
            {errorMessage || "We couldn't establish a successful alumni match right now."}
          </p>
          <Link to={session ? "/dashboard" : "/"} className="inline-block w-full bg-blue-600 text-white py-4 rounded-xl font-bold border border-slate-200 dark:border-white/10 brutal-shadow tracking-wide hover:translate-y-0.5 active:translate-y-1 transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <Link to={session ? "/dashboard" : "/"} className="inline-flex items-center text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 hover:text-blue-600 mb-8 transition-colors border border-slate-200 dark:border-white/10 px-4 py-2 bg-white dark:bg-[#111a30] brutal-shadow-sm rounded-lg hover:translate-y-[1px] active:translate-y-[2px]">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
            className="inline-flex items-center justify-center p-4 gradient-brand brutal-shadow rounded-full mb-6"
          >
            <Sparkles className="w-10 h-10 text-white fill-current animate-spin" style={{ animationDuration: '6s' }} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
            className="text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2"
          >It's a Match!</motion.h1>
          {matchData?.fallbackToAlgo && (
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="inline-flex items-center space-x-1.5 bg-red-600 border border-slate-200 dark:border-white/10 text-white px-3 py-1 font-bold text-xs tracking-wide rounded-md brutal-shadow-sm">
                <span>⚡ High-Speed Fallback Match Active</span>
              </div>
              {import.meta.env.DEV && matchData?.fallbackError && (
                <div className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-500 rounded-lg px-4 py-1.5 max-w-md mx-auto brutal-shadow-sm tracking-wider">
                  ⚠️ Dev Diagnostic: {matchData.fallbackError}
                </div>
              )}
            </div>
          )}
          <p className="text-slate-600 dark:text-slate-400 font-bold tracking-wide text-sm">We found a great connection for you</p>
        </motion.div>


        <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center">
          <motion.div
            initial={{ opacity: 0, x: -40, rotate: -2 }} animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20, delay: 0.35 }}
            className="flex-1 max-w-sm mx-auto w-full"
          >
            <MatchCard matchData={matchData} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20, delay: 0.5 }}
            className="flex-1 max-w-sm mx-auto w-full"
          >
            <OutreachMessage matchData={matchData} userProfile={location.state.profile} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

