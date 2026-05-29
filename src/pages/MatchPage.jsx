import React, { useEffect, useState } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { findBestMatch } from '../utils/matchingEngine';
import MatchCard from '../components/MatchCard';
import OutreachMessage from '../components/OutreachMessage';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

export default function MatchPage() {
  const location = useLocation();
  const [matchData, setMatchData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    async function getMatch() {
      if (location.state && location.state.profile) {
        try {
          const result = await findBestMatch(location.state.profile);
          if (result) {
            setMatchData(result);
          } else {
            setError(true);
          }
        } catch (err) {
          console.error("Match error:", err);
          setError(true);
        } finally {
          setIsLoading(false);
        }
      }
    }
    getMatch();
  }, [location.state]);

  if (!location.state) return <Navigate to="/" replace />;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Finding Match...</h2>
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-white border-4 border-slate-900 brutal-shadow p-8 rounded-2xl max-w-sm w-full text-center">
          <h2 className="text-3xl font-black text-red-600 uppercase tracking-tight mb-4">Oops!</h2>
          <p className="text-slate-900 font-bold mb-8">We couldn't find a match in the database.</p>
          <Link to="/" className="inline-block w-full bg-blue-600 text-white py-4 rounded-xl font-black border-2 border-slate-900 brutal-shadow uppercase tracking-wide">Go Back Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <Link to="/" className="inline-flex items-center text-sm font-black uppercase tracking-widest text-slate-900 hover:text-blue-600 mb-8 transition-colors border-2 border-slate-900 px-4 py-2 bg-white brutal-shadow-sm rounded-lg">
          <ArrowLeft className="w-5 h-5 mr-2" /> Start Over
        </Link>
        
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-red-500 border-4 border-slate-900 brutal-shadow rounded-full mb-6 rotate-[-3deg]">
            <Sparkles className="w-10 h-10 text-white fill-current" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight uppercase mb-4">It's a Match!</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex-1 max-w-sm mx-auto w-full">
            <MatchCard matchData={matchData} />
          </div>
          <div className="flex-1 max-w-sm mx-auto w-full">
            <OutreachMessage outreachMessage={matchData.outreachMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}
