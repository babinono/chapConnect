import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import Autocomplete from './Autocomplete';
import { COLLEGES, MAJORS } from '../utils/colleges';


export default function OnboardingFlow({ session }) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back (drives slide direction)

  // Grad year drives which flow the onboarding runs. When someone arrives via
  // Google sign-in we only have their name, so grad year / flow are collected in
  // a first step here (stateful) instead of on the welcome screen.
  const computeFlow = (yr) => {
    const y = parseInt(yr, 10);
    if (!y) return null;
    if (y <= 2023) return 'post_college';
    if (y <= 2026) return 'recent';
    return 'student';
  };
  const sourceName = state.name || session?.user?.user_metadata?.full_name || '';
  const [firstName, setFirstName] = useState(sourceName.split(' ')[0] || '');
  const [lastName, setLastName] = useState(sourceName.split(' ').slice(1).join(' '));
  const [nickname, setNickname] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [gradYear, setGradYear] = useState(state.gradYear || '');
  const [flow, setFlow] = useState(state.flow || null);

  // What the app calls you. A nickname wins over the legal first name, because
  // every greeting in the product reads the first token of this.
  const name = [nickname.trim() || firstName.trim(), lastName.trim()]
    .filter(Boolean)
    .join(' ');

  // Need either welcome-screen state or a signed-in session to onboard.
  if (!location.state && !session?.user?.id) return <Navigate to="/" replace />;
  const handleNext = () => { setDir(1); setStep(s => s + 1); };
  const handlePrev = () => { setDir(-1); setStep(s => Math.max(1, s - 1)); };
  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  // Repeatable "education beyond undergrad" entries.
  const gradPrograms = formData.gradPrograms || [];
  const addGradProgram = () => setFormData({ ...formData, gradPrograms: [...gradPrograms, { school: '', degree: '' }] });
  const updateGradProgram = (i, field, val) =>
    setFormData({ ...formData, gradPrograms: gradPrograms.map((g, idx) => idx === i ? { ...g, [field]: val } : g) });
  const removeGradProgram = (i) =>
    setFormData({ ...formData, gradPrograms: gradPrograms.filter((_, idx) => idx !== i) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const toArray = (str) => str ? str.split(',').map(s => s.trim()) : null;

    let profileData;

    // ALUMNI FLOW (grad year <= 2023): everyone enters undergrad, then any
    // education beyond it, then whether/where they work. Stored as flow_type
    // 'post_schooling' so the alumnus surfaces as a mentor, with the richer
    // details serialized into post_grad_program (alumniMeta).
    if (flow === 'post_college') {
      const contactPlatform = formData.contactPlatform === 'Other'
        ? formData.otherContactPlatform
        : (formData.contactPlatform || null);

      // Further education beyond undergrad (repeatable {school, degree} entries).
      const gradPrograms = (formData.gradPrograms || [])
        .filter(g => (g.school && g.school.trim()) || (g.degree && g.degree.trim()))
        .map(g => ({ school: (g.school || '').trim(), degree: (g.degree || '').trim() }));

      const asLabel = (g) => g.degree ? `${g.school} (${g.degree})` : g.school;
      const isWorking = formData.working === 'yes';

      const alumniMeta = JSON.stringify({
        status: isWorking ? 'working' : 'not_working',
        working: isWorking,
        undergradCollege: formData.college || null,
        undergradMajor: formData.major || null,
        education: gradPrograms,                     // full list beyond undergrad
        firstGrad: gradPrograms[0] ? asLabel(gradPrograms[0]) : null,   // legacy display
        secondGrad: gradPrograms[1] ? asLabel(gradPrograms[1]) : null,  // legacy display
        contactPlatform,
        contactInfo: formData.contactInfo || null,
        newsletterConsent: !!formData.newsletterConsent,
        contactConsent: !!formData.contactConsent
      });

      profileData = {
        name,
        grad_year: gradYear,
        flow_type: 'post_schooling',
        email: formData.email || null,
        college: formData.college || null,           // undergrad
        major: formData.major || null,               // undergrad major
        career: isWorking ? (formData.career || null) : null,   // position
        high_school_activities: null,
        target_colleges: null,
        target_majors: null,
        target_careers: null,
        favorite_classes: null,
        location: formData.location || null,
        company: isWorking ? (formData.company || null) : null, // where
        post_grad_school: 'ALUMNI_METADATA',
        post_grad_program: alumniMeta,
        user_id: session?.user?.id || null
      };
    } else {
      const finalFlowType = flow;
      const finalPostGradSchool = formData.postGradSchool === 'Other'
        ? formData.otherPostGradSchool
        : (formData.postGradSchool || null);

      const finalPostGradProgram = formData.postGradProgram === 'Other'
        ? formData.otherPostGradProgram
        : (formData.postGradProgram || null);

      const finalIndustry = formData.industry === 'Other'
        ? formData.otherIndustry
        : (formData.industry || null);

      // Only working (post_schooling) and established are alumni mentors who use serialized alumniMeta
      const isAlumniFlow = finalFlowType === 'post_schooling' || finalFlowType === 'established';

      const contactPlatform = formData.contactPlatform === 'Other'
        ? formData.otherContactPlatform
        : (formData.contactPlatform || null);

      const alumniMeta = isAlumniFlow ? JSON.stringify({
        firstGrad: formData.firstGrad || null,
        secondGrad: formData.secondGrad || null,
        industry: finalIndustry,
        contactPlatform,
        contactInfo: formData.contactInfo || null
      }) : null;

      // Recent alumni (still in undergrad) store their optional social media here.
      const recentContact = (finalFlowType === 'recent' && (contactPlatform || formData.contactInfo))
        ? JSON.stringify({ contactPlatform, contactInfo: formData.contactInfo || null })
        : null;

      profileData = {
        name,
        grad_year: gradYear,
        flow_type: finalFlowType,
        email: formData.email || null,
        college: formData.college || null,
        major: formData.major || formData.targetMajors || null,
        career: formData.career || null, // Saves the job title / role / position
        high_school_activities: null, // Removed high school activities/clubs for alumni
        target_colleges: toArray(formData.targetColleges),
        target_majors: toArray(formData.targetMajors),
        target_careers: toArray(formData.targetCareers),
        favorite_classes: toArray(formData.classes),
        location: formData.location || null,
        company: formData.company || null,
        post_grad_school: isAlumniFlow ? 'ALUMNI_METADATA' : finalPostGradSchool,
        post_grad_program: isAlumniFlow ? alumniMeta : (finalFlowType === 'recent' ? recentContact : finalPostGradProgram),
        user_id: session?.user?.id || null
      };
    }

    const { error } = await supabase
      .from('user_profiles')
      .upsert([profileData], { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving profile:', error);
      alert('There was an error saving your profile. Continuing anyway.');
    } else {
      localStorage.removeItem('dev_profile_reset');
    }

    setIsSubmitting(false);
    navigate('/dashboard');
  };

  const inputClass = "w-full px-4 py-3 border border-rule focus:outline-none focus:border-action bg-sunken font-medium transition-all panel";
  const labelClass = "block text-sm font-medium text-ink mb-2 tracking-wide";

  const renderFields = () => {
    if (flow === 'post_college') {
      const checkboxClass = "flex items-start space-x-3 p-4 border border-rule bg-sunken cursor-pointer panel";

      // STEP 1 — Undergrad (required for everyone)
      if (step === 1) {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" required onChange={handleChange} value={formData.email || ''} className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label className={labelClass}>Undergraduate College</label>
              <Autocomplete name="college" required onChange={handleChange} value={formData.college || ''} suggestions={COLLEGES} placeholder="e.g. UT Austin" />
            </div>
            <div>
              <label className={labelClass}>Undergraduate Major / Degree</label>
              <Autocomplete name="major" onChange={handleChange} value={formData.major || ''} suggestions={MAJORS} placeholder="e.g. Computer Science" />
            </div>
          </div>
        );
      }

      // STEP 2 — Anything beyond undergrad (optional, repeatable)
      if (step === 2) {
        return (
          <div className="space-y-5">
            <p className="text-ink-muted font-medium text-sm">
              Did you study anything beyond your undergrad? Add grad school, med/law school, an MBA, etc. Leave blank if none.
            </p>
            {gradPrograms.length === 0 && (
              <p className="text-ink-faint font-medium text-sm italic">No additional degrees added yet.</p>
            )}
            {gradPrograms.map((g, i) => (
              <div key={i} className="border border-rule bg-sunken p-4 space-y-3 relative panel">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-wide text-ink-faint">Degree {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeGradProgram(i)}
                    className="text-bad text-xs font-medium tracking-wide hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <Autocomplete
                  name={`gp-school-${i}`}
                  value={g.school}
                  onChange={(e) => updateGradProgram(i, 'school', e.target.value)}
                  suggestions={COLLEGES}
                  placeholder="School (e.g. Harvard Business School)"
                />
                <input
                  type="text"
                  value={g.degree}
                  onChange={(e) => updateGradProgram(i, 'degree', e.target.value)}
                  className={inputClass}
                  placeholder="Degree / Program (e.g. MBA, JD, MD, M.S.)"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addGradProgram}
              className="w-full py-3 border border-dashed border-rule-strong text-ink-muted font-medium tracking-wide text-sm hover:border-ink hover:text-ink transition-colors cursor-pointer"
            >
              + Add {gradPrograms.length > 0 ? 'another ' : ''}degree
            </button>
          </div>
        );
      }

      // STEP 3 — Work + contact + consent
      const isWorking = formData.working === 'yes';
      return (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Are you currently working?</label>
            <select name="working" required onChange={handleChange} value={formData.working || ''} className={` font-medium`}>
              <option value="">-- Select --</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {isWorking && (
            <>
              <div>
                <label className={labelClass}>Where do you work?</label>
                <input name="company" type="text" required onChange={handleChange} value={formData.company || ''} className={inputClass} placeholder="e.g. Google" />
              </div>
              <div>
                <label className={labelClass}>What is your position?</label>
                <input name="career" type="text" required onChange={handleChange} value={formData.career || ''} className={inputClass} placeholder="e.g. Senior Software Engineer" />
              </div>
              <div>
                <label className={labelClass}>City (Optional)</label>
                <input name="location" type="text" onChange={handleChange} value={formData.location || ''} className={inputClass} placeholder="e.g. Austin, TX" />
              </div>
            </>
          )}

          <div className="space-y-4 pt-4 border-t border-rule">
            <div>
              <label className={labelClass}>Preferred Contact (Optional)</label>
              <select name="contactPlatform" onChange={handleChange} value={formData.contactPlatform || ''} className={` font-medium`}>
                <option value="">-- Select Platform --</option>
                <option value="Email">Email</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Instagram">Instagram</option>
                <option value="Phone">Phone / Text</option>
                <option value="Twitter">Twitter / X</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {formData.contactPlatform === 'Other' && (
              <div>
                <label className={labelClass}>Specify Platform</label>
                <input name="otherContactPlatform" type="text" onChange={handleChange} value={formData.otherContactPlatform || ''} className={inputClass} placeholder="e.g. Slack" />
              </div>
            )}
            {formData.contactPlatform && (
              <div>
                <label className={labelClass}>Contact Username / Link / Email</label>
                <input name="contactInfo" type="text" onChange={handleChange} value={formData.contactInfo || ''} className={inputClass} placeholder="e.g. linkedin.com/in/username" />
              </div>
            )}

            <label className={checkboxClass}>
              <input type="checkbox" name="newsletterConsent" checked={!!formData.newsletterConsent} onChange={handleChange} className="mt-0.5 w-5 h-5 accent-blue-600" />
              <span className="text-sm font-medium text-ink">I give permission to use my email to send me the alumni newsletter and publications.</span>
            </label>
            <label className={checkboxClass}>
              <input type="checkbox" name="contactConsent" checked={!!formData.contactConsent} onChange={handleChange} className="mt-0.5 w-5 h-5 accent-blue-600" />
              <span className="text-sm font-medium text-ink">I allow students to occasionally contact me when Chap Connect matches them with me.</span>
            </label>
          </div>
        </div>
      );
    }

    if (flow === 'established') {
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
            <div>
              <label className={labelClass}>Major studied</label>
              <Autocomplete name="major" onChange={handleChange} value={formData.major || ''} suggestions={MAJORS} placeholder="e.g. Computer Science" />
            </div>
          </div>
        );
      } else if (step === 2) {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>City you live in</label>
              <input name="location" type="text" required onChange={handleChange} value={formData.location || ''} className={inputClass} placeholder="e.g. Austin, TX" />
            </div>
            <div>
              <label className={labelClass}>Industry / Career Field</label>
              <select 
                name="industry" 
                required 
                onChange={handleChange} 
                value={formData.industry || ''} 
                className={` font-medium`}
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
            {formData.industry === 'Other' && (
              <div>
                <label className={labelClass}>Specify Industry</label>
                <input name="otherIndustry" type="text" required onChange={handleChange} value={formData.otherIndustry || ''} className={inputClass} placeholder="e.g. Renewable Energy" />
              </div>
            )}
            <div>
              <label className={labelClass}>Job Title / Position / Role</label>
              <input name="career" type="text" required onChange={handleChange} value={formData.career || ''} className={inputClass} placeholder="e.g. Senior Software Engineer" />
            </div>
            <div>
              <label className={labelClass}>Company Worked At</label>
              <input name="company" type="text" onChange={handleChange} value={formData.company || ''} className={inputClass} placeholder="e.g. Google (Optional)" />
            </div>
          </div>
        );
      } else {
        return (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Graduate School 1 (If Completed)</label>
              <input name="firstGrad" type="text" onChange={handleChange} value={formData.firstGrad || ''} className={inputClass} placeholder="e.g. Stanford University (MS)" />
            </div>
            <div>
              <label className={labelClass}>Graduate School 2 (If Completed)</label>
              <input name="secondGrad" type="text" onChange={handleChange} value={formData.secondGrad || ''} className={inputClass} placeholder="e.g. Harvard Business School (MBA)" />
            </div>
            <div>
              <label className={labelClass}>Preferred Contact Platform</label>
              <select 
                name="contactPlatform" 
                required 
                onChange={handleChange} 
                value={formData.contactPlatform || ''} 
                className={` font-medium`}
              >
                <option value="">-- Select Platform --</option>
                <option value="Email">Email</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Instagram">Instagram</option>
                <option value="Phone">Phone / Text</option>
                <option value="Twitter">Twitter / X</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {formData.contactPlatform === 'Other' && (
              <div>
                <label className={labelClass}>Please specify contact platform</label>
                <input name="otherContactPlatform" type="text" required onChange={handleChange} value={formData.otherContactPlatform || ''} className={inputClass} placeholder="e.g. Slack" />
              </div>
            )}
            <div>
              <label className={labelClass}>Contact Username / Link / Email</label>
              <input name="contactInfo" type="text" required onChange={handleChange} value={formData.contactInfo || ''} className={inputClass} placeholder="e.g. linkedin.com/in/username" />
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
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" required onChange={handleChange} value={formData.email || ''} className={inputClass} placeholder="you@example.com" />
            </div>
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
              <input name="targetCareers" type="text" onChange={handleChange} value={formData.targetCareers || ''} className={inputClass} placeholder="e.g. Consulting (comma separated)" />
            </div>
            <div className="pt-4 border-t border-rule">
              <label className={labelClass}>Social Media (Optional)</label>
              <select name="contactPlatform" onChange={handleChange} value={formData.contactPlatform || ''} className={` font-medium`}>
                <option value="">-- Select Platform --</option>
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter">Twitter / X</option>
                <option value="Snapchat">Snapchat</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {formData.contactPlatform === 'Other' && (
              <div>
                <label className={labelClass}>Specify Platform</label>
                <input name="otherContactPlatform" type="text" onChange={handleChange} value={formData.otherContactPlatform || ''} className={inputClass} placeholder="e.g. TikTok" />
              </div>
            )}
            {formData.contactPlatform && (
              <div>
                <label className={labelClass}>Handle / Link (Optional)</label>
                <input name="contactInfo" type="text" onChange={handleChange} value={formData.contactInfo || ''} className={inputClass} placeholder="e.g. @username" />
              </div>
            )}
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
        </div>
      );
    } else {
      return (
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Intended Career</label>
            <input name="targetCareers" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Software Engineer (comma separated)" />
          </div>
          <div>
            <label className={labelClass}>High School Clubs / Sports</label>
            <input name="activities" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. Student Council (comma separated)" />
          </div>
          <div>
            <label className={labelClass}>Favorite Classes</label>
            <input name="classes" type="text" onChange={handleChange} className={inputClass} placeholder="e.g. AP US History (comma separated)" />
          </div>
        </div>
      );
    }
  };

  // Grad-year gate: shown when we don't yet know the year (e.g. arriving from
  // Google sign-in). Once entered, it derives the flow and drops into step 1.
  if (!identityConfirmed || !flow) {
    const needsYear = !flow;
    const handleYear = (e) => {
      e.preventDefault();
      if (!firstName.trim()) return;
      if (needsYear) {
        const f = computeFlow(gradYear);
        if (!f) return;
        setFlow(f);
      }
      setIdentityConfirmed(true);
      setStep(1);
    };
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-surface border border-rule p-8 panel">
          <h1 className="font-heading text-3xl font-semibold text-ink tracking-tight mb-2">
            {firstName ? `Hi, ${firstName}.` : 'Welcome.'}
          </h1>
          <p className="text-ink-muted mb-8">
            Check we have your name right. This is what other Chaps will see.
          </p>
          <form onSubmit={handleYear} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="ob-first" className={labelClass}>First name</label>
                <input
                  id="ob-first"
                  type="text"
                  required
                  autoFocus
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="Katherine"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="ob-last" className={labelClass}>Last name</label>
                <input
                  id="ob-last"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Taylor"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="ob-nick" className={labelClass}>
                Go by something else? <span className="text-ink-faint font-normal">(optional)</span>
              </label>
              <input
                id="ob-nick"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={inputClass}
                placeholder="Kate"
              />
              <p className="text-sm text-ink-faint">
                {nickname.trim()
                  ? `We'll call you ${nickname.trim()}.`
                  : 'Leave blank to use your first name.'}
              </p>
            </div>

            {needsYear && (
              <div className="flex flex-col gap-2">
                <label htmlFor="ob-year" className={labelClass}>High school graduating class</label>
                <input
                  id="ob-year"
                  type="number"
                  min="1950"
                  max="2035"
                  required
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  className={`${inputClass} tabular`}
                  placeholder="2024"
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-action text-action-ink font-medium py-4 px-4 flex items-center justify-center space-x-2 tracking-wide cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isSelectorStep = false;
  const isLastStep = (flow === 'post_college' && step === 3) || (flow === 'established' && step === 3) || (flow === 'recent' && step === 2) || (flow === 'student' && step === 2);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-surface border border-rule p-8 relative panel">
        <div className="absolute top-4 right-4 navy-field font-medium px-3 py-1 text-xs">
          Step {step} of {flow === 'post_college' ? 3 : (flow === 'established' ? 3 : 2)}
        </div>

        <h1 className="text-3xl font-semibold text-ink tracking-tight mb-8">
          Tell Us About Yourself
        </h1>

        <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={`${flow}-${step}`}
              custom={dir}
              variants={{
                enter: (d) => ({ opacity: 0, x: d >= 0 ? 40 : -40 }),
                center: { opacity: 1, x: 0 },
                exit: (d) => ({ opacity: 0, x: d >= 0 ? -40 : 40 })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderFields()}
            </motion.div>
          </AnimatePresence>

          {!isSelectorStep && (
            <div className="flex justify-between pt-4 border-t-2 border-rule">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="bg-surface text-ink font-medium py-3 px-5 border border-rule flex items-center space-x-2 transition-all tracking-normal rounded-slight"
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-action text-action-ink font-medium py-3 px-5 border border-rule flex items-center space-x-2 transition-all tracking-normal"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving</span>
                  </>
                ) : (
                  <>
                    <span>{isLastStep ? 'Proceed to Dashboard' : 'Next'}</span>
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
