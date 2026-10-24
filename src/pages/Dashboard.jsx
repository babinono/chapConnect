import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  LogOut,
  Mail,
  Lock,
  Newspaper,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';
import { cn } from '../utils/cn';
import TabBar from '../components/ui/TabBar';
import { COLLEGES, MAJORS } from '../utils/colleges';
import { findAlumniMatches, generateAlumniOutreachDraft } from '../utils/alumniMatchingEngine';
import MessageBoard from '../components/MessageBoard';
import SendMessageModal from '../components/SendMessageModal';
import SimilarChaps from '../components/SimilarChaps';
import { getBoardPosts, initMessageBoard } from '../utils/messageBoardStore';
import { artFor } from '../utils/newsArt';
import ChapAvatar from '../components/ChapAvatar';
import ChapPicker from '../components/ChapPicker';
import ChapLogo from '../components/ChapLogo';
import ThemeControls from '../components/ui/ThemeControls';

// How many ranked alumni to pull for the matching tab's filters (the home
// column shows the top few of the same list).
const MATCH_POOL = 60;
// matchingEngine fills these in when a record has no school or career, so
// they aren't real values to filter on.
const PLACEHOLDER_VALUES = new Set(['University', 'Professional']);
// Match reasons carry the engine's internal weighting ("(35% weight)"), which
// means nothing to the reader.
const cleanThread = (t) => String(t).replace(/\s*\(\d+% weight\)/g, '');
import { isContactUnlocked, obscureEmail, recordReply, getMessagesBetween } from '../utils/messageRelayStore';

