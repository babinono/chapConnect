import React, { useEffect, useState } from 'react';
import Magnetic from '../components/ui/Magnetic';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase, signOutToWelcome } from '../utils/supabaseClient';
import Autocomplete from '../components/Autocomplete';
import { 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  Save, 
  Plus, 
  Loader2, 
  Trash2, 
  User,
  FolderHeart,
  CheckCircle2,
  Home,
  LogOut
} from 'lucide-react';
import { cn } from '../utils/cn';
import TabBar from '../components/ui/TabBar';
import { COLLEGES, MAJORS } from '../utils/colleges';

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' or 'profile'
  const [matches, setMatches] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Notes local state
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [notesState, setNotesState] = useState({});

  // Profile Editor state
  const [profileForm, setProfileForm] = useState({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const navigate = useNavigate();
  const isAlumniMentor = profile?.flow_type === 'established' || profile?.flow_type === 'post_schooling';
  // Only current high-school students match. Everyone else (recent grads in
  // undergrad + established alumni + admins) gets the directory instead.
  const isStudent = profile?.flow_type === 'student';
  const canSeeDirectory = !isStudent;

  useEffect(() => {
    if (!session?.user?.id) return;

    async function fetchDashboardData() {
      try {
        // 1. Fetch user profile (ordering by created_at desc to always load the latest profile created)
        const { data: profiles, error: profileErr } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        let profileData = profiles?.[0] || null;

        if (profileErr) {
          console.error("Error fetching profile:", profileErr);
        } else if (profileData) {
          // Auto-correct: a profile flagged as a current HS student whose grad
          // year has already passed is really an alumnus — switch to the alumni
          // experience and persist the fix.
          const currentYear = new Date().getFullYear();
          if (profileData.flow_type === 'student' && profileData.grad_year && profileData.grad_year < currentYear) {
            profileData = { ...profileData, flow_type: 'post_schooling' };
            supabase
              .from('user_profiles')
              .update({ flow_type: 'post_schooling' })
              .eq('user_id', session.user.id)
              .then(({ error }) => { if (error) console.error('Failed to auto-correct flow_type:', error); });
          }

          setProfile(profileData);

          // Only HS students match — everyone else lands on the Home tab.
          if (profileData.flow_type !== 'student') {
            setActiveTab('home');
          }

          // Convert database arrays to comma-separated strings for form state inputs
          const toString = (arr) => Array.isArray(arr) ? arr.join(', ') : (arr || '');
          const PRESET_GRAD_SCHOOLS = ['UT Austin', 'Stanford', 'Harvard', 'Duke', 'UCLA', 'Yale', 'Columbia', 'MIT'];
          const PRESET_GRAD_PROGRAMS = ['Medicine', 'Law', 'MBA', 'PhD/Masters', 'Residency'];
          const PRESET_INDUSTRIES = ['Technology', 'Finance', 'Consulting', 'Healthcare', 'Education', 'Marketing', 'Law', 'Engineering', 'Real Estate'];

          let parsedMeta = {};
          const isAlumniFlow = profileData.flow_type === 'post_schooling' || profileData.flow_type === 'established';
          if (isAlumniFlow && profileData.post_grad_program) {
            try {
              parsedMeta = JSON.parse(profileData.post_grad_program || '{}');
            } catch (e) {
              console.error("Error parsing alumni meta:", e);
            }
          }

          const isCustomGradSchool = profileData.post_grad_school && !PRESET_GRAD_SCHOOLS.includes(profileData.post_grad_school);
          const isCustomGradProgram = !isAlumniFlow && profileData.post_grad_program && !PRESET_GRAD_PROGRAMS.includes(profileData.post_grad_program);
          const isCustomIndustry = profileData.career && !PRESET_INDUSTRIES.includes(profileData.career);

          const standardContactPlatforms = ['LinkedIn', 'Email', 'Phone', 'Twitter', 'Instagram'];
          const isCustomContactPlatform = parsedMeta.contactPlatform && !standardContactPlatforms.includes(parsedMeta.contactPlatform);

          setProfileForm({
            ...profileData,
            targetColleges: toString(profileData.target_colleges),
            targetMajors: toString(profileData.target_majors),
            targetCareers: toString(profileData.target_careers),
            activities: toString(profileData.high_school_activities),
            classes: toString(profileData.favorite_classes),
            
            post_grad_school: isCustomGradSchool ? 'Other' : (profileData.post_grad_school || ''),
            other_post_grad_school: isCustomGradSchool ? profileData.post_grad_school : '',
            
            post_grad_program: isCustomGradProgram ? 'Other' : (isAlumniFlow ? '' : (profileData.post_grad_program || '')),
            other_post_grad_program: isCustomGradProgram ? profileData.post_grad_program : '',
            
            career: isAlumniFlow ? (profileData.career || '') : (isCustomIndustry ? 'Other' : (profileData.career || '')),
            other_career: isCustomIndustry ? profileData.career : '',

            firstGrad: parsedMeta.firstGrad || '',
            secondGrad: parsedMeta.secondGrad || '',
            contactPlatform: isCustomContactPlatform ? 'Other' : (parsedMeta.contactPlatform || ''),
            otherContactPlatform: isCustomContactPlatform ? parsedMeta.contactPlatform : '',
            contactInfo: parsedMeta.contactInfo || '',
            // Alumni meta preserved so editing the profile doesn't drop fields
            // that have no dedicated editor input (undergrad/education).
            _rawMeta: parsedMeta,
            alumniStatus: parsedMeta.status || '',
            working: parsedMeta.working === true ? 'yes'
              : parsedMeta.working === false ? 'no'
              : (parsedMeta.status === 'working' ? 'yes' : (parsedMeta.status ? 'no' : '')),
            newsletterConsent: !!parsedMeta.newsletterConsent,
            contactConsent: !!parsedMeta.contactConsent
          });
        }

        // 2. Fetch matches (joining mentors)
        const { data: matchesData, error: matchesErr } = await supabase
          .from('student_matches')
          .select(`
            id,
            status,
            notes,
            mentor_id,
            mentors (
              id,
              name,
              grad_year,
              college,
              first_grad_education,
              second_grad_education,
              education,
              current_position,
              location,
              role
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (matchesErr) {
          console.error("Error fetching matches:", matchesErr);
        } else {
          setMatches(matchesData || []);
          // Populate initial local notes state
          const initialNotes = {};
          matchesData?.forEach(m => {
            initialNotes[m.id] = m.notes || '';
          });
          setNotesState(initialNotes);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [session]);

  const handleStatusChange = async (matchId, newStatus) => {
    const { error } = await supabase
      .from('student_matches')
      .update({ status: newStatus })
      .eq('id', matchId);

    if (error) {
      alert("Error updating status");
    } else {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: newStatus } : m));
    }
  };



  const handleNotesChange = (matchId, text) => {
    setNotesState(prev => ({ ...prev, [matchId]: text }));
  };

  const handleSaveNotes = async (matchId) => {
    setSavingNoteId(matchId);
    const { error } = await supabase
      .from('student_matches')
      .update({ notes: notesState[matchId] })
      .eq('id', matchId);

    setSavingNoteId(null);
    if (error) {
      alert("Failed to save notes");
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm("Are you sure you want to remove this match from your dashboard?")) return;

    const { error } = await supabase
      .from('student_matches')
      .delete()
      .eq('id', matchId);

    if (error) {
      alert("Failed to delete match");
    } else {
      setMatches(prev => prev.filter(m => m.id !== matchId));
      setNotesState(prev => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
    }
  };

  const handleProfileFormChange = (e) => {
    const { name, type, value, checked } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveSuccess(false);

    // Helpers to convert string inputs back into Postgres arrays
    const toArray = (val) => {
      if (!val) return null;
      if (Array.isArray(val)) return val;
      return val.split(',').map(s => s.trim()).filter(Boolean);
    };

    const targetCollegesArr = toArray(profileForm.targetColleges);
    const targetMajorsArr = toArray(profileForm.targetMajors);
    const targetCareersArr = toArray(profileForm.targetCareers);
    const activitiesArr = toArray(profileForm.activities);
    const classesArr = toArray(profileForm.classes);

    const isAlumniFlow = profileForm.flow_type === 'post_schooling' || profileForm.flow_type === 'established';
    let finalPostGradProgram = null;
    if (isAlumniFlow) {
      const contactPlatformVal = profileForm.contactPlatform === 'Other' 
        ? profileForm.otherContactPlatform 
        : profileForm.contactPlatform;
      const working = profileForm.working === 'yes';
      finalPostGradProgram = JSON.stringify({
        ...(profileForm._rawMeta || {}),   // keep undergrad/education fields
        working,
        status: working ? 'working' : 'not_working',
        firstGrad: profileForm.firstGrad || '',
        secondGrad: profileForm.secondGrad || '',
        contactPlatform: contactPlatformVal || '',
        contactInfo: profileForm.contactInfo || '',
        newsletterConsent: !!profileForm.newsletterConsent,
        contactConsent: !!profileForm.contactConsent
      });
    } else {
      finalPostGradProgram = profileForm.post_grad_program === 'Other' ? profileForm.other_post_grad_program : (profileForm.post_grad_program || null);
    }

    // If they picked "current student" but already graduated, coerce to alumni.
    const gradYearNum = parseInt(profileForm.grad_year, 10);
    let effectiveFlow = profileForm.flow_type || 'student';
    if (effectiveFlow === 'student' && gradYearNum && gradYearNum < new Date().getFullYear()) {
      effectiveFlow = 'post_schooling';
    }

    const updatedProfile = {
      name: profileForm.name,
      grad_year: gradYearNum,
      flow_type: effectiveFlow,
      email: profileForm.email || null,
      college: profileForm.college || null,
      location: isAlumniFlow && profileForm.working !== 'yes' ? null : (profileForm.location || null),
      company: isAlumniFlow && profileForm.working !== 'yes' ? null : (profileForm.company || null),
      career: isAlumniFlow
        ? (profileForm.working === 'yes' ? (profileForm.career || null) : null)
        : (profileForm.career === 'Other' ? profileForm.other_career : (profileForm.career || null)),
      post_grad_school: profileForm.post_grad_school === 'Other' ? profileForm.other_post_grad_school : (profileForm.post_grad_school || null),
      post_grad_program: finalPostGradProgram,
      target_colleges: targetCollegesArr,
      target_majors: targetMajorsArr,
      target_careers: targetCareersArr,
      high_school_activities: activitiesArr,
      favorite_classes: classesArr
    };

    const { error } = await supabase
      .from('user_profiles')
      .update(updatedProfile)
      .eq('user_id', session.user.id);

    setIsSavingProfile(false);
    if (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile details.");
    } else {
      // Sync local profile state with updated values (preserve id, is_admin, created_at, etc.)
      setProfile(prev => ({ ...prev, ...updatedProfile }));
      // Reflect any auto-correction (student → alumni) back into the form + view.
      if (effectiveFlow !== profileForm.flow_type) {
        setProfileForm(prev => ({ ...prev, flow_type: effectiveFlow }));
        setActiveTab('home');
      }
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    }
  };

  // Plain sign-out: keeps the profile, just ends the session and returns to the
  // welcome screen so a different person can sign in.
  const handleLogOut = async () => {
    if (!window.confirm('Log out of Chap Connect?')) return;
    await signOutToWelcome();
  };

  const handleResetDevMode = async () => {
    if (!window.confirm("Are you sure you want to reset your profile and onboarding data? This will delete your matches and profile from the database so you can start onboarding completely from scratch.")) return;
    
    setLoading(true);
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidRegex.test(session?.user?.id);

      // 1. Delete student matches (only if valid UUID to prevent database crashes)
      if (isValidUuid) {
        const { error: matchesErr } = await supabase
          .from('student_matches')
          .delete()
          .eq('user_id', session.user.id);
        if (matchesErr) throw matchesErr;
      }
        
      // 2. Delete user profile (try deleting by primary key first, then fallback to user_id)
      if (profile?.id) {
        const { error: profileErr } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', profile.id);
        if (profileErr) throw profileErr;
      } else if (isValidUuid) {
        const { error: profileErr } = await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', session.user.id);
        if (profileErr) throw profileErr;
      }
        
      // 3. Clear rate limiters and localStorage
      localStorage.removeItem('match_rate_limit');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.includes(`_milestones_`)) {
          localStorage.removeItem(key);
        }
      }

      // 4. Sign out as well and return to the welcome screen. Deleting the
      // profile without ending the session left the user still authenticated,
      // so the welcome screen kept greeting them by the account they had just
      // wiped. signOutToWelcome clears both and hard-redirects.
      await signOutToWelcome();
    } catch (err) {
      console.error("Failed to reset dev profile:", err);
      alert("Reset failed: " + err.message);
      setLoading(false);
    }
  };

  const handleFindMatch = (matchType = 'ai', forceNoTimeout = false) => {
    if (profile) {
      // Bypasses onboarding forms completely by going straight to /match with current mapped profile data!
      const toArray = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
        return [];
      };

      // Extract IDs of mentors already matched on their dashboard to prevent duplicates
      const excludedIds = matches.map(m => m.mentor_id).filter(Boolean);

      const profileForMatch = {
        name: profile.name,
        gradYear: profile.grad_year,
        flow_type: profile.flow_type,
        college: profile.college,
        targetColleges: profile.target_colleges || toArray(profileForm.targetColleges),
        targetMajors: profile.target_majors || toArray(profileForm.targetMajors),
        targetCareers: profile.target_careers || toArray(profileForm.targetCareers),
        activities: profile.high_school_activities || toArray(profileForm.activities),
        classes: profile.favorite_classes || toArray(profileForm.classes),
        location: profile.location,
        company: profile.company,
        career: profile.career,
        postGradSchool: profile.post_grad_school,
        postGradProgram: profile.post_grad_program,
        excludedIds: excludedIds,
        matchType: matchType,
        forceNoTimeout: forceNoTimeout
      };
      navigate('/match', { state: { profile: profileForMatch } });
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-sunken panel">
        <Loader2 className="w-16 h-16 text-ink-faint animate-spin mb-6" />
        <h2 className="text-3xl font-semibold text-ink tracking-tight">Loading Networking Hub...</h2>
      </div>
    );
  }

  const labelClass = "block text-sm font-medium text-ink mb-2 tracking-wide";
  const inputClass = "w-full px-4 py-3 border border-rule focus:outline-none focus:border-action bg-sunken font-medium transition-all panel";

  return (
    <div className="min-h-[100dvh] py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-rule gap-6">
        <div>
          <h1 className="wordmark text-2xl text-ink leading-none">
            Chap Connect
          </h1>
          <p className="text-sm text-ink-faint mt-1.5">
            {isAlumniMentor ? 'Alumni mentor' : isStudent ? 'Student' : 'Alumni'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 self-start md:self-auto">
          <button
            onClick={handleLogOut}
            className="bg-surface text-ink-muted font-medium py-2.5 px-4 text-sm border border-rule flex items-center justify-center gap-2 transition-colors hover:text-ink hover:border-ink cursor-pointer rounded-slight"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            <span>Log Out</span>
          </button>

          {(session?.user?.id === '11111111-1111-1111-1111-111111111111' || import.meta.env.DEV || window.location.hostname.includes('vercel.app')) && (
            <button
              onClick={handleResetDevMode}
              className="border border-bad/40 text-bad font-medium py-2.5 px-4 text-sm flex items-center justify-center gap-2 transition-colors hover:border-bad hover:bg-sunken cursor-pointer rounded-slight"
            >
              <span>Reset Account</span>
            </button>
          )}

          {/* Algorithmic matching only. The Gemini path stays reachable in
              matchingEngine (matchType 'ai'), but nothing in the UI requests it -
              the local scorer needs no API key, no quota and no network round
              trip, so it can't fail the way the AI path can. */}
          {isStudent && (
            <button
              onClick={() => handleFindMatch('algo')}
              className="bg-action text-action-ink font-medium py-4 px-5 border border-rule flex items-center justify-center space-x-2 transition-all tracking-normal text-sm cursor-pointer"
            >
                            <span>Find My Match</span>
            </button>
          )}

          {/* Recent grads + alumni don't match. they open the directory page. */}
          {canSeeDirectory && (
            <Magnetic
              onClick={() => navigate('/directory')}
              className="bg-action text-action-ink font-medium py-4 px-5 border border-rule flex items-center justify-center space-x-2 transition-all tracking-normal text-sm cursor-pointer"
            >
              <FolderHeart className="w-4 h-4" strokeWidth={1.75} />
              <span>View Directory</span>
            </Magnetic>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-10">
        <TabBar
          active={activeTab}
          onChange={setActiveTab}
          items={[
            ...(!isStudent ? [{ key: 'home', label: 'Home', Icon: Home }] : []),
            ...(isStudent ? [{ key: 'matches', label: `My Matches (${matches.length})`, Icon: FolderHeart }] : []),
            { key: 'profile', label: 'My Profile', Icon: User },
          ]}
        />
      </div>

      {activeTab === 'matches' ? (
        isAlumniMentor ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Warm Welcome Banner */}
            <div className="navy-field p-8 relative">
              <div className="absolute right-8 top-8 text-sm text-on-navy-muted">
                <span>Mentor account active</span>
              </div>
              <h2 className="font-heading text-title font-semibold tracking-tight text-on-navy mb-2">Alumni mentor portal</h2>
              <p className="text-on-navy-muted max-w-prose leading-relaxed">
                Thank you for giving back to the Westlake High School community! Your profile has been saved to the Chap Connect database, making you visible to current WHS students and recent grads seeking college and career insights.
              </p>
            </div>

            {(() => {
              let alumniMeta = null;
              if (profile?.post_grad_school === 'ALUMNI_METADATA') {
                try {
                  alumniMeta = JSON.parse(profile.post_grad_program || '{}');
                } catch (e) {
                  console.error("Failed to parse alumni metadata:", e);
                }
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                  {/* Profile Card */}
                  <div className="md:col-span-2 bg-surface border border-rule overflow-hidden flex flex-col panel">
                    <div className="h-16 navy-field flex items-center px-6">
                      <h3 className="text-white font-medium tracking-wide text-sm">Your Active Mentor Listing</h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-center space-x-4 border-b-2 border-rule pb-4">
                        <img
                          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(profile?.name || '')}`}
                          alt={profile?.name}
                          className="w-16 h-16 rounded-full border border-rule bg-surface"
                        />
                        <div>
                          <h3 className="text-2xl font-semibold text-ink leading-none">{profile?.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-ink-muted text-sm">
                              Class of <span className="text-heritage-on-navy font-medium tabular">{profile?.grad_year}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium text-ink">
                        <div className="flex items-center">
                          <Briefcase className="w-5 h-5 mr-3 text-ink-faint flex-shrink-0" />
                          <span>
                            {profile?.career || 'Position not specified'}
                            {alumniMeta?.industry && <span className="text-ink-faint font-semibold"> ({alumniMeta.industry})</span>}
                            {profile?.company && ` @ ${profile.company}`}
                          </span>
                        </div>
                        <div className="flex items-start">
                          <GraduationCap className="w-5 h-5 mr-3 text-ink-faint flex-shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            <span>{profile?.college || 'College not specified'} {profile?.major && `(${profile.major})`}</span>
                            {alumniMeta?.firstGrad && (
                              <span className="text-xs text-ink-muted font-semibold mt-0.5">Grad 1: {alumniMeta.firstGrad}</span>
                            )}
                            {alumniMeta?.secondGrad && (
                              <span className="text-xs text-ink-muted font-semibold">Grad 2: {alumniMeta.secondGrad}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-5 h-5 mr-3 text-ink-faint flex-shrink-0" />
                          <span>{profile?.location || 'Location not specified'}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="w-5 h-5 mr-3 text-ink-faint flex-shrink-0" />
                          <span>Contact Platform: <span className="text-ink-muted font-medium">{alumniMeta?.contactPlatform || 'Not specified'}</span></span>
                        </div>
                      </div>

                      <div className="bg-sunken border border-rule p-4 panel">
                        <h4 className="text-xs font-medium tracking-normal text-ink mb-2 border-b border-rule-strong border-rule pb-1">Preferred Contact Details</h4>
                        <p className="text-sm font-medium text-ink break-all">{alumniMeta?.contactInfo || 'No contact details provided yet.'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Card */}
                  <div className="bg-surface border border-rule p-6 space-y-6 panel">
                    <h3 className="text-xl font-semibold text-ink tracking-wide">Mentorship Status</h3>
                    
                    <div className="bg-sunken border border-rule p-4 panel">
                      <div className="text-xs font-medium text-ink-faint">Profile Status</div>
                      <div className="font-semibold text-good text-lg tracking-normal mt-1">Active & Ready</div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center font-medium text-xs text-ink-muted border-b border-rule pb-2">
                        <span>Target Cohorts</span>
                        <span className="font-medium text-ink">WHS Students</span>
                      </div>
                      <div className="flex justify-between items-center font-medium text-xs text-ink-muted border-b border-rule pb-2">
                        <span>Connected Students</span>
                        <span className="font-medium text-ink">0 Active</span>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-ink-faint leading-relaxed text-center">
                      Students can request virtual coffee chats using the matched outreach templates. You will receive an email if a match request is generated!
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Inactive Student Connections Notice */}
            <div className="bg-surface border border-rule p-8 text-center max-w-xl mx-auto w-full mt-8 panel">
              <FolderHeart className="w-16 h-16 text-ink-faint mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-ink tracking-tight mb-2">Looking to meet with a kid!</h3>
              <p className="text-ink-muted font-medium text-sm leading-relaxed">
                We are actively matching you with students. As soon as a student initiates a match to connect with you, their details will appear here. Thank you for giving back and mentoring the next generation of Chaps!
              </p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          /* Empty state as a composed moment, not a card adrift in a void. It
             names the next action instead of only reporting absence. */
          <div className="navy-field panel overflow-hidden">
            <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <p className="text-sm text-on-navy-muted">Nothing here yet</p>
                <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-semibold text-on-navy tracking-tight">
                  Your first match is one click away.
                </h2>
                <p className="mt-5 max-w-prose text-on-navy-muted leading-relaxed">
                  Chap Connect pairs you with a Westlake graduate who already walked
                  the path you are starting. Matches you make will collect here.
                </p>
                {isStudent && (
                  <Magnetic
                    onClick={() => handleFindMatch('algo')}
                    className="mt-8 bg-action text-action-ink font-medium py-3 px-6 inline-flex items-center gap-2 transition-colors hover:bg-action-hover active:translate-y-[1px] cursor-pointer rounded-slight"
                  >
                    Find my match
                  </Magnetic>
                )}
              </div>
              <div className="duotone panel hidden h-48 lg:block">
                <img src="/WHSfield.jpg" alt="" aria-hidden="true" width={1200} height={630} loading="lazy" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {matches.map((match) => {
              const m = match.mentors;
              if (!m) return null;
              
              const linkedInSearchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
                `${m.name} ${m.college || ''} ${m.current_position || ''}`
              )}`;

              return (
                <div key={match.id} className="bg-surface border border-rule flex flex-col overflow-hidden panel">
                  <div className="h-16 navy-field flex items-center justify-between px-6 border-b border-rule">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium text-sm tracking-wide">
                        Status:
                      </span>
                      <select
                        value={match.status}
                        onChange={(e) => handleStatusChange(match.id, e.target.value)}
                        className="bg-surface text-ink font-medium text-xs px-2 py-1 border-2 border-white focus:outline-none rounded-slight"
                      >
                        <option value="Matched">Matched</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleDeleteMatch(match.id)}
                      className="text-bad hover:text-action p-1 cursor-pointer"
                      title="Remove match"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex items-center space-x-4 mb-4 border-b-2 border-rule pb-4">
                      <img
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(m.name)}`}
                        alt={m.name}
                        className="w-14 h-14 rounded-full border border-rule bg-surface"
                      />
                      <div>
                        <h3 className="text-xl font-semibold text-ink leading-none">{m.name}</h3>
                        <span className="inline-block mt-1 text-ink-muted text-sm">
                          Class of <span className="text-heritage font-medium tabular">{m.grad_year}</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 text-xs text-ink-muted font-medium flex-grow">
                      <div className="flex items-center">
                        <Briefcase className="w-4.5 h-4.5 mr-2 text-ink-faint flex-shrink-0" />
                        <span>{m.current_position || 'Established Alumni'}</span>
                      </div>
                      {m.college && (
                        <div className="flex items-start">
                          <GraduationCap className="w-4.5 h-4.5 mr-2 text-ink-faint flex-shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            <span>{m.college}</span>
                            {m.first_grad_education && (
                              <span className="text-xs text-ink-faint font-semibold mt-0.5">Grad: {m.first_grad_education}</span>
                            )}
                            {m.second_grad_education && (
                              <span className="text-xs text-ink-faint font-semibold">Grad 2: {m.second_grad_education}</span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center">
                        <MapPin className="w-4.5 h-4.5 mr-2 text-ink-faint flex-shrink-0" />
                        <span>{m.location}</span>
                      </div>
                    </div>

                    <a
                      href={linkedInSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 mb-6 font-medium text-xs tracking-normal flex items-center justify-center space-x-2 border border-rule bg-surface text-ink transition-all cursor-pointer panel"
                    >
                      <svg className="w-4 h-4 fill-slate-900" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      <span>Find on LinkedIn</span>
                    </a>

                    <div className="border-t-2 border-rule pt-4 flex flex-col">
                      <label className="block text-xs font-medium text-ink-faint tracking-wide mb-2">My Meeting Logs & Notes</label>
                      <textarea
                        value={notesState[match.id] || ''}
                        onChange={(e) => handleNotesChange(match.id, e.target.value)}
                        placeholder="e.g. Sent email. Coffee chat scheduled for next Tuesday!"
                        className="w-full px-3 py-2 text-xs border border-rule focus:outline-none focus:border-action bg-sunken font-medium min-h-[80px] resize-none mb-3 panel"
                      />
                      <button
                        onClick={() => handleSaveNotes(match.id)}
                        disabled={savingNoteId === match.id}
                        className={cn(
                          "self-end py-1.5 px-3 font-medium text-xs tracking-wide border border-rule-strong flex items-center space-x-1 cursor-pointer transition-all",
                          savingNoteId === match.id ? "bg-sunken" : "text-ink border-action"
                        )}
                      >
                        {savingNoteId === match.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Saving</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Notes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'profile' ? (
        /* My Profile Editor Tab */
        <div className="max-w-xl mx-auto bg-surface border border-rule p-8 w-full panel">
          <h2 className="text-3xl font-semibold text-ink tracking-tight mb-6 border-b-2 border-rule pb-3 flex items-center space-x-2">
            <User className="w-7 h-7 text-ink-faint" />
            <span>Profile Manager</span>
          </h2>
          {isAlumniMentor && (
            <p className="text-ink-muted font-medium text-sm mb-6 leading-relaxed bg-sunken border border-rule p-4 panel">
              Keep your profile up to date so students can connect with you for mentorship, advice, and new opportunities. Your guidance helps shape their future.
            </p>
          )}

          {profileSaveSuccess && (
            <div className="bg-signal-good text-white font-medium p-4 border border-rule mb-6 flex items-center space-x-2 animate-in fade-in duration-300">
              <CheckCircle2 className="w-6 h-6" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <label className={labelClass}>Your Name</label>
              <input
                type="text"
                name="name"
                required
                value={profileForm.name || ''}
                onChange={handleProfileFormChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>High School Graduation Year</label>
              <input
                type="number"
                name="grad_year"
                required
                value={profileForm.grad_year || ''}
                onChange={handleProfileFormChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Profile Path / Flow</label>
              <select
                name="flow_type"
                value={profileForm.flow_type || 'student'}
                onChange={handleProfileFormChange}
                className={` font-medium`}
              >
                <option value="student">Current High School Student</option>
                <option value="recent">Current College Student</option>
                <option value="post_undergrad">Grad School / Post-Undergrad</option>
                <option value="post_schooling">Working / Post-Schooling</option>
              </select>
            </div>

            {/* Email mapping */}
            {(profileForm.flow_type === 'recent' || profileForm.flow_type === 'post_undergrad' || profileForm.flow_type === 'post_schooling' || profileForm.flow_type === 'established') && (
              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={profileForm.email || ''}
                  onChange={handleProfileFormChange}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
            )}

            {/* Undergrad / College Attended */}
            {profileForm.flow_type !== 'student' && (
              <div>
                <label className={labelClass}>Current College / College Attended</label>
                <Autocomplete
                  name="college"
                  value={profileForm.college || ''}
                  onChange={handleProfileFormChange}
                  suggestions={COLLEGES}
                  placeholder="e.g. UT Austin"
                />
              </div>
            )}

            {/* HIGH SCHOOL STUDENT FIELDS */}
            {profileForm.flow_type === 'student' && (
              <>
                <div>
                  <label className={labelClass}>Dream College(s)</label>
                  <Autocomplete
                    name="targetColleges"
                    value={profileForm.targetColleges || ''}
                    onChange={handleProfileFormChange}
                    suggestions={COLLEGES}
                    placeholder="e.g. Stanford, UT Austin (comma separated)"
                  />
                </div>
                <div>
                  <label className={labelClass}>Intended Major(s)</label>
                  <Autocomplete
                    name="targetMajors"
                    value={profileForm.targetMajors || ''}
                    onChange={handleProfileFormChange}
                    suggestions={MAJORS}
                    placeholder="e.g. Computer Science (comma separated)"
                  />
                </div>
                <div>
                  <label className={labelClass}>Intended Career(s)</label>
                  <input
                    type="text"
                    name="targetCareers"
                    value={profileForm.targetCareers || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. Software Engineer, Doctor (comma separated)"
                  />
                </div>
                <div>
                  <label className={labelClass}>High School Clubs / Sports</label>
                  <input
                    type="text"
                    name="activities"
                    value={profileForm.activities || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. Debate, Varsity Football (comma separated)"
                  />
                </div>
                <div>
                  <label className={labelClass}>Favorite Classes</label>
                  <input
                    type="text"
                    name="classes"
                    value={profileForm.classes || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. AP Chemistry, Calculus (comma separated)"
                  />
                </div>
              </>
            )}

            {/* COLLEGE STUDENT / RECENT ALUMNI FIELDS */}
            {profileForm.flow_type === 'recent' && (
              <>
                <div>
                  <label className={labelClass}>Major(s)</label>
                  <Autocomplete
                    name="targetMajors"
                    value={profileForm.targetMajors || ''}
                    onChange={handleProfileFormChange}
                    suggestions={MAJORS}
                    placeholder="e.g. Finance (comma separated)"
                  />
                </div>
                <div>
                  <label className={labelClass}>Career Interests / Aspirations</label>
                  <input
                    type="text"
                    name="targetCareers"
                    value={profileForm.targetCareers || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. Consulting, Investment Banking (comma separated)"
                  />
                </div>
                <div>
                  <label className={labelClass}>High School Activities</label>
                  <input
                    type="text"
                    name="activities"
                    value={profileForm.activities || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. Student Council, Golf (comma separated)"
                  />
                </div>
              </>
            )}

            {/* GRAD SCHOOL FIELDS */}
            {profileForm.flow_type === 'post_undergrad' && (
              <>
                <div>
                  <label className={labelClass}>Graduate School</label>
                  <select
                    name="post_grad_school"
                    value={profileForm.post_grad_school || ''}
                    onChange={handleProfileFormChange}
                    className={` font-medium`}
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
                {profileForm.post_grad_school === 'Other' && (
                  <div>
                    <label className={labelClass}>Please specify graduate school</label>
                    <input
                      type="text"
                      name="other_post_grad_school"
                      value={profileForm.other_post_grad_school || ''}
                      onChange={handleProfileFormChange}
                      className={inputClass}
                      placeholder="e.g. Rice University"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Program / Degree Type</label>
                  <select
                    name="post_grad_program"
                    value={profileForm.post_grad_program || ''}
                    onChange={handleProfileFormChange}
                    className={` font-medium`}
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
                {profileForm.post_grad_program === 'Other' && (
                  <div>
                    <label className={labelClass}>Please specify program type</label>
                    <input
                      type="text"
                      name="other_post_grad_program"
                      value={profileForm.other_post_grad_program || ''}
                      onChange={handleProfileFormChange}
                      className={inputClass}
                      placeholder="e.g. Master of Science in Data Science"
                      required
                    />
                  </div>
                )}
              </>
            )}

            {/* WORKING PROFESSIONAL FIELDS */}
            {(profileForm.flow_type === 'post_schooling' || profileForm.flow_type === 'established') && (
              <>
                <div>
                  <label className={labelClass}>Are you currently working?</label>
                  <select
                    name="working"
                    value={profileForm.working || ''}
                    onChange={handleProfileFormChange}
                    className={` font-medium`}
                  >
                    <option value="">-- Select --</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {profileForm.working === 'yes' && (
                  <>
                    <div>
                      <label className={labelClass}>Where do you work?</label>
                      <input
                        type="text"
                        name="company"
                        value={profileForm.company || ''}
                        onChange={handleProfileFormChange}
                        className={inputClass}
                        placeholder="e.g. Google"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>What is your position?</label>
                      <input
                        type="text"
                        name="career"
                        value={profileForm.career || ''}
                        onChange={handleProfileFormChange}
                        className={inputClass}
                        placeholder="e.g. Senior Software Engineer"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>City you live in</label>
                      <input
                        type="text"
                        name="location"
                        value={profileForm.location || ''}
                        onChange={handleProfileFormChange}
                        className={inputClass}
                        placeholder="e.g. Austin, TX"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className={labelClass}>Graduate Program 1 (If Completed)</label>
                  <input
                    type="text"
                    name="firstGrad"
                    value={profileForm.firstGrad || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. UT Austin, MBA (Business)"
                  />
                </div>
                <div>
                  <label className={labelClass}>Graduate Program 2 (If Completed)</label>
                  <input
                    type="text"
                    name="secondGrad"
                    value={profileForm.secondGrad || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. Harvard, Law School (JD)"
                  />
                </div>
                <div>
                  <label className={labelClass}>Preferred Reach Out Method</label>
                  <select
                    name="contactPlatform"
                    value={profileForm.contactPlatform || ''}
                    onChange={handleProfileFormChange}
                    className={` font-medium`}
                  >
                    <option value="">-- Select Contact Method --</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone / Text</option>
                    <option value="Twitter">Twitter / X</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {profileForm.contactPlatform === 'Other' && (
                  <div>
                    <label className={labelClass}>Please specify contact platform</label>
                    <input
                      type="text"
                      name="otherContactPlatform"
                      value={profileForm.otherContactPlatform || ''}
                      onChange={handleProfileFormChange}
                      className={inputClass}
                      placeholder="e.g. Slack, WhatsApp"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Contact Username / Link / Email</label>
                  <input
                    type="text"
                    name="contactInfo"
                    value={profileForm.contactInfo || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. linkedin.com/in/username"
                    required
                  />
                </div>
                <div className="space-y-4 pt-2 border-t-2 border-rule">
                  <label className="flex items-start space-x-3 p-4 border border-rule bg-sunken cursor-pointer panel">
                    <input type="checkbox" name="newsletterConsent" checked={!!profileForm.newsletterConsent} onChange={handleProfileFormChange} className="mt-0.5 w-5 h-5 accent-blue-600" />
                    <span className="text-sm font-medium text-ink">I give permission to use my email to send me the alumni newsletter and publications.</span>
                  </label>
                  <label className="flex items-start space-x-3 p-4 border border-rule bg-sunken cursor-pointer rounded-slight">
                    <input type="checkbox" name="contactConsent" checked={!!profileForm.contactConsent} onChange={handleProfileFormChange} className="mt-0.5 w-5 h-5 accent-blue-600" />
                    <span className="text-sm font-medium text-ink">I allow students to occasionally contact me when Chap Connect matches them with me.</span>
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full bg-action text-action-ink font-medium py-4 px-6 border border-rule flex items-center justify-center space-x-2 transition-all tracking-normal text-sm cursor-pointer mt-8"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : null}

      {/* HOME TAB. alumni landing page with official links */}
      {activeTab === 'home' && (
        <div>
          {/* Masthead. a full-bleed navy field, the peak of this page. */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="navy-field -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-14 mb-14"
          >
            {(profile?.grad_year || profile?.gradYear) && (
              <p className="text-sm text-on-navy-muted">
                Class of{' '}
                <span className="tabular text-heritage-on-navy font-medium">
                  {profile.grad_year || profile.gradYear}
                </span>
              </p>
            )}
            <h2 className="mt-3 font-heading text-4xl sm:text-5xl lg:text-title font-semibold text-on-navy">
              Welcome back, {profile?.name?.split(' ')[0] || 'Chap'}.
            </h2>
            <span className="rule-draw mt-7 block h-0.5 w-24 bg-accent-navy" aria-hidden="true" />
            <p className="mt-7 max-w-prose text-lg leading-relaxed text-on-navy-muted">
              Your home base as a Westlake alum. Browse the Chap directory, keep your
              profile current, and explore the official Eanes resources below.
            </p>
          </motion.div>

          <h2 className="font-heading text-2xl font-semibold text-ink tracking-tight mb-1">
            Eanes ISD &amp; alumni portal
          </h2>
          <p className="text-ink-muted mb-8">Official district and foundation resources.</p>

          <dl className="border-t-2 border-rule-strong">
            {[
              {
                term: 'EEF Alumni Portal',
                href: 'https://eaneseducationfoundation.org/alumni/',
                cta: 'Visit EEF Alumni',
                desc: 'The official Eanes Education Foundation alumni page. the registry for former Chaps. Reunion news, networking registers, and what other graduates are up to.',
              },
              {
                term: 'Eanes ISD Website',
                href: 'https://www.eanesisd.net/',
                cta: 'Visit Eanes ISD',
                desc: 'District announcements, academic calendars, board updates, athletic schedules, and campus news from the current generation of WHS students.',
              },
              {
                term: 'Support the Foundation',
                href: 'https://eaneseducationfoundation.org/donate/',
                cta: 'Donate',
                desc: 'Donations to the Eanes Education Foundation fund teacher salaries and the classroom resources that keep district programs running.',
              },
            ].map((item) => (
              <div
                key={item.href}
                className="group border-b border-rule py-7 sm:grid sm:grid-cols-[15rem_1fr_auto] sm:gap-10 sm:items-baseline"
              >
                <dt className="font-heading text-lg font-semibold text-ink">{item.term}</dt>
                <dd className="mt-1.5 sm:mt-0 text-ink-muted leading-relaxed max-w-prose">
                  {item.desc}
                </dd>
                <dd className="mt-3 sm:mt-0 sm:text-right">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-action border-b border-action/30 group-hover:border-action pb-0.5 transition-colors whitespace-nowrap"
                  >
                    {item.cta}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
