import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import Autocomplete from './Autocomplete';

const COLLEGES = [
  "University of Texas at Austin",
  "UT Austin",
  "UT",
  "Stanford University",
  "Stanford",
  "Duke University",
  "Duke",
  "Duke Business",
  "Yale University",
  "Yale",
  "Yale Law",
  "Northwestern University",
  "Northwestern",
  "Northwestern Business",
  "Emory University",
  "Emory",
  "Caltech",
  "Carnegie Mellon University",
  "CMU",
  "Princeton University",
  "Princeton",
  "Harvard University",
  "Harvard",
  "Harvard Law",
  "Harvard Business",
  "Harvard Medical School",
  "Vanderbilt University",
  "Vanderbilt",
  "Vanderbilt Law",
  "Loyola Marymount University",
  "LMU",
  "Auburn University",
  "Auburn",
  "LSU",
  "Scripps Research",
  "Baylor University",
  "Baylor",
  "Baylor College of Medicine",
  "McGovern Medical School",
  "UTHealth",
  "UTHealth SA",
  "Dell Medical School",
  "UTSW",
  "UIUC",
  "St. Georges",
  "Lake Forest College",
  "Columbia University",
  "Columbia",
  "UCLA",
  "USC",
  "Cal State Long Beach",
  "University of Georgia",
  "UGA",
  "Cornell University",
  "Cornell",
  "Georgia Tech",
  "Rice University",
  "Rice",
  "Rice Business",
  "Texas A&M University",
  "TAMU",
  "UNC",
  "Pepperdine University",
  "Pepperdine",
  "Cambridge",
  "Oxford",
  "West Point",
  "USNA",
  "USAFA",
  "Dartmouth College",
  "Dartmouth",
  "UChicago",
  "UChicago Law",
  "Harvey Mudd",
  "UC Berkeley",
  "Brown University",
  "Brown",
  "UNT",
  "Fuller Theological Seminar",
  "Hendrix College",
  "Ringling College of Art and Design",
  "Texas State University",
  "Texas State",
  "NYU",
  "NYU Stern",
  "NYU Law",
  "Swarthmore",
  "Oklahoma University",
  "OU",
  "McCombs School of Business",
  "USNA",
  "Brandeis",
  "Texas Christian University",
  "TCU",
  "Elon University",
  "Elon",
  "MIT",
  "UT Law",
  "ASU",
  "NC State",
  "NCSU",
  "LSE",
  "London School of Economics",
  "University of Pittsburgh",
  "Pitt",
  "UPenn",
  "UPenn Wharton",
  "UPenn Dental",
  "Colorado College",
  "Georgetown University",
  "Georgetown",
  "Belmont University",
  "WUSTL",
  "WUSTL Med",
  "Leiden University",
  "Lewis and Clark Law",
  "SCAD",
  "TCU",
  "Colorado State",
  "Liberty University",
  "Texas Tech",
  "TTU",
  "TTU Med",
  "UBC",
  "WPI",
  "George Washington University",
  "Arizona State University",
  "Boston University",
  "Boston College",
  "Clemson University",
  "University of South Carolina",
  "Syracuse University",
  "Babson College",
  "Case Western",
  "Barnard College",
  "Bryn Mawr",
  "Washington and Lee",
  "Chapman University",
  "Rochester University",
  "Denver University",
  "Babson",
  "Bowdoin College",
  "Wellesley College",
  "Babson",
  "SLU",
  "Johns Hopkins",
  "JHU Medicine",
  "Florida State University",
  "FSU",
  "University of Michigan",
  "UMich",
  "Notre Dame",
  "University of Toronto",
  "UToronto",
  "Wake Forest",
  "Wesleyan University",
  "Villanova",
  "Virginia Tech",
  "Pratt Institute",
  "Claremont McKenna",
  "Johns Hopkins",
  "UTD",
  "Iowa State",
  "UTA",
  "Lund University",
  "Seton Hall",
  "UTMB",
  "NYU Shanghai",
  "Vassar College",
  "Vassar"
];

const MAJORS = [
  "Computer Science",
  "Computer Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Aerospace Engineering",
  "Chemical Engineering",
  "Civil Engineering",
  "Biomedical Engineering",
  "Industrial Engineering",
  "Software Engineering",
  "Data Science",
  "Business Administration",
  "Finance",
  "Accounting",
  "Marketing",
  "Management",
  "International Business",
  "Management Information Systems",
  "MIS",
  "Economics",
  "Econometrics",
  "Public Policy",
  "Political Science",
  "International Relations",
  "Government",
  "Psychology",
  "Clinical Psychology",
  "Biology",
  "Microbiology",
  "Neuroscience",
  "Chemistry",
  "Biochemistry",
  "Physics",
  "Mathematics",
  "Applied Mathematics",
  "Statistics",
  "Pre-Med",
  "Pre-Law",
  "Sociology",
  "Philosophy",
  "English",
  "English Literature",
  "History",
  "Art History",
  "Communications",
  "Journalism",
  "Nursing",
  "Public Health",
  "Environmental Science",
  "Geology",
  "Anthropology",
  "Linguistics",
  "Theater & Drama",
  "Film & Television",
  "Graphic Design",
  "Fine Arts",
  "Architecture",
  "Music",
  "Human Development",
  "Education"
];

