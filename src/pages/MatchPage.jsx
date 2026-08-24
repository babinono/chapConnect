import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import { findBestMatch } from '../utils/matchingEngine';
import { checkLimit, recordMatch } from '../utils/rateLimiter';
import { supabase } from '../utils/supabaseClient';
import MatchCard from '../components/MatchCard';
import OutreachMessage from '../components/OutreachMessage';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function MatchPage({ session }) {
  const reduce = useReducedMotion();
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
      <div className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-4">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-rule border-t-action"
              aria-hidden="true"
            />
            <h2 className="font-heading text-3xl font-semibold text-ink tracking-tight">
              Finding your match
            </h2>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingStep}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="mt-4 border-l-2 border-rule-strong pl-4 text-ink-muted"
              role="status"
            >
              {loadingStep}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Rate limit screen
  if (rateLimitData) {
    return (
      <div className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <p className="text-sm text-ink-faint">Matchmaking paused</p>
          <h2 className="mt-2 font-heading text-title font-semibold text-ink tracking-tight">
            You have used both matches
          </h2>
          <span className="mt-6 block h-0.5 w-20 bg-action" aria-hidden="true" />
          <p className="mt-6 text-ink-muted leading-relaxed">
            To keep connections meaningful, Chap Connect allows two matches every two
            weeks.
          </p>

          {rateLimitData.nextAvailableDate && (
            <dl className="mt-8 border-t border-rule pt-5">
              <dt className="text-sm text-ink-faint">Next match available</dt>
              <dd className="mt-1 font-heading text-xl text-ink tabular">
                {rateLimitData.nextAvailableDate.toLocaleDateString()} at{' '}
                {rateLimitData.nextAvailableDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </dl>
          )}

          <Link
            to={session ? '/dashboard' : '/'}
            className="mt-10 inline-block bg-action text-action-ink font-medium py-3.5 px-7 transition-colors hover:bg-action-hover"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (error || !matchData || !matchData.mentor) {
    return (
      <div className="min-h-[100dvh] bg-canvas flex flex-col items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <p className="text-sm text-ink-faint">No result</p>
          <h2 className="mt-2 font-heading text-title font-semibold text-ink tracking-tight">
            No match right now
          </h2>
          <span className="mt-6 block h-0.5 w-20 bg-action" aria-hidden="true" />
          <p className="mt-6 text-ink-muted leading-relaxed">
            {errorMessage || "We couldn't find an alumni match for you this time. Trying again usually works."}
          </p>
          <Link
            to={session ? '/dashboard' : '/'}
            className="mt-10 inline-block bg-action text-action-ink font-medium py-3.5 px-7 transition-colors hover:bg-action-hover"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* The peak: a full-bleed navy field announcing the result, with the
          display type at real size. Everything below it is quiet by design. */}
      <div className="navy-field px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            to={session ? '/dashboard' : '/'}
            className="inline-flex items-center text-sm text-on-navy-muted hover:text-on-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to dashboard
          </Link>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12"
          >
            <p className="text-sm text-on-navy-muted">
              {matchData?.isAIPowered ? 'Matched on your profile' : 'Matched from the directory'}
            </p>
            <h1 className="mt-3 font-heading text-5xl sm:text-6xl lg:text-display font-semibold text-on-navy">
              Your match
            </h1>
            <span className="rule-draw mt-8 block h-0.5 w-28 bg-accent-navy" aria-hidden="true" />
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-on-navy-muted">
              One Chap who has already stood where you are standing. Reach out. the
              message on the right is yours to send.
            </p>

            {matchData?.fallbackToAlgo && (
              <div className="mt-8 border-l-2 border-heritage pl-4">
                <p className="text-sm text-on-navy">Fallback match</p>
                <p className="text-sm text-on-navy-muted">
                  Matched by the directory algorithm rather than the AI pass.
                </p>
                {import.meta.env.DEV && matchData?.fallbackError && (
                  <p className="mt-1.5 text-xs text-on-navy-muted">
                    Dev diagnostic: {matchData.fallbackError}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Photographic band. */}
        <div className="duotone mt-14 h-48 w-full sm:h-64 lg:h-80">
          <img
            src="/WHSfield.jpg"
            alt=""
            aria-hidden="true"
            width={1200}
            height={630}
            loading="lazy"
          />
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mx-auto w-full max-w-5xl pt-14 grid gap-8 md:grid-cols-2 items-start">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          >
            <MatchCard matchData={matchData} />
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          >
            <OutreachMessage matchData={matchData} userProfile={location.state.profile} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
