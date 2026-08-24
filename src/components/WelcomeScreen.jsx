import React, { useState, useEffect } from 'react';
import Magnetic from './ui/Magnetic';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { supabase, signOutToWelcome } from '../utils/supabaseClient';

// Set just before handing off to Google, read once when the browser comes back.
const OAUTH_RETURN_KEY = 'cc_oauth_return';

export default function WelcomeScreen({ session }) {
  const [name, setName] = useState(session?.user?.user_metadata?.full_name || '');
  const [gradYear, setGradYear] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const navigate = useNavigate();

  // A real Google sign-in has a genuine email; the auto-enter local session uses
  // a synthetic "@chapconnect.local" address.
  const isGoogleSession = !!session?.user?.email && !session.user.email.endsWith('@chapconnect.local');

  const signInWithGoogle = async () => {
    setSigningIn(true);
    // Mark that the next load of this screen is the return leg of an OAuth
    // round-trip. Only that load should route the user onward — simply having a
    // saved Google session is not a reason to bounce someone off the home page.
    // sessionStorage survives the redirect and dies with the tab.
    sessionStorage.setItem(OAUTH_RETURN_KEY, '1');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      sessionStorage.removeItem(OAUTH_RETURN_KEY);
      setSigningIn(false);
      alert('Google sign-in failed: ' + error.message);
    }
    // On success Supabase redirects to Google, then back to the app.
  };

  const signOut = signOutToWelcome;

  useEffect(() => {
    if (session?.user?.id) {
      // This screen is the front door: staying here is the default. We only route
      // onward on the load that comes back from Google, so an existing session
      // never yanks someone away from the landing page.
      if (sessionStorage.getItem(OAUTH_RETURN_KEY) !== '1') return;
      sessionStorage.removeItem(OAUTH_RETURN_KEY);

      supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
           if (error) {
             // Don't strand a signed-in user on the sign-in screen because a
             // lookup failed — send them to onboarding, which can recover.
             console.error('[auth] profile lookup failed, falling back to onboarding', error);
             if (isGoogleSession) navigate('/onboarding', { replace: true, state: { name: session.user.user_metadata?.full_name || '' } });
             return;
           }
           if (data && data.length > 0) {
             // Returning user (already onboarded) → straight to their dashboard.
             navigate('/dashboard', { replace: true });
           } else if (isGoogleSession) {
             // Freshly signed in with Google and no profile yet → onboard them.
             navigate('/onboarding', {
               replace: true,
               state: { name: session.user.user_metadata?.full_name || '' }
             });
           }
        });
    }
  }, [session, navigate, isGoogleSession]);

  const handleStart = (e) => {
    e.preventDefault();
    if (!name || !gradYear) return;
    
    const year = parseInt(gradYear, 10);
    let flow = 'student';
    if (year <= 2023) flow = 'post_college';
    else if (year <= 2026) flow = 'recent';

    navigate('/onboarding', { state: { name, gradYear: year, flow } });
  };

  const reduce = useReducedMotion();

  // Entry choreography: the name lands, the rule draws under it, then the
  // proposition. Sequence matches how you would introduce the place out loud.
  const rise = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] },
  });

  const fieldClass =
    'w-full bg-transparent border-0 border-b border-rule px-0 py-2.5 text-lg text-ink ' +
    'placeholder:text-ink-faint focus:outline-none focus:border-action transition-colors';

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-12">
      {/* LEFT: the navy field, grounded on real photography pushed into the brand
          hue. Mobile: stacks first, reduced height. */}
      <section className="navy-field relative lg:col-span-7 xl:col-span-7 flex flex-col overflow-hidden">
        <div className="flex flex-1 flex-col justify-between gap-8 px-6 pt-10 pb-8 sm:gap-12 sm:px-12 sm:pt-14 lg:gap-16 lg:px-16 lg:pt-16">
        <motion.p {...rise(0.05)} className="text-sm text-on-navy-muted">
          Eanes ISD, Westlake High School
        </motion.p>

        <div className="py-4 sm:py-10 lg:py-0">
          <motion.h1
            {...rise(0.12)}
            className="wordmark text-[2.75rem] leading-[0.95] sm:text-6xl lg:text-display text-on-navy"
          >
            Chap
            <br />
            Connect
          </motion.h1>

          <motion.span
            aria-hidden="true"
            className="mt-6 block h-0.5 w-24 origin-left bg-accent-navy sm:mt-8 sm:w-32"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />

          <motion.p
            {...rise(0.5)}
            className="mt-6 max-w-md text-base leading-relaxed text-on-navy sm:mt-8 sm:text-lg"
          >
            Every Westlake graduate is somewhere, doing something. Find the one who
            already did the thing you are about to do.
          </motion.p>
        </div>

        </div>

        {/* Photography sits in its own band so type never competes with it and
            contrast stays deterministic. */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
          className="duotone h-32 w-full shrink-0 sm:h-52 lg:h-[38vh]"
        >
          <img
            src="/WHSfield.jpg"
            alt=""
            aria-hidden="true"
            width={1200}
            height={630}
            loading="eager"
            fetchPriority="high"
          />
        </motion.div>
      </section>

      {/* RIGHT: the task. Quiet ground so the field opposite stays the peak. */}
      <section className="lg:col-span-5 flex items-center bg-canvas px-6 py-14 sm:px-12 lg:px-14">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm mx-auto"
        >
          <h2 className="font-heading text-3xl font-semibold text-ink tracking-tight">Sign in</h2>
          <p className="mt-2 text-ink-muted">Pick up where the network left off.</p>

          {isGoogleSession && (
            <div className="mt-8 flex items-center justify-between gap-3 border border-rule bg-sunken px-4 py-3 panel">
              <div className="min-w-0">
                <p className="text-sm text-ink-faint">Signed in with Google</p>
                <p className="truncate text-sm font-medium text-ink">{session.user.email}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="flex-shrink-0 p-2 text-ink-faint hover:text-action cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}

          <Magnetic
            type="button"
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="mt-8 w-full flex items-center justify-center gap-3 border border-rule-strong bg-surface py-3.5 px-4 font-medium text-ink cursor-pointer transition-colors hover:border-ink active:translate-y-[1px] disabled:opacity-60 panel"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6c-2.1 1.5-4.8 2.4-7.7 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36.5 44 30.8 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            <span>{signingIn ? 'Redirecting to Google' : (isGoogleSession ? 'Switch Google account' : 'Continue with Google')}</span>
          </Magnetic>

          <div className="my-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-rule" />
            <span className="text-sm text-ink-faint">or continue as guest</span>
            <span className="h-px flex-1 bg-rule" />
          </div>

          <form onSubmit={handleStart} className="space-y-7">
            <div className="flex flex-col gap-2">
              <label htmlFor="cc-name" className="text-sm font-medium text-ink-muted">Your name</label>
              <input id="cc-name" type="text" required placeholder="Jane Doe" className={fieldClass}
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="cc-year" className="text-sm font-medium text-ink-muted">Graduating class</label>
              <input id="cc-year" type="number" required min="1950" max="2035" placeholder="2024"
                className={`${fieldClass} tabular`} value={gradYear}
                onChange={(e) => setGradYear(e.target.value)} />
              <p className="text-sm text-ink-faint">This decides what the network shows you.</p>
            </div>

            {/* The one red element on the page. */}
            <Magnetic strength={4}
              type="submit"
              className="w-full bg-action text-action-ink font-medium py-4 px-4 cursor-pointer transition-colors hover:bg-action-hover active:translate-y-[1px] rounded-slight"
            >
              Continue
            </Magnetic>
          </form>

          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="mt-8 text-sm text-ink-faint hover:text-ink cursor-pointer transition-colors border-b border-transparent hover:border-ink pb-0.5"
          >
            Admin sign-in
          </button>
        </motion.div>
      </section>
    </div>
  );
}
