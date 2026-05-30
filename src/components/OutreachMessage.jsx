import React, { useState } from 'react';
import { Copy, Check, MessageSquare, Sparkles, GraduationCap, Coffee } from 'lucide-react';
import { cn } from '../utils/cn';

export default function OutreachMessage({ matchData, userProfile }) {
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

  if (!matchData || !matchData.mentor || !userProfile) {
    return null; // Guard against rendering crashes if profile data is missing
  }

  const { mentor, commonThreads } = matchData;

  // Helper to parse arrays/lists safely
  const parseArray = (str) => {
    if (Array.isArray(str)) return str.filter(s => typeof s === 'string' && s.trim() !== '');
    if (typeof str === 'string') return str.split(',').map(s => s.trim()).filter(s => s.trim() !== '');
    return [];
  };

  const userTargetColleges = parseArray(userProfile.targetColleges || userProfile.college);
  const userTargetCareers = parseArray(userProfile.targetCareers || userProfile.career);
  const userTargetMajors = parseArray(userProfile.targetMajors || userProfile.major);
  const userActivities = parseArray(userProfile.activities || userProfile.high_school_activities);

  // Variable Interpolations
  const mentorFirstName = mentor.name ? mentor.name.split(' ')[0] : 'Alumni';
  const studentFirstName = userProfile.name ? userProfile.name.split(' ')[0] : 'a fellow Chap';
  const studentFullName = userProfile.name || 'A fellow Chap';
  
  // Parse mentor last name for formal salutation
  const mentorNameParts = mentor.name ? mentor.name.trim().split(' ') : [];
  const mentorLastName = mentorNameParts.length > 1 ? mentorNameParts[mentorNameParts.length - 1] : '';
  const mentorSalutation = mentorLastName ? `Mr./Ms. ${mentorLastName}` : mentor.name || 'Alumni';

  const gradYearVal = userProfile.gradYear || userProfile.grad_year || '';
  const studentGradYearShort = gradYearVal ? `'${String(gradYearVal).slice(-2)}` : 'XX';

  // --- INTELLIGENT SHARED COLLEGE MATCHING ---
  const mentorSchools = [mentor.college, mentor.first_grad_education, mentor.second_grad_education, mentor.education]
    .filter(Boolean);
  
  let matchedSchoolName = '';
  if (userTargetColleges.length > 0) {
    const matched = userTargetColleges.find(target => {
      const targetLower = target.toLowerCase();
      return mentorSchools.some(school => 
        school.toLowerCase().includes(targetLower) || targetLower.includes(school.toLowerCase())
      );
    });
    
    if (matched) {
      matchedSchoolName = mentorSchools.find(school => 
        school.toLowerCase().includes(matched.toLowerCase()) || matched.toLowerCase().includes(school.toLowerCase())
      );
    }
  }

  const sharedCollege = matchedSchoolName || mentor.college || (userTargetColleges && userTargetColleges[0]) || 'your university';
  const mentorJobTitle = mentor.current_position || 'professional';

  // 1. Detect if the mentor is currently in school / a student
  const isCurrentStudent = 
    (mentor.current_position && (
      mentor.current_position.toLowerCase().includes('student') || 
      mentor.current_position.toLowerCase().includes('candidate') || 
      mentor.current_position.toLowerCase().includes('mba') || 
      mentor.current_position.toLowerCase().includes('undergrad') || 
      mentor.current_position.toLowerCase().includes('fellow') ||
      mentor.current_position.toLowerCase().includes('phd')
    )) || 
    (mentor.role && (
      mentor.role.toLowerCase().includes('student') || 
      mentor.role.toLowerCase().includes('school')
    ));

  // Automatically find mentor's company or school association
  let mentorCompany = mentor.company || '';
  if (!mentorCompany && mentor.current_position) {
    const atMatch = mentor.current_position.match(/(?:at|@)\s+([^,]+)/i);
    if (atMatch) mentorCompany = atMatch[1].trim();
  }
  if (!mentorCompany) mentorCompany = 'your company';

  const studentIndustry = userTargetCareers[0] || userTargetMajors[0] || 'your industry of interest';
  const intendedMajor = userTargetMajors[0] || 'Business';

  // Conditional activities phrase building
  let activitiesSentence = '';
  if (userActivities.length >= 2) {
    activitiesSentence = `I’m currently involved in ${userActivities[0]} and ${userActivities[1]} at Westlake, and `;
  } else if (userActivities.length === 1) {
    activitiesSentence = `I’m currently involved in ${userActivities[0]} at Westlake, and `;
  }

  // --- Parse Primary Match Type for Dynamic Context-Aware Phrasing ---
  const primaryThread = (commonThreads && commonThreads.length > 0) ? commonThreads[0] : '';
  const isMajorMatch = primaryThread.startsWith("Academic Synergy:") || primaryThread.startsWith("Field Synergy:");
  const isUniMatch = primaryThread.startsWith("Target University:") || primaryThread.startsWith("University System:");
  const isCareerMatch = primaryThread.startsWith("Career Path Alignment:");

  // --- Dynamic wording based on Student vs. Professional Status ---
  const casualCollegePhrase = isCurrentStudent
    ? `noticed you are currently going to ${sharedCollege}`
    : `noticed you went to ${sharedCollege}`;

  const casualJobPhrase = isCurrentStudent
    ? `currently studying as a ${mentorJobTitle}`
    : `currently working as a ${mentorJobTitle}`;

  const coffeeJobPhrase = isCurrentStudent
    ? `currently studying as a ${mentorJobTitle}`
    : `working as a ${mentorJobTitle}`;

  const coffeeCollegePhrase = isCurrentStudent
    ? `your current experience at ${sharedCollege}`
    : `your experience at ${sharedCollege}`;

  const formalCareerVibe = isCurrentStudent
    ? `Seeing your academic and career trajectory as a ${mentorJobTitle} at ${sharedCollege} is incredibly inspiring.`
    : `Seeing your career trajectory as the ${mentorJobTitle}${mentorCompany !== 'your company' ? ` at ${mentorCompany}` : ''} is incredibly inspiring.`;

  // --- HIGHLY CUSTOMIZED outreach text segments depending on MAJOR vs. UNIVERSITY vs. CAREER ---
  // CASUAL VIBE segment
  let casualIntroSegment = '';
  let casualIndustrySegment = '';
  if (isMajorMatch) {
    casualIntroSegment = `noticed you went to ${sharedCollege} to study in the field of ${intendedMajor}—which is actually my top intended major!`;
    casualIndustrySegment = `since I'm really hoping to head down a similar path in ${studentIndustry}`;
  } else if (isUniMatch) {
    casualIntroSegment = `${casualCollegePhrase}—which is actually one of my top dream schools!`;
    casualIndustrySegment = `since I'm currently exploring different career paths and really hoping to head to ${sharedCollege}`;
  } else if (isCareerMatch) {
    casualIntroSegment = `noticed your career path as a ${mentorJobTitle}—which is actually the exact path I'm hoping to pursue!`;
    casualIndustrySegment = `since I'm really hoping to head down a similar path in ${studentIndustry}`;
  } else {
    casualIntroSegment = `${casualCollegePhrase}—which is a fantastic school!`;
    casualIndustrySegment = `since I'm currently exploring different career options and would love to learn more about your field`;
  }

  // FORMAL VIBE segment
  let formalIntroSegment = '';
  if (isMajorMatch) {
    formalIntroSegment = `I am highly interested in pursuing a career in ${studentIndustry}, and noticed you studied in this exact field at ${sharedCollege}. Seeing your academic path at ${sharedCollege} and your trajectory as a ${mentorJobTitle} is incredibly inspiring.`;
  } else if (isUniMatch) {
    formalIntroSegment = `I am highly interested in exploring different career options, and ${sharedCollege} is currently one of my top target universities. ${formalCareerVibe}`;
  } else {
    formalIntroSegment = `I am highly interested in pursuing a career in ${studentIndustry}, and ${sharedCollege} is currently one of my top target universities. ${formalCareerVibe}`;
  }

  // COFFEE CHAT VIBE segment
  let coffeeMajorSegment = '';
  if (isMajorMatch) {
    coffeeMajorSegment = `I'm really hoping to study ${intendedMajor} in college, and noticed you studied in this exact field at ${sharedCollege}! I also saw that you're ${coffeeJobPhrase}, which is amazing`;
  } else if (isUniMatch) {
    coffeeMajorSegment = `I'm really hoping to study ${intendedMajor} in college, and ${sharedCollege} is at the very top of my list! I also saw that you're ${coffeeJobPhrase}, which is amazing`;
  } else {
    coffeeMajorSegment = `I'm currently exploring different academic fields of study for college, and ${sharedCollege} is at the top of my list. I also saw that you're ${coffeeJobPhrase}, which is amazing`;
  }

  // Unified outreach message generators
  const getSubjectText = () => {
    if (matchData.outreachMessage) {
      return `WHS Connection Inquiry — ${studentFullName}`;
    }
    return `Quick WHS to ${sharedCollege} connection!`;
  };

  const getBodyText = () => {
    if (matchData.outreachMessage) {
      return matchData.outreachMessage;
    }
    // Fallback template (highly customized)
    return `Hi ${mentorFirstName},\n\nI hope your week is going well! I am a student at Westlake (Class of ${gradYearVal}) interested in studying ${intendedMajor} and pursuing a path in ${studentIndustry}.\n\nI noticed we both share a connection to WHS and ${sharedCollege || 'similar paths'}, and saw that you are currently ${isCurrentStudent ? 'studying as a ' : 'working as a '}${mentorJobTitle}. I'd love to learn about your transition from WHS to ${mentorCompany}.\n\nWould you be open to a quick 15-minute virtual coffee chat in the next few weeks?\n\nWarmly,\n\n${studentFullName}`;
  };

  const subjectText = getSubjectText();
  const bodyText = getBodyText();

  const handleCopySubject = () => {
    navigator.clipboard.writeText(subjectText);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(bodyText);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  return (
    <div className="bg-white border-4 border-slate-900 rounded-2xl brutal-shadow p-6 flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-red-500 border-2 border-slate-900 rounded-lg brutal-shadow-sm rotate-[-4deg]">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Reach Out</h3>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase tracking-widest">
            {matchData.outreachMessage ? "✨ AI Customized Message" : "Tailored Connection Message"}
          </p>
        </div>
      </div>

      <div className="flex-grow flex flex-col space-y-4">
        {/* Subject copy component */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Email Subject</label>
          <div className="flex border-2 border-slate-900 rounded-xl overflow-hidden brutal-shadow-sm">
            <div className="bg-slate-100 px-3 py-2 flex-grow text-xs font-bold text-slate-700 truncate select-all">
              {subjectText}
            </div>
            <button
              onClick={handleCopySubject}
              className={cn(
                "px-3 py-2 border-l-2 border-slate-900 font-black text-xs uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all",
                copiedSubject ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {copiedSubject ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[3]" />}
              <span>{copiedSubject ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Message body copy component */}
        <div className="flex flex-col flex-grow">
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Message Body</label>
          <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-4 text-slate-900 whitespace-pre-wrap font-semibold text-xs sm:text-sm leading-relaxed flex-grow shadow-[inset_3px_3px_0px_0px_rgba(0,0,0,0.1)] min-h-[220px]">
            {bodyText}
          </div>
        </div>
        
        <button
          onClick={handleCopyBody}
          className={cn(
            "w-full py-3.5 px-6 rounded-xl font-black uppercase tracking-wider flex items-center justify-center space-x-2 border-2 border-slate-900 brutal-shadow transition-all cursor-pointer text-sm sm:text-base",
            copiedBody 
              ? "bg-green-500 text-white" 
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {copiedBody ? (
            <>
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Message Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 stroke-[3]" />
              <span>Copy Message Body</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
