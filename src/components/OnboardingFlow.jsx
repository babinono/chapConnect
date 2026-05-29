import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function OnboardingFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!location.state) return <Navigate to="/" replace />;
  
  const { name, gradYear, flow } = location.state;

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => Math.max(1, s - 1));
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const toArray = (str) => str ? str.split(',').map(s => s.trim()) : null;
    
    const profileData = {
      name,
      grad_year: gradYear,
      flow_type: flow,
      email: formData.email || null,
      college: formData.college || null,
      major: formData.targetMajors || null,
      career: formData.career || null,
      high_school_activities: toArray(formData.activities),
      target_colleges: toArray(formData.targetColleges),
      target_majors: toArray(formData.targetMajors),
      target_careers: toArray(formData.targetCareers),
      favorite_classes: toArray(formData.classes)
    };

    const { error } = await supabase
      .from('user_profiles')
      .insert([profileData]);

    if (error) {
      console.error('Error saving profile:', error);
      alert('There was an error saving your profile. Continuing anyway.');
    }

    if (flow === 'established') {
      setIsSubmitting(false);
      alert("Thank you for joining the Alumni Hub! This MVP doesn't have a dashboard yet.");
      navigate('/');
    } else {
      const fullProfile = { name, gradYear, ...formData };
      navigate('/match', { state: { profile: fullProfile } });
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 font-medium transition-all";
  const labelClass = "block text-sm font-black text-slate-900 mb-2 uppercase tracking-wide";

  const renderFields = () => {
    if (flow === 'established') {
      return (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Email</label>
            <input name="email" type="email" required onChange={handleChange} className={inputClass} placeholder="you@example.com" />
          </div>
          <div>
            <label className={labelClass}>College(s) Attended</label>
            <input name="college" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. UT Austin" />
          </div>
          <div>
            <label className={labelClass}>Current Industry/Job</label>
            <input name="career" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Software Engineer" />
          </div>
        </div>
      );
    }

    if (flow === 'recent') {
      if (step === 1) {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Current College</label>
              <input name="college" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Duke University" />
            </div>
            <div>
              <label className={labelClass}>Major(s)</label>
              <input name="targetMajors" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Finance (comma separated)" />
            </div>
          </div>
        );
      } else {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Career Interest</label>
              <input name="targetCareers" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Consulting (comma separated)" />
            </div>
            <div>
              <label className={labelClass}>High School Activities</label>
              <input name="activities" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Debate, Golf (comma separated)" />
            </div>
          </div>
        );
      }
    }

    if (step === 1) {
      return (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Dream College(s)</label>
            <input name="targetColleges" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Stanford (comma separated)" />
          </div>
          <div>
            <label className={labelClass}>Intended Major</label>
            <input name="targetMajors" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Economics (comma separated)" />
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>High School Clubs</label>
            <input name="activities" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Football (comma separated)" />
          </div>
          <div>
            <label className={labelClass}>Favorite Classes</label>
            <input name="classes" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. AP Calculus (comma separated)" />
          </div>
        </div>
      );
    }
  };

  const isLastStep = flow === 'established' || step === 2;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border-4 border-slate-900 rounded-2xl p-8 brutal-shadow transition-all">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Hi, {name}!</h2>
          <p className="text-slate-600 font-bold mt-1">Let's set up your profile.</p>
          
          {flow !== 'established' && (
            <div className="flex space-x-2 mt-6">
              <div className={`h-3 border-2 border-slate-900 flex-1 rounded-full ${step >= 1 ? 'bg-red-500' : 'bg-slate-100'} transition-all`}></div>
              <div className={`h-3 border-2 border-slate-900 flex-1 rounded-full ${step >= 2 ? 'bg-red-500' : 'bg-slate-100'} transition-all`}></div>
            </div>
          )}
        </div>

        <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          {renderFields()}

          <div className="flex justify-between mt-8 pt-6 border-t-2 border-slate-200">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center space-x-2 text-slate-900 font-black uppercase tracking-wide hover:text-blue-600 transition-colors"
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            ) : <div></div>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white font-black py-3 px-5 border-2 border-slate-900 rounded-xl brutal-shadow flex items-center space-x-2 transition-all uppercase tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving</span>
                </>
              ) : (
                <>
                  <span>{isLastStep ? (flow === 'established' ? 'Done' : 'Match Me') : 'Next'}</span>
                  {!isLastStep && <ArrowRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
