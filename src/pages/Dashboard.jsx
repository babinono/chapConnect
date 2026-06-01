import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import Autocomplete from '../components/Autocomplete';
import { 
  Briefcase, 
  GraduationCap, 
  MapPin, 
  Save, 
  Sparkles, 
  BookOpen, 
  Plus, 
  Loader2, 
  Trash2, 
  User, 
  FolderHeart,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../utils/cn';

const COLLEGES = [
  "University of Texas at Austin", "UT Austin", "UT",
  "Stanford University", "Stanford", "Duke University", "Duke", "Duke Business",
  "Yale University", "Yale", "Yale Law", "Northwestern University", "Northwestern", "Northwestern Business",
  "Emory University", "Emory", "Caltech", "Carnegie Mellon University", "CMU",
  "Princeton University", "Princeton", "Harvard University", "Harvard", "Harvard Law", "Harvard Business", "Harvard Medical School",
  "Vanderbilt University", "Vanderbilt", "Vanderbilt Law", "Loyola Marymount University", "LMU",
  "Auburn University", "Auburn", "LSU", "Scripps Research", "Baylor University", "Baylor", "Baylor College of Medicine",
  "McGovern Medical School", "UTHealth", "UTHealth SA", "Dell Medical School", "UTSW", "UIUC", "St. Georges",
  "Lake Forest College", "Columbia University", "Columbia", "UCLA", "USC", "Cal State Long Beach", "University of Georgia", "UGA",
  "Cornell University", "Cornell", "Georgia Tech", "Rice University", "Rice", "Rice Business", "Texas A&M University", "TAMU",
  "UNC", "Pepperdine University", "Pepperdine", "Cambridge", "Oxford", "West Point", "USNA", "USAFA",
  "Dartmouth College", "Dartmouth", "UChicago", "UChicago Law", "Harvey Mudd", "UC Berkeley", "Brown University", "Brown", "UNT",
  "Fuller Theological Seminar", "Hendrix College", "Ringling College of Art and Design", "Texas State University", "Texas State",
  "NYU", "NYU Stern", "NYU Law", "Swarthmore", "Oklahoma University", "OU", "McCombs School of Business", "Brandeis", "Texas Christian University", "TCU",
  "Elon University", "Elon", "MIT", "UT Law", "ASU", "NC State", "NCSU", "LSE", "London School of Economics", "University of Pittsburgh", "Pitt",
  "UPenn", "UPenn Wharton", "UPenn Dental", "Colorado College", "Georgetown University", "Georgetown", "Belmont University", "WUSTL", "WUSTL Med",
  "Leiden University", "Lewis and Clark Law", "SCAD", "Colorado State", "Liberty University", "Texas Tech", "TTU", "TTU Med", "UBC", "WPI",
  "George Washington University", "Arizona State University", "Boston University", "Boston College", "Clemson University", "University of South Carolina",
  "Syracuse University", "Babson College", "Case Western", "Barnard College", "Bryn Mawr", "Washington and Lee", "Chapman University", "Rochester University",
  "Denver University", "Babson", "Bowdoin College", "Wellesley College", "SLU", "Johns Hopkins", "JHU Medicine", "Florida State University", "FSU",
  "University of Michigan", "UMich", "Notre Dame", "University of Toronto", "UToronto", "Wake Forest", "Wesleyan University", "Villanova", "Virginia Tech",
  "Pratt Institute", "Claremont McKenna", "UTD", "Iowa State", "UTA", "Lund University", "Seton Hall", "UTMB", "NYU Shanghai", "Vassar College", "Vassar"
];

const MAJORS = [
  "Computer Science", "Computer Engineering", "Electrical Engineering", "Mechanical Engineering", "Aerospace Engineering", "Chemical Engineering",
  "Civil Engineering", "Biomedical Engineering", "Industrial Engineering", "Software Engineering", "Data Science", "Business Administration",
  "Finance", "Accounting", "Marketing", "Management", "International Business", "Management Information Systems", "MIS", "Economics", "Econometrics",
  "Public Policy", "Political Science", "International Relations", "Government", "Psychology", "Clinical Psychology", "Biology", "Microbiology",
  "Neuroscience", "Chemistry", "Biochemistry", "Physics", "Mathematics", "Applied Mathematics", "Statistics", "Pre-Med", "Pre-Law", "Sociology",
  "Philosophy", "English", "English Literature", "History", "Art History", "Communications", "Journalism", "Nursing", "Public Health",
  "Environmental Science", "Geology", "Anthropology", "Linguistics", "Theater & Drama", "Film & Television", "Graphic Design", "Fine Arts",
  "Architecture", "Music", "Human Development", "Education"
];

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

  useEffect(() => {
    if (!session?.user?.id) return;

    async function fetchDashboardData() {
      try {
        // 1. Fetch user profile
        const { data: profileData, error: profileErr } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profileErr) {
          console.error("Error fetching profile:", profileErr);
        } else if (profileData) {
          setProfile(profileData);
          
          // Convert database arrays to comma-separated strings for form state inputs
          const toString = (arr) => Array.isArray(arr) ? arr.join(', ') : (arr || '');
          setProfileForm({
            ...profileData,
            targetColleges: toString(profileData.target_colleges),
            targetMajors: toString(profileData.target_majors),
            targetCareers: toString(profileData.target_careers),
            activities: toString(profileData.high_school_activities),
            classes: toString(profileData.favorite_classes)
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
    setProfileForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
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

    const updatedProfile = {
      name: profileForm.name,
      grad_year: parseInt(profileForm.grad_year, 10),
      flow_type: profileForm.flow_type || 'student',
      email: profileForm.email || null,
      college: profileForm.college || null,
      location: profileForm.location || null,
      company: profileForm.company || null,
      career: profileForm.career || null,
      post_grad_school: profileForm.post_grad_school || null,
      post_grad_program: profileForm.post_grad_program || null,
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
      // Sync local profile state with updated values
      setProfile(updatedProfile);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    }
  };

  const handleResetDevMode = async () => {
    if (!window.confirm("Are you sure you want to reset your profile and onboarding data? This will delete your matches and profile from the database so you can start onboarding completely from scratch.")) return;
    
    setLoading(true);
    try {
      // 1. Delete student matches
      await supabase
        .from('student_matches')
        .delete()
        .eq('user_id', session.user.id);
        
      // 2. Delete user profile
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', session.user.id);
        
      // 3. Clear rate limiters and localStorage
      localStorage.removeItem('match_rate_limit');
      localStorage.setItem('dev_profile_reset', 'true');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.includes(`_milestones_`)) {
          localStorage.removeItem(key);
        }
      }
      
      // 4. Force hard redirect to home screen
      window.location.href = '/';
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Loading Networking Hub...</h2>
      </div>
    );
  }

  const labelClass = "block text-sm font-black text-slate-900 mb-2 uppercase tracking-wide";
  const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 font-medium transition-all";

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b-4 border-slate-900 gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 bg-yellow-500 border-2 border-slate-900 text-slate-900 px-3 py-1 font-black text-xs uppercase tracking-widest rounded-md brutal-shadow-sm rotate-[-2deg] mb-3">
            <Sparkles className="w-4.5 h-4.5" />
            <span>Alumni CRM</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">
            Chap Connect
          </h1>
          <p className="text-slate-600 font-bold mt-2">
            Welcome back, {profile?.name || 'Chap'}! Manage your profile and alumni outreach matches.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 self-start md:self-auto">
          {session?.user?.id === '11111111-1111-1111-1111-111111111111' && (
            <button
              onClick={handleResetDevMode}
              className="bg-red-500 text-white font-black py-4 px-6 border-4 border-slate-900 rounded-xl brutal-shadow flex items-center justify-center space-x-2 hover:translate-y-0.5 active:translate-y-1 transition-all uppercase tracking-wider text-sm cursor-pointer"
            >
              <span>Reset Dev Profile</span>
            </button>
          )}

          <button
            onClick={() => handleFindMatch('algo')}
            className="bg-yellow-500 text-slate-900 font-black py-4 px-5 border-4 border-slate-900 rounded-xl brutal-shadow flex items-center justify-center space-x-2 hover:translate-y-0.5 active:translate-y-1 transition-all uppercase tracking-wider text-sm cursor-pointer"
          >
            <span>Quick Algo Match</span>
          </button>

          <button
            onClick={() => handleFindMatch('ai', true)}
            className="bg-blue-600 text-white font-black py-4 px-5 border-4 border-slate-900 rounded-xl brutal-shadow flex items-center justify-center space-x-2 hover:translate-y-0.5 active:translate-y-1 transition-all uppercase tracking-wider text-sm cursor-pointer animate-pulse"
          >
            <Sparkles className="w-5 h-5 stroke-[3] fill-current" />
            <span>Gemini AI Match</span>
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex border-b-4 border-slate-900 mb-10 gap-3">
        <button
          onClick={() => setActiveTab('matches')}
          className={cn(
            "px-6 py-3 font-black text-sm uppercase tracking-wide border-t-4 border-x-4 border-slate-900 rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer",
            activeTab === 'matches' 
              ? "bg-white text-slate-900 border-b-4 border-b-white -mb-1 translate-y-[2px]" 
              : "bg-slate-100 text-slate-500 border-b-4 border-b-slate-900"
          )}
        >
          <FolderHeart className="w-4 h-4" />
          <span>My Matches ({matches.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            "px-6 py-3 font-black text-sm uppercase tracking-wide border-t-4 border-x-4 border-slate-900 rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer",
            activeTab === 'profile' 
              ? "bg-white text-slate-900 border-b-4 border-b-white -mb-1 translate-y-[2px]" 
              : "bg-slate-100 text-slate-500 border-b-4 border-b-slate-900"
          )}
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </button>
      </div>

      {activeTab === 'matches' ? (
        /* Matches CRM list Tab */
        matches.length === 0 ? (
          <div className="bg-white border-4 border-slate-900 brutal-shadow p-10 rounded-2xl text-center max-w-md mx-auto w-full mt-8">
            <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">No Matches Yet</h2>
            <p className="text-slate-700 font-bold mb-8">
              Start matching with Westlake High School graduates to build your profile here!
            </p>
            <button
              onClick={handleFindMatch}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black border-2 border-slate-900 brutal-shadow uppercase tracking-wide cursor-pointer animate-bounce"
            >
              Match Me Instantly
            </button>
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
                <div key={match.id} className="bg-white border-4 border-slate-900 rounded-2xl brutal-shadow flex flex-col overflow-hidden">
                  <div className="h-16 bg-slate-900 flex items-center justify-between px-6 border-b-4 border-slate-900">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-black text-sm uppercase tracking-widest">
                        Status:
                      </span>
                      <select
                        value={match.status}
                        onChange={(e) => handleStatusChange(match.id, e.target.value)}
                        className="bg-white text-slate-900 font-black text-xs uppercase px-2 py-1 rounded border-2 border-white focus:outline-none"
                      >
                        <option value="Matched">Matched</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleDeleteMatch(match.id)}
                      className="text-red-500 hover:text-red-400 p-1 cursor-pointer"
                      title="Remove match"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 flex-grow flex flex-col">
                    <div className="flex items-center space-x-4 mb-4 border-b-2 border-slate-100 pb-4">
                      <img
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(m.name)}`}
                        alt={m.name}
                        className="w-14 h-14 rounded-full border-2 border-slate-900 bg-white"
                      />
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase leading-none">{m.name}</h3>
                        <span className="inline-block mt-1 bg-red-500 border border-slate-900 text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-widest rounded rotate-[-1deg]">
                          Class of {m.grad_year}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 text-xs text-slate-700 font-bold flex-grow">
                      <div className="flex items-center">
                        <Briefcase className="w-4.5 h-4.5 mr-2 text-blue-600 stroke-[3] flex-shrink-0" />
                        <span>{m.current_position || 'Established Alumni'}</span>
                      </div>
                      {m.college && (
                        <div className="flex items-start">
                          <GraduationCap className="w-4.5 h-4.5 mr-2 text-blue-600 stroke-[3] flex-shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            <span>{m.college}</span>
                            {m.first_grad_education && (
                              <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Grad: {m.first_grad_education}</span>
                            )}
                            {m.second_grad_education && (
                              <span className="text-[10px] text-slate-500 font-semibold">Grad 2: {m.second_grad_education}</span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center">
                        <MapPin className="w-4.5 h-4.5 mr-2 text-blue-600 stroke-[3] flex-shrink-0" />
                        <span>{m.location}</span>
                      </div>
                    </div>

                    <a
                      href={linkedInSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 mb-6 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 border-2 border-slate-900 bg-white text-slate-900 brutal-shadow-sm hover:translate-y-[1px] hover:brutal-shadow-none transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-slate-900" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      <span>Find on LinkedIn</span>
                    </a>

                    <div className="border-t-2 border-slate-200 pt-4 flex flex-col">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">My Meeting Logs & Notes</label>
                      <textarea
                        value={notesState[match.id] || ''}
                        onChange={(e) => handleNotesChange(match.id, e.target.value)}
                        placeholder="e.g. Sent email. Coffee chat scheduled for next Tuesday!"
                        className="w-full px-3 py-2 text-xs border-2 border-slate-900 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 font-medium min-h-[80px] resize-none mb-3"
                      />
                      <button
                        onClick={() => handleSaveNotes(match.id)}
                        disabled={savingNoteId === match.id}
                        className={cn(
                          "self-end py-1.5 px-3 rounded-lg font-black text-[10px] uppercase tracking-wide border border-slate-900 brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all",
                          savingNoteId === match.id ? "bg-slate-200" : "bg-yellow-500 text-slate-900"
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
      ) : (
        /* My Profile Editor Tab */
        <div className="max-w-xl mx-auto bg-white border-4 border-slate-900 p-8 rounded-2xl brutal-shadow w-full">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-6 border-b-2 border-slate-200 pb-3 flex items-center space-x-2">
            <User className="w-7 h-7 text-blue-600" />
            <span>Profile Manager</span>
          </h2>

          {profileSaveSuccess && (
            <div className="bg-green-500 text-white font-black p-4 rounded-xl border-2 border-slate-900 brutal-shadow-sm mb-6 flex items-center space-x-2 animate-in fade-in duration-300">
              <CheckCircle2 className="w-6 h-6 stroke-[3]" />
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
                className={`${inputClass} font-black`}
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
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Program / Degree Type</label>
                  <select
                    name="post_grad_program"
                    value={profileForm.post_grad_program || ''}
                    onChange={handleProfileFormChange}
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
              </>
            )}

            {/* WORKING PROFESSIONAL FIELDS */}
            {(profileForm.flow_type === 'post_schooling' || profileForm.flow_type === 'established') && (
              <>
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
                <div>
                  <label className={labelClass}>Industry</label>
                  <select
                    name="career"
                    value={profileForm.career || ''}
                    onChange={handleProfileFormChange}
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
                  <input
                    type="text"
                    name="company"
                    value={profileForm.company || ''}
                    onChange={handleProfileFormChange}
                    className={inputClass}
                    placeholder="e.g. Google"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full bg-blue-600 text-white font-black py-4 px-6 border-4 border-slate-900 rounded-xl brutal-shadow flex items-center justify-center space-x-2 hover:translate-y-0.5 active:translate-y-1 transition-all uppercase tracking-wider text-sm cursor-pointer mt-8"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 stroke-[3]" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