export default function OnboardingFlow({ session }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [subFlow, setSubFlow] = useState(null); // 'post_undergrad' or 'post_schooling'
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!location.state) return <Navigate to="/" replace />;
  
  const { name, gradYear, flow } = location.state;

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => {
    if (step === 1 && flow === 'post_college' && subFlow) {
      setSubFlow(null);
    } else {
      setStep(s => Math.max(1, s - 1));
    }
  };
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const toArray = (str) => str ? str.split(',').map(s => s.trim()) : null;
    
    const finalFlowType = subFlow || flow;
    const finalPostGradSchool = formData.postGradSchool === 'Other' 
      ? formData.otherPostGradSchool 
      : (formData.postGradSchool || null);

    const profileData = {
      name,
      grad_year: gradYear,
      flow_type: finalFlowType,
      email: formData.email || null,
      college: formData.college || null,
      major: formData.targetMajors || null,
      career: formData.career || null,
      high_school_activities: toArray(formData.activities),
      target_colleges: toArray(formData.targetColleges),
      target_majors: toArray(formData.targetMajors),
      target_careers: toArray(formData.targetCareers),
      favorite_classes: toArray(formData.classes),
      location: formData.location || null,
      company: formData.company || null,
      post_grad_school: finalPostGradSchool,
      post_grad_program: formData.postGradProgram || null,
      user_id: session?.user?.id || null
    };

    const { error } = await supabase
      .from('user_profiles')
      .insert([profileData]);

    if (error) {
      console.error('Error saving profile:', error);
      alert('There was an error saving your profile. Continuing anyway.');
    }

    if (finalFlowType === 'post_schooling' || finalFlowType === 'established') {
      setIsSubmitting(false);
      alert("Thank you for joining the Alumni Hub! This MVP doesn't have a dashboard yet.");
      navigate('/');
    } else {
      const fullProfile = { name, gradYear, ...formData, flow_type: finalFlowType, postGradSchool: finalPostGradSchool };
      navigate('/match', { state: { profile: fullProfile } });
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 font-medium transition-all";
  const labelClass = "block text-sm font-black text-slate-900 mb-2 uppercase tracking-wide";

  const renderFields = () => {
    if (flow === 'post_college' && !subFlow) {
      return (
        <div className="space-y-6 py-4">
          <p className="text-slate-700 font-bold text-center mb-6">Select your current path:</p>
          <button
            type="button"
            onClick={() => { setSubFlow('post_undergrad'); setStep(1); }}
            className="w-full text-center p-5 rounded-xl border-4 border-slate-900 bg-red-500 text-white font-black brutal-shadow hover:translate-y-0.5 active:translate-y-1 transition-all uppercase tracking-wide text-md"
          >
            Grad School / Post-Grad
          </button>
          <button
            type="button"
            onClick={() => { setSubFlow('post_schooling'); setStep(1); }}
            className="w-full text-center p-5 rounded-xl border-4 border-slate-900 bg-blue-600 text-white font-black brutal-shadow hover:translate-y-0.5 active:translate-y-1 transition-all uppercase tracking-wide text-md"
          >
            Working / Post-Schooling
          </button>
        </div>
      );
    }

    if (subFlow === 'post_undergrad') {
      if (step === 1) {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" required onChange={handleChange} value={formData.email || ''} className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label className={labelClass}>College Attended</label>
              <Autocomplete name="college" onChange={handleChange} value={formData.college || ''} suggestions={COLLEGES} placeholder="e.g. UT Austin" />
            </div>
          </div>
        );
      } else {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Graduate School</label>
              <select 
                name="postGradSchool" 
                required 
                onChange={handleChange} 
                value={formData.postGradSchool || ''} 
                className={`${inputClass} font-black`}
              >
                <option value="">-- Select Graduate School --</option>
                <option value="UT Austin">University of Texas at Austin</option>
                <option value="Stanford">Stanford University</option>
                <option value="Harvard">Harvard University</option>
                <option value="Duke">Duke University</option>
                <option value="UCLA">UCLA</option>
                <option value="Yale">Yale University</option>
                <option value="Columbia">Columbia University</option>
                <option value="MIT">MIT</option>
                <option value="Other">Other (Please specify below)</option>
              </select>
            </div>
            {formData.postGradSchool === 'Other' && (
              <div>
                <label className={labelClass}>Specify School</label>
                <input name="otherPostGradSchool" type="text" required onChange={handleChange} value={formData.otherPostGradSchool || ''} className={inputClass} placeholder="e.g. Johns Hopkins" />
              </div>
            )}
            <div>
              <label className={labelClass}>What are you studying?</label>
              <select 
                name="postGradProgram" 
                required 
                onChange={handleChange} 
                value={formData.postGradProgram || ''} 
                className={`${inputClass} font-black`}
              >
                <option value="">-- Select Program Type --</option>
                <option value="Medicine">Medicine (Med School)</option>
                <option value="Law">Law (Law School)</option>
                <option value="MBA">Business (MBA)</option>
                <option value="PhD/Masters">Ph.D. / Master's Degree</option>
                <option value="Residency">Residency / Fellowship</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        );
      }
    }

    if (subFlow === 'post_schooling' || flow === 'established') {
      if (step === 1) {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" required onChange={handleChange} value={formData.email || ''} className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label className={labelClass}>College Attended</label>
              <Autocomplete name="college" onChange={handleChange} value={formData.college || ''} suggestions={COLLEGES} placeholder="e.g. UT Austin" />
            </div>
          </div>
        );
      } else {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>City you live in</label>
              <input name="location" type="text" required onChange={handleChange} value={formData.location || ''} className={inputClass} placeholder="e.g. Austin, TX" />
            </div>
            <div>
              <label className={labelClass}>Industry</label>
              <select 
                name="career" 
                required 
                onChange={handleChange} 
                value={formData.career || ''} 
                className={`${inputClass} font-black`}
              >
                <option value="">-- Select Industry --</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Consulting">Consulting</option>
                <option value="Healthcare">Healthcare & Biotech</option>
                <option value="Education">Education</option>
                <option value="Marketing">Marketing & Advertising</option>
                <option value="Law">Law & Legal Services</option>
                <option value="Engineering">Engineering / Operations</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Company Worked At</label>
              <input name="company" type="text" onChange={handleChange} value={formData.company || ''} className={inputClass} placeholder="e.g. Google (Optional)" />
            </div>
          </div>
        );
      }
    }

    if (flow === 'recent') {
      if (step === 1) {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Current College</label>
              <Autocomplete name="college" onChange={handleChange} value={formData.college || ''} suggestions={COLLEGES} placeholder="e.g. Duke University" />
            </div>
            <div>
              <label className={labelClass}>Major(s)</label>
              <Autocomplete name="targetMajors" onChange={handleChange} value={formData.targetMajors || ''} suggestions={MAJORS} placeholder="e.g. Finance (comma separated)" />
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
            <Autocomplete name="targetColleges" onChange={handleChange} value={formData.targetColleges || ''} suggestions={COLLEGES} placeholder="e.g. Stanford (comma separated)" />
          </div>
          <div>
            <label className={labelClass}>Intended Major</label>
            <Autocomplete name="targetMajors" onChange={handleChange} value={formData.targetMajors || ''} suggestions={MAJORS} placeholder="e.g. Economics (comma separated)" />
          </div>
          <div>
            <label className={labelClass}>Intended Career</label>
            <input name="targetCareers" type="text" onChange={handleChange} value={formData.targetCareers || ''} className={inputClass} placeholder="e.g. Software Engineer (comma separated)" />
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

  const isSelectorStep = flow === 'post_college' && !subFlow;
  const isLastStep = flow === 'established' || step === 2;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border-4 border-slate-900 rounded-2xl p-8 brutal-shadow transition-all">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Hi, {name}!</h2>
          <p className="text-slate-600 font-bold mt-1">Let's set up your profile.</p>
          
          {!isSelectorStep && flow !== 'established' && (
            <div className="flex space-x-2 mt-6">
              <div className={`h-3 border-2 border-slate-900 flex-1 rounded-full ${step >= 1 ? 'bg-red-500' : 'bg-slate-100'} transition-all`}></div>
              <div className={`h-3 border-2 border-slate-900 flex-1 rounded-full ${step >= 2 ? 'bg-red-500' : 'bg-slate-100'} transition-all`}></div>
            </div>
          )}
        </div>

        <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          {renderFields()}

          {!isSelectorStep && (
            <div className="flex justify-between mt-8 pt-6 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center space-x-2 text-slate-900 font-black uppercase tracking-wide hover:text-blue-600 transition-colors"
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>

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
                    <span>{isLastStep ? (subFlow === 'post_schooling' || flow === 'established' ? 'Done' : 'Match Me') : 'Next'}</span>
                    {!isLastStep && <ArrowRight className="w-5 h-5" />}
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
