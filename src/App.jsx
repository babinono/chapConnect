import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import WelcomeScreen from './components/WelcomeScreen';
import OnboardingFlow from './components/OnboardingFlow';
import MatchPage from './pages/MatchPage';
import Dashboard from './pages/Dashboard';
import { Loader2, LogIn, ShieldAlert, Sparkles } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen to authentication changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleBypassAuth = () => {
    // Inject a unique mock session for local development to prevent database conflicts and RLS deletion issues.
    // Must generate a valid RFC 4122 UUID since Supabase columns are typed as UUID.
    let mockId = localStorage.getItem('mock_user_id');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!mockId || !uuidRegex.test(mockId)) {
      mockId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem('mock_user_id', mockId);
    }

    const mockSession = {
      user: {
        id: mockId,
        email: `mock.${mockId.substring(0, 8)}@chapconnect.dev`,
        user_metadata: {
          full_name: 'WHS Alumni'
        }
      }
    };
    setSession(mockSession);
  };

  const handleSignOut = async () => {
    localStorage.removeItem('mock_user_id');
    localStorage.removeItem('dev_profile_reset');
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Initializing Session...</h2>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white border-4 border-slate-900 rounded-2xl p-8 brutal-shadow text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 border-4 border-slate-900 rounded-2xl brutal-shadow-sm rotate-[-4deg]">
              <Sparkles className="w-12 h-12 text-white fill-current" />
            </div>
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">
            Chap Connect
          </h1>
          <p className="text-slate-600 font-bold mb-8 uppercase tracking-wide border-b-2 border-slate-200 pb-4">
            The Westlake Alumni Network
          </p>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-slate-900 font-black py-4 px-4 border-4 border-slate-900 rounded-xl brutal-shadow flex items-center justify-center space-x-3 hover:translate-y-0.5 active:translate-y-1 transition-all uppercase tracking-wider text-sm mb-6 cursor-pointer"
          >
            {/* SVG Google Icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign In with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <span className="relative px-3 bg-white text-xs font-black uppercase text-slate-400">Developer Tools</span>
          </div>

          <button
            onClick={handleBypassAuth}
            className="w-full bg-slate-100 text-slate-700 font-bold py-3 px-4 border-2 border-slate-900 rounded-xl flex items-center justify-center space-x-2 hover:bg-slate-200 transition-colors uppercase tracking-wider text-xs cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>Bypass Auth (Dev Mode)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Absolute top-right sign out indicator */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleSignOut}
          className="bg-white border-2 border-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase brutal-shadow-sm hover:translate-y-[1px] transition-all flex items-center space-x-1.5 cursor-pointer"
        >
          <span>Sign Out</span>
        </button>
      </div>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomeScreen session={session} />} />
          <Route path="/onboarding" element={<OnboardingFlow session={session} />} />
          <Route path="/match" element={<MatchPage session={session} />} />
          <Route path="/dashboard" element={<Dashboard session={session} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
