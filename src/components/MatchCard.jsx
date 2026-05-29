import React from 'react';
import { Briefcase, GraduationCap, MapPin, CheckCircle2 } from 'lucide-react';

export default function MatchCard({ matchData }) {
  const { mentor, commonThreads } = matchData;

  return (
    <div className="bg-white border-4 border-slate-900 rounded-2xl brutal-shadow overflow-hidden h-full flex flex-col">
      <div className="h-24 bg-blue-600 border-b-4 border-slate-900 relative flex items-center px-6">
        <h3 className="text-2xl font-black text-white uppercase tracking-wider mt-4">The Mentor</h3>
      </div>
      
      <div className="px-6 pb-6 relative flex-grow">
        <div className="absolute -top-12 right-6">
          <img 
            src={mentor.avatar} 
            alt={mentor.name} 
            className="w-20 h-20 rounded-full border-4 border-slate-900 bg-white brutal-shadow-sm"
          />
        </div>
        
        <div className="pt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{mentor.name}</h2>
            <div className="inline-block mt-2 bg-red-500 border-2 border-slate-900 text-white text-xs font-black px-3 py-1 uppercase tracking-widest rounded-md brutal-shadow-sm rotate-[2deg]">
              Class of {mentor.gradYear}
            </div>
          </div>
          
          <div className="space-y-3 mb-6 font-bold text-sm text-slate-800">
            <div className="flex items-center">
              <Briefcase className="w-5 h-5 mr-3 text-blue-600 stroke-[3]" />
              <span>{mentor.career} @ <span className="font-black text-slate-900 uppercase">{mentor.company}</span></span>
            </div>
            <div className="flex items-center">
              <GraduationCap className="w-5 h-5 mr-3 text-blue-600 stroke-[3]" />
              <span>{mentor.college}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-3 text-blue-600 stroke-[3]" />
              <span>{mentor.location}</span>
            </div>
          </div>

          <div className="bg-slate-100 border-2 border-slate-900 rounded-xl p-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 border-b-2 border-slate-900 pb-2">Why you match</h3>
            <ul className="space-y-2">
              {commonThreads.map((thread, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle2 className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 stroke-[3]" />
                  <span className="text-slate-900 font-bold text-sm leading-tight">{thread}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