export default function Dashboard({ session }) {
  // The open tab lives in the URL (?tab=matches|board|profile; Home has none),
  // so refresh, Back and shared links all land on the same section.
  const [searchParams, setSearchParams] = useSearchParams();
  const TAB_KEYS = ['home', 'matches', 'board', 'profile'];
  const activeTab = TAB_KEYS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'home';
  const setActiveTab = (key) => {
    if (key === activeTab) return;
    setSearchParams(key === 'home' ? {} : { tab: key });
    window.scrollTo({ top: 0 });
  };
  const [matches, setMatches] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Alumni-to-alumni matching state
  const [alumniMatches, setAlumniMatches] = useState([]);
  const [matchFilters, setMatchFilters] = useState({ q: '', college: '', company: '', gradYear: '', location: '' });
  const [newsPosts, setNewsPosts] = useState([]);
  useEffect(() => {
    initMessageBoard().then(() => setNewsPosts(getBoardPosts()));
  }, []);
  const [loadingAlumniMatches, setLoadingAlumniMatches] = useState(false);
  const [selectedRecipientForMessage, setSelectedRecipientForMessage] = useState(null);
  const [messageRelayTick, setMessageRelayTick] = useState(0);
  
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
            avatar: parsedMeta.avatar || '',
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

  const getEffectiveProfile = () => {
    if (profile && (profile.college || profile.name || profile.grad_year)) return profile;
    if (profileForm && (profileForm.college || profileForm.name || profileForm.grad_year)) {
      return {
        ...profileForm,
        grad_year: profileForm.grad_year || profile?.grad_year,
        college: profileForm.college || profile?.college,
        name: profileForm.name || profile?.name || session?.user?.user_metadata?.full_name || 'Alum',
        post_grad_school: profileForm.post_grad_school || 'ALUMNI_METADATA',
        post_grad_program: profileForm.post_grad_program || JSON.stringify({
          undergradCollege: profileForm.college,
          firstGrad: profileForm.firstGrad,
          secondGrad: profileForm.secondGrad,
          contactInfo: profileForm.contactInfo,
        })
      };
    }
    return profile;
  };

  const runAlumniMatching = async () => {
    const targetProfile = getEffectiveProfile();
    if (!targetProfile) return;
    setLoadingAlumniMatches(true);
    try {
      const results = await findAlumniMatches(targetProfile, { limit: MATCH_POOL });
      setAlumniMatches(results);
    } catch (err) {
      console.error("Failed to run alumni matching:", err);
    } finally {
      setLoadingAlumniMatches(false);
    }
  };

  useEffect(() => {
    let active = true;
    const targetProfile = getEffectiveProfile();
    if (!isStudent && targetProfile && alumniMatches.length === 0 && !loadingAlumniMatches) {
      findAlumniMatches(targetProfile, { limit: MATCH_POOL }).then(results => {
        if (active) setAlumniMatches(results);
      }).catch(err => {
        console.error("Failed to run alumni matching:", err);
      });
    }
    return () => { active = false; };
  }, [profile, profileForm, isStudent, alumniMatches.length, loadingAlumniMatches]);

  const checkUnlocked = (uid, cid) => {
    if (messageRelayTick < 0) return false;
    return isContactUnlocked(uid, cid);
  };

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
        contactConsent: !!profileForm.contactConsent,
        avatar: profileForm.avatar || profileForm._rawMeta?.avatar || ''
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

    const profileToUpsert = {
      ...updatedProfile,
      user_id: session.user.id
    };

    const { data: savedProfile, error } = await supabase
      .from('user_profiles')
      .upsert(profileToUpsert, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    setIsSavingProfile(false);
    if (error) {
      console.error("Error saving profile:", error);
      alert("Failed to update profile details.");
    } else {
      // Sync local profile state with updated values
      const mergedProfile = savedProfile || { ...profile, ...profileToUpsert };
      setProfile(mergedProfile);
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
    if (!window.confirm('Log out of ChapConnect?')) return;
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
  const isWorkingFlow = profileForm.flow_type === 'post_schooling' || profileForm.flow_type === 'established';

  const filteredMatches = alumniMatches.filter(({ candidate: c }) => {
    const f = matchFilters;
    if (f.q) {
      const needle = f.q.trim().toLowerCase();
      const hay = [c.name, c.primarySchool, c.primaryMajor, c.company, c.primaryCareer, c.location].join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (f.college && c.primarySchool !== f.college) return false;
    if (f.company && c.company !== f.company) return false;
    if (f.gradYear && String(c.gradYear) !== f.gradYear) return false;
    if (f.location && c.location !== f.location) return false;
    return true;
  });

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-30 border-b border-rule bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-3 min-w-0 cursor-pointer"
              aria-label="ChapConnect home"
            >
              <ChapLogo className="h-9 sm:h-10 w-auto shrink-0" title="" />
              <span className="wordmark text-2xl sm:text-[1.75rem] text-ink leading-none">ChapConnect</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeControls className="hidden sm:flex" />
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="shrink-0 cursor-pointer rounded-full"
                style={{ borderRadius: '9999px' }}
                aria-label="Edit your profile"
                title="Edit profile"
              >
                <ChapAvatar avatar={profileForm.avatar} seed={profile?.user_id || profile?.name} size={36} className="border border-rule" />
              </button>
              <button
                onClick={handleLogOut}
                className="h-9 px-3 text-sm font-medium text-ink-muted border border-rule bg-surface flex items-center gap-2 transition-colors hover:text-ink hover:border-rule-strong cursor-pointer"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>

          <TabBar
            className="-mx-3"
            active={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'home', label: 'Home', Icon: Home },
              { key: 'matches', label: 'Directory', Icon: FolderHeart },
              { key: 'board', label: 'Alumni News', Icon: Newspaper },
              { key: 'profile', label: 'Edit Profile', Icon: User },
            ]}
          />
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <ThemeControls className="sm:hidden mb-6 justify-end" />

      {activeTab === 'matches' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
            {(() => {
              // Facet tiles: every value that actually occurs, most common
              // first, with how many Chaps have it.
              const facet = (get) => {
                const counts = new Map();
                for (const m of alumniMatches) {
                  const v = get(m.candidate);
                  if (v && !PLACEHOLDER_VALUES.has(v)) counts.set(String(v), (counts.get(String(v)) || 0) + 1);
                }
                return [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 8);
              };
              const groups = [
                { key: 'college', label: 'College', options: facet(c => c.primarySchool) },
                { key: 'company', label: 'Company', options: facet(c => c.company) },
                { key: 'gradYear', label: 'Class', options: facet(c => c.gradYear) },
                { key: 'location', label: 'City', options: facet(c => c.location) },
              ].filter(g => g.options.length > 0);
              const toggle = (key, value) => setMatchFilters(f => ({ ...f, [key]: f[key] === value ? '' : value }));
              const active = Object.values(matchFilters).some(Boolean);

              return (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="font-heading text-3xl font-semibold tracking-tight text-ink">Recommended alumni</h2>
                      <p className="text-ink-muted mt-1">Ranked by how much of your path you share.</p>
                    </div>
                    <button
                      onClick={runAlumniMatching}
                      disabled={loadingAlumniMatches}
                      className="h-10 px-4 border border-rule bg-surface text-ink text-sm font-medium flex items-center gap-2 hover:border-rule-strong transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingAlumniMatches ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                      <span>{loadingAlumniMatches ? 'Matching Chaps…' : 'Refresh'}</span>
                    </button>
                  </div>

                  <label className="relative block">
                    <span className="sr-only">Search alumni</span>
                    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" strokeWidth={1.75} />
                    <input
                      type="search"
                      value={matchFilters.q}
                      onChange={(e) => setMatchFilters(f => ({ ...f, q: e.target.value }))}
                      placeholder="Search by name, college, company or city"
                      className="w-full h-12 pl-12 pr-4 border border-rule bg-surface text-base text-ink placeholder:text-ink-faint focus:outline-none focus:border-action panel"
                    />
                  </label>

                  {groups.length > 0 && (
                    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                      {groups.map(g => (
                        <div key={g.key} role="group" aria-label={`Filter by ${g.label.toLowerCase()}`}>
                          <p className="text-xs font-medium text-ink-faint mb-2">{g.label}</p>
                          <div className="flex flex-wrap gap-2">
                            {g.options.map(([value, count]) => {
                              const on = matchFilters[g.key] === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => toggle(g.key, value)}
                                  className={`h-8 max-w-full px-3 text-sm border flex items-center gap-2 transition-colors cursor-pointer ${
                                    on ? 'bg-ink text-canvas border-ink' : 'bg-surface text-ink border-rule hover:border-rule-strong'
                                  }`}
                                >
                                  <span className="truncate">{value}</span>
                                  <span className={`tabular text-xs ${on ? 'text-canvas/70' : 'text-ink-faint'}`}>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {alumniMatches.length > 0 && (
                    <div className="flex items-center justify-between gap-4 border-t border-rule pt-4 text-sm">
                      <p className="text-ink-muted" aria-live="polite">
                        <span className="tabular font-medium text-ink">{filteredMatches.length}</span>
                        {' '}{filteredMatches.length === 1 ? 'Chap' : 'Chaps'}{active ? ' match' : ' recommended'}
                      </p>
                      {active && (
                        <button
                          type="button"
                          onClick={() => setMatchFilters({ q: '', college: '', company: '', gradYear: '', location: '' })}
                          className="font-medium text-action-text hover:underline cursor-pointer"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            <div>
              {loadingAlumniMatches ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true" aria-label="Running algorithmic match across alumni network…">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="bg-surface border border-rule p-5 panel animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-sunken" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-2/3 rounded bg-sunken" />
                          <div className="h-3 w-1/3 rounded bg-sunken" />
                        </div>
                      </div>
                      <div className="mt-5 space-y-2">
                        <div className="h-3 w-full rounded bg-sunken" />
                        <div className="h-3 w-4/5 rounded bg-sunken" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : alumniMatches.length === 0 ? (
                <div className="bg-surface border border-rule px-6 py-12 text-center panel">
                  <p className="text-ink-muted max-w-md mx-auto">No recommended alumni yet. Keeping your college, field, and major current in your profile helps us find Chaps on your path.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="mt-4 text-sm font-medium text-action-text hover:underline cursor-pointer"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="bg-surface border border-rule px-6 py-12 text-center panel">
                  <p className="text-ink-muted">No alumni match those filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredMatches.map((m, idx) => {
                    const currentUserId = session?.user?.id || 'local_user';
                    const candId = m.candidate.id;
                    const isUnlocked = checkUnlocked(currentUserId, candId);
                    const sentMsgs = getMessagesBetween(currentUserId, candId);
                    const pendingMsg = sentMsgs.find(msg => msg.replyStatus === 'pending');
                    const firstName = m.candidate.name.split(' ')[0];

                    return (
                      <motion.article
                        key={m.candidate.id || idx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx, 8) * 0.04, duration: 0.25 }}
                        className="bg-surface border border-rule flex flex-col panel hover:border-rule-strong transition-colors"
                      >
                        <div className="p-5 flex-1">
                          <div className="flex items-start gap-3">
                            <ChapAvatar avatar={m.candidate.avatar} seed={m.candidate.id || m.candidate.name} size={48} className="border border-rule" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <h4 className="font-semibold text-ink text-base leading-tight truncate">
                                  {m.candidate.name}
                                </h4>
                                <span className="shrink-0 text-xs font-medium text-ink-muted tabular">{m.score}% Match</span>
                              </div>
                              {m.candidate.gradYear && (
                                <p className="text-xs text-ink-faint mt-1">
                                  Class of <span className="tabular font-medium text-heritage">{m.candidate.gradYear}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <dl className="mt-4 space-y-1.5 text-sm text-ink-muted">
                            <div className="flex items-center gap-2 min-w-0">
                              <dt className="sr-only">Role</dt>
                              <Briefcase className="w-4 h-4 text-ink-faint shrink-0" strokeWidth={1.75} />
                              <dd className="truncate">{m.candidate.primaryCareer}{m.candidate.company ? ` @ ${m.candidate.company}` : ''}</dd>
                            </div>
                            {m.candidate.primarySchool && (
                              <div className="flex items-center gap-2 min-w-0">
                                <dt className="sr-only">School</dt>
                                <GraduationCap className="w-4 h-4 text-ink-faint shrink-0" strokeWidth={1.75} />
                                <dd className="truncate">{m.candidate.primarySchool} {m.candidate.primaryMajor ? `(${m.candidate.primaryMajor})` : ''}</dd>
                              </div>
                            )}
                            {m.candidate.location && (
                              <div className="flex items-center gap-2 min-w-0">
                                <dt className="sr-only">Location</dt>
                                <MapPin className="w-4 h-4 text-ink-faint shrink-0" strokeWidth={1.75} />
                                <dd className="truncate">{m.candidate.location}</dd>
                              </div>
                            )}
                          </dl>

                          {/* Match reasons */}
                          <div className="mt-4 border-t border-rule pt-3">
                            <p className="text-xs font-medium text-ink-faint">Why you matched</p>
                            <ul className="mt-1.5 space-y-1">
                              {m.threads.slice(0, 2).map((t, tIdx) => (
                                <li key={tIdx} className="text-sm text-ink leading-snug">{cleanThread(t)}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Contact status and message action */}
                        <div className="px-5 py-3 border-t border-rule flex items-center justify-between gap-3">
                          <div className="min-w-0 text-xs">
                            {isUnlocked ? (
                              <p className="flex items-center gap-1.5 text-good font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Contact Unlocked: {m.candidate.email || 'Email shared'}</span>
                              </p>
                            ) : pendingMsg ? (
                              <div className="space-y-0.5">
                                <p className="flex items-center gap-1.5 text-warn font-medium">
                                  <Lock className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Relayed (Awaiting Reply)</span>
                                </p>
                                <p className="text-ink-faint truncate">
                                  Obscured: {m.candidate.email ? obscureEmail(m.candidate.email) : 'Direct Relay Active'}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    recordReply(pendingMsg.id);
                                    setMessageRelayTick(t => t + 1);
                                  }}
                                  className="font-medium text-action-text hover:underline cursor-pointer"
                                >
                                  Simulate Recipient Reply (Test Unlock)
                                </button>
                              </div>
                            ) : (
                              <p className="flex items-center gap-1.5 text-ink-faint">
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                  {m.candidate.email
                                    ? `Email obscured: ${obscureEmail(m.candidate.email)}`
                                    : 'Email protected by Chap Relay'}
                                </span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedRecipientForMessage({ ...m.candidate, matchThreads: m.threads, matchScore: m.score })}
                            title="Opens a ready-made draft"
                            className="shrink-0 h-9 px-3 border border-rule bg-surface text-sm font-medium text-ink hover:border-action hover:text-action-text transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Mail className="w-4 h-4" strokeWidth={1.75} />
                            <span>Message {firstName}</span>
                          </button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'profile' ? (
        /* Edit Profile: grouped sections, one save bar. */
        <div className="max-w-3xl mx-auto w-full">
          <div className="mb-8">
            <h2 className="font-heading text-3xl font-semibold text-ink tracking-tight">Edit Profile</h2>
            {isAlumniMentor && (
              <p className="mt-2 text-ink-muted leading-relaxed max-w-prose">
                Keep your profile up to date so fellow alumni can find Chaps on a similar path, and students can reach out for advice and new opportunities.
              </p>
            )}
          </div>

          {profileSaveSuccess && (
            <div role="status" className="mb-6 flex items-center gap-2 border border-good/40 bg-sunken px-4 py-3 text-sm font-medium text-good panel animate-in fade-in duration-300">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {isAlumniMentor && (
              <ProfileSection title="Your Chap">
                <ChapPicker
                  label="Your Chap"
                  value={profileForm.avatar}
                  seed={profile?.user_id || profile?.name}
                  onChange={(value) => setProfileForm(f => ({ ...f, avatar: value }))}
                />
              </ProfileSection>
            )}

            <ProfileSection title="About you">
              <div className="grid gap-5 sm:grid-cols-2">
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
              </div>
              <div>
                <label className={labelClass}>Profile Path / Flow</label>
                <select
                  name="flow_type"
                  value={profileForm.flow_type || 'post_schooling'}
                  onChange={handleProfileFormChange}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="post_schooling">Working / Post-Schooling</option>
                  <option value="recent">Undergraduate / College</option>
                  <option value="post_undergrad">Grad School / Post-Undergrad</option>
                </select>
              </div>
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
            </ProfileSection>

            <ProfileSection title="Education">
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
              {profileForm.flow_type === 'post_undergrad' && (
                <>
                  <div>
                    <label className={labelClass}>Graduate School</label>
                    <select
                      name="post_grad_school"
                      value={profileForm.post_grad_school || ''}
                      onChange={handleProfileFormChange}
                      className={`${inputClass} cursor-pointer`}
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
                      className={`${inputClass} cursor-pointer`}
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
              {isWorkingFlow && (
                <div className="grid gap-5 sm:grid-cols-2">
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
                </div>
              )}
            </ProfileSection>

            {isWorkingFlow && (
              <ProfileSection title="Work">
                <div>
                  <label className={labelClass}>Are you currently working?</label>
                  <select
                    name="working"
                    value={profileForm.working || ''}
                    onChange={handleProfileFormChange}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="">-- Select --</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {profileForm.working === 'yes' && (
                  <div className="grid gap-5 sm:grid-cols-2">
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
                  </div>
                )}
              </ProfileSection>
            )}

            {isWorkingFlow && (
              <ProfileSection title="Contact &amp; permissions">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Preferred Reach Out Method</label>
                    <select
                      name="contactPlatform"
                      value={profileForm.contactPlatform || ''}
                      onChange={handleProfileFormChange}
                      className={`${inputClass} cursor-pointer`}
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
                <div className="space-y-3 pt-1">
                  <label className="flex items-start space-x-3 p-4 border border-rule bg-sunken cursor-pointer panel">
                    <input type="checkbox" name="newsletterConsent" checked={!!profileForm.newsletterConsent} onChange={handleProfileFormChange} className="mt-0.5 w-5 h-5 accent-blue-600" />
                    <span className="text-sm font-medium text-ink">I give permission to send the alumni newsletter and publications to my email.</span>
                  </label>
                  <label className="flex items-start space-x-3 p-4 border border-rule bg-sunken cursor-pointer rounded-slight">
                    <input type="checkbox" name="contactConsent" checked={!!profileForm.contactConsent} onChange={handleProfileFormChange} className="mt-0.5 w-5 h-5 accent-blue-600" />
                    <span className="text-sm font-medium text-ink">I'm open to students reaching out now and then for mentorship or advice.</span>
                  </label>
                </div>
              </ProfileSection>
            )}

            <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0 border-t border-rule bg-canvas/95 backdrop-blur px-4 sm:px-0 py-4 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full sm:w-auto h-11 bg-action text-action-ink font-medium px-6 flex items-center justify-center gap-2 transition-colors hover:bg-action-hover text-sm cursor-pointer disabled:opacity-60"
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
            </div>
          </form>

          {(session?.user?.id === '11111111-1111-1111-1111-111111111111' || import.meta.env.DEV || window.location.hostname.includes('vercel.app')) && (
            <section className="mt-10 border border-bad/30 p-5 sm:p-6 panel">
              <h3 className="font-heading text-lg font-semibold text-ink">Reset account</h3>
              <p className="mt-1 text-sm text-ink-muted max-w-prose">Deletes your profile and matches so you can start onboarding again. Available in development builds only.</p>
              <button
                type="button"
                onClick={handleResetDevMode}
                className="mt-4 h-10 px-4 border border-bad/40 text-bad text-sm font-medium flex items-center gap-2 transition-colors hover:border-bad hover:bg-sunken cursor-pointer"
              >
                Reset Account
              </button>
            </section>
          )}
        </div>
      ) : null}

      {/* HOME TAB: greeting with real stats, alumni on a similar path and the
          latest news in the main column; profile, magazine and official links
          in the side column. Phones stack them in that order. */}
      {activeTab === 'home' && (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="navy-field px-6 sm:px-8 py-6 sm:py-7 panel overflow-hidden"
          >
            <div className="flex items-center gap-5 min-w-0">
              <ChapAvatar
                avatar={profileForm.avatar}
                seed={profile?.user_id || profile?.name}
                size={72}
                className="hidden sm:block ring-4 ring-white/15"
              />
              <div className="min-w-0">
                {(profile?.grad_year || profile?.gradYear) && (
                  <p className="text-sm text-on-navy-muted">
                    Class of{' '}
                    <span className="tabular text-heritage-on-navy font-medium">
                      {profile.grad_year || profile.gradYear}
                    </span>
                  </p>
                )}
                <h1 className="mt-1 font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-on-navy">
                  Welcome back, {profile?.name?.split(' ')[0] || 'Chap'}.
                </h1>
              </div>
            </div>

          </motion.div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-10 lg:items-start">
            <div className="min-w-0 space-y-10">
              {!isStudent && (
                <SimilarChaps
                  matches={alumniMatches}
                  onMessage={(m) => setSelectedRecipientForMessage({ ...m.candidate, matchThreads: m.threads, matchScore: m.score })}
                  onSeeAll={() => setActiveTab('matches')}
                  onEditProfile={() => setActiveTab('profile')}
                />
              )}

              {newsPosts.length > 0 && (
                <section aria-labelledby="latest-news-title">
                  <div className="flex items-end justify-between gap-4 mb-4">
                    <h2 id="latest-news-title" className="font-heading text-2xl font-semibold tracking-tight text-ink">
                      Latest from Alumni News
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('board')}
                      className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-action-text hover:underline cursor-pointer"
                    >
                      <span>All stories</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {newsPosts.slice(0, 3).map(post => (
                      <li key={post.id} className="group relative flex flex-col overflow-hidden bg-surface border border-rule panel hover:border-rule-strong transition-colors">
                        <div className="aspect-[16/9] overflow-hidden bg-sunken">
                          <img src={artFor(post)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5 p-4">
                          <p className="text-xs">
                            <span className="font-semibold text-heritage">{post.category}</span>
                            <span className="ml-3 text-ink-faint">{post.date}</span>
                          </p>
                          <h3 className="font-heading text-base font-semibold text-ink leading-snug line-clamp-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab('board')}
                              className="text-left cursor-pointer after:absolute after:inset-0 focus-visible:outline-none"
                            >
                              {post.title}
                            </button>
                          </h3>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-32">
              {/* Featured magazine issue */}
              <section className="bg-surface border border-rule p-5 panel">
                <div className="flex items-center gap-2 text-sm font-medium text-action-text">
                  <Newspaper className="w-4 h-4" />
                  <span>Alumni Magazine &amp; Gazette</span>
                </div>
                <h2 className="mt-2 font-heading text-lg font-semibold text-ink leading-snug">
                  The Chaparral Review: Fall Issue Now Live
                </h2>
                <button
                  onClick={() => setActiveTab('board')}
                  className="mt-4 w-full h-10 px-4 bg-action text-action-ink font-medium text-sm hover:bg-action-hover transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Read Alumni News</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </section>

              {/* Official links: each row is one link */}
              <section aria-labelledby="official-links-title">
                <h2 id="official-links-title" className="font-heading text-lg font-semibold text-ink mb-3">
                  Eanes ISD &amp; Alumni Association
                </h2>
                <ul className="bg-surface border border-rule panel divide-y divide-rule overflow-hidden">
                  {[
                    {
                      term: 'Westlake Alumni Association',
                      logo: '/logos/westlake-alumni-association.png',
                      href: 'https://eaneseducationfoundation.org/alumni/',
                      desc: 'Reunions, class news and the alumni registry.',
                    },
                    {
                      term: 'Eanes ISD Website',
                      logo: '/logos/eanes-isd.png',
                      href: 'https://www.eanesisd.net/',
                      desc: 'District news, calendars and athletics.',
                    },
                    {
                      term: 'Support the Foundation',
                      logo: '/logos/eanes-education-foundation.png',
                      href: 'https://eaneseducationfoundation.org/donate/',
                      desc: 'Donations fund Eanes teachers and classrooms.',
                    },
                  ].map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-3 p-3.5 hover:bg-sunken transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action"
                      >
                        <img src={item.logo} alt="" className="h-11 w-11 shrink-0 object-contain" loading="lazy" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink leading-snug">{item.term}</span>
                          <span className="block text-xs text-ink-muted mt-0.5">{item.desc}</span>
                        </span>
                        <ExternalLink className="w-4 h-4 shrink-0 text-ink-faint group-hover:text-action-text transition-colors" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </div>
      )}

      {/* ALUMNI NEWS TAB */}
      {activeTab === 'board' && (
        <MessageBoard />
      )}

      {/* Recipient Message Modal */}
      {selectedRecipientForMessage && (() => {
        const draft = generateAlumniOutreachDraft(
          profile || {},
          selectedRecipientForMessage,
          selectedRecipientForMessage.matchThreads || []
        );

        return (
          <SendMessageModal
            isOpen={Boolean(selectedRecipientForMessage)}
            onClose={() => setSelectedRecipientForMessage(null)}
            recipient={selectedRecipientForMessage}
            currentUser={session}
            defaultSubject={draft.subject}
            defaultBody={draft.body}
            onSent={() => setMessageRelayTick(t => t + 1)}
          />
        );
      })()}
      </main>
    </div>
  );
}

// One titled group of fields on the Edit Profile tab.
function ProfileSection({ title, children }) {
  return (
    <section className="bg-surface border border-rule p-5 sm:p-6 panel">
      <h3 className="font-heading text-lg font-semibold text-ink mb-5">{title}</h3>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
