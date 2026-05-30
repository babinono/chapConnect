import { supabase } from './supabaseClient';

// University Affinity Tiers for smart alignment matches
const UNIVERSITY_GROUPS = [
  {
    id: 'ivies',
    name: 'Ivy League & Elite Private Universities',
    keywords: [
      'harvard', 'yale', 'princeton', 'columbia', 'brown', 'dartmouth', 'upenn', 'wharton', 'cornell',
      'stanford', 'duke', 'northwestern', 'chicago', 'vanderbilt', 'georgetown', 'johns hopkins', 'jhu',
      'nyu', 'stern', 'wustl', 'notre dame', 'emory', 'barnard', 'usc'
    ]
  },
  {
    id: 'uc_system',
    name: 'UC System Schools',
    keywords: [
      'ucla', 'berkeley', 'ucb', 'uc davis', 'ucsb', 'ucsd', 'irvine', 'uc '
    ]
  },
  {
    id: 'texas_schools',
    name: 'Texas Universities',
    keywords: [
      'ut austin', 'university of texas', 'texas a&m', 'tamu', 'rice', 'baylor', 'tcu', 'smu', 
      'texas state', 'texas tech', 'ttu', 'utd', 'uta', 'unt', 'mccombs'
    ]
  },
  {
    id: 'tech_institutes',
    name: 'Tech & Engineering Powerhouses',
    keywords: [
      'mit', 'massachusetts institute', 'caltech', 'carnegie mellon', 'cmu', 'georgia tech', 'harvey mudd', 'wpi', 'uiuc'
    ]
  },
  {
    id: 'liberal_arts',
    name: 'Elite Liberal Arts Colleges',
    keywords: [
      'swarthmore', 'williams', 'amherst', 'bowdoin', 'wellesley', 'colorado college', 'vassar', 'middlebury', 'pomona', 'claremont mckenna', 'bryn mawr'
    ]
  },
  {
    id: 'major_public',
    name: 'Major Public Research Universities',
    keywords: [
      'michigan', 'umich', 'unc', 'chapel hill', 'virginia', 'uva', 'georgia', 'uga', 'florida', 'fsu', 'asu', 'arizona state', 'penn state', 'ohio state', 'clemson', 'auburn', 'lsu'
    ]
  }
];

function getAffinityGroup(schoolName) {
  if (!schoolName) return null;
  const nameLower = schoolName.toLowerCase();
  for (const group of UNIVERSITY_GROUPS) {
    if (group.keywords.some(keyword => nameLower.includes(keyword))) {
      return group;
    }
  }
  return null;
}

// Industry/Academic field associations for semantic keyword matching
const FIELD_ASSOCIATIONS = {
  finance: ['finance', 'business', 'economics', 'banking', 'investment', 'consulting', 'analyst', 'venture', 'equity', 'wealth', 'accounting'],
  business: ['business', 'finance', 'marketing', 'management', 'consulting', 'mba', 'administration', 'strategy', 'operations', 'entrepreneur'],
  cs: ['computer science', 'cs', 'software development', 'software engineering', 'computer engineering', 'developer', 'coding', 'data science', 'programming', 'ai', 'machine learning'],
  engineering: ['engineering', 'bioengineering', 'mechanical engineering', 'electrical engineering', 'chemical engineering', 'aerospace', 'robotics', 'biomedical', 'civil engineering'],
  medicine: ['pre-med', 'biology', 'chemistry', 'medicine', 'md', 'clinical', 'health', 'bioengineering', 'neuroscience', 'doctor', 'healthcare'],
  law: ['pre-law', 'law', 'politics', 'government', 'public policy', 'history', 'legal', 'jd', 'philosophy'],
  arts: ['art', 'design', 'graphic', 'film', 'television', 'theater', 'creative', 'music', 'fine arts', 'architecture', 'creative writing']
};

async function findAIBestMatch(userProfile, mentors, apiKey) {
  const excludedIds = userProfile.excludedIds || [];
  const userLowerName = (userProfile.name || '').trim().toLowerCase();

  // Filter candidates just like we do locally
  const candidates = mentors.filter(mentor => {
    if (userLowerName && mentor.name && mentor.name.trim().toLowerCase() === userLowerName) {
      return false;
    }
    if (excludedIds.includes(mentor.id)) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  // Prepare a smaller prompt representation of candidates to save tokens
  const formattedCandidates = candidates.map(c => ({
    id: c.id,
    name: c.name,
    college: c.college,
    major: c.major || c.education,
    role: c.role || c.current_position,
    current_position: c.current_position,
    location: c.location,
    skills: c.skills,
    match_count: c.match_count || 0
  }));

  const studentProfile = {
    name: userProfile.name,
    gradYear: userProfile.gradYear || userProfile.grad_year,
    targetColleges: userProfile.targetColleges || userProfile.college,
    targetCareers: userProfile.targetCareers || userProfile.career,
    targetMajors: userProfile.targetMajors || userProfile.major,
    activities: userProfile.activities,
    favoriteClasses: userProfile.classes || userProfile.favorite_classes,
    location: userProfile.location
  };

  const systemPrompt = `You are the matching brain of an alumni mentoring platform for Westlake High School (WHS) students.
Your job is to find the absolute best mentor from a list of candidates for a given student profile.

CRITICAL BRANDING RULES:
- NEVER include the words "Chap Connect" or "Chap" in the output (including commonThreads and outreachMessage). Instead, use generic descriptions like "alumni network", "mentorship community", or "alumni connection".

CRITICAL INSTRUCTIONS FOR AI DOMAIN & COLLEGE REASONING:
1. UNIVERSITY ALIGNMENT: Prioritize matching the student with a mentor who attended one of the student's "targetColleges" (schools they are highly interested in). 
   - TONAL RULE: In the generated outreach message, NEVER use sweaty, prestige-hunter phrases like "dream school", "dream university", or "top target". Instead, speak naturally and humbly, e.g., "a university I am highly interested in", "a school I'm really excited about", or "a college I'm strongly considering".
2. CLASS & CLUB INTERSECTION: Take the student's "favoriteClasses" and high school "activities" (clubs) into deep account alongside their target majors to determine their unique domain "flavor". 
   - For example, if a student lists "Calculus BC", "Computer Science Club", and intends to study "Biomedical Engineering", they lean heavily towards the technical/computational/medical device side of BME. Match them with a mentor who studied BME with a focus on code, systems, devices, or computing.
   - Apply this deep intersectional reasoning for all major/club/class combinations.

Evaluate candidates based on:
1. Target University Match (extremely high weight)
2. Class & Club Synergy (intersections of WHS classes, clubs, and target majors matched to mentor's actual field)
3. Academic & Major Synergy
4. Career Path Alignment

Output your decision strictly as a JSON object with this exact structure:
{
  "mentorId": "the ID of the selected mentor",
  "commonThreads": [
    "A bullet point explaining the primary match alignment (e.g., 'Target University: Aligned with your target school, Stanford University')",
    "A bullet point specifically highlighting the class/club intersection reasoning (e.g., 'Interdisciplinary Tech: Connected your CS Club and Calculus BC interests to your mentor\\'s software-driven bioengineering research')"
  ],
  "outreachMessage": "An extremely CONCISE, warm, and highly personalized outreach email from the student to the mentor (STRICT MAXIMUM 80-110 words, exactly 2 short paragraphs). Avoid repeating information or stating student interests twice. Greeting: 'Dear [Mentor Name],'. Intro: student name, Westlake High School class of [Grad Year]. Body: highly tailored, punchy connection linking their WHS classes/clubs and target university directly to the mentor's track. Request a brief 15-minute coffee chat. Closing: 'Best regards,\\n[Student Name]'. Use this exact elegant style as your gold-standard tone benchmark: 'My involvement in the Writing Club and Student Council at WHS, alongside my favorite English classes, makes me eager to learn more about your academic journey and how your sociology background has shaped your path.'"
}

Return ONLY this JSON object and nothing else. Do NOT wrap in \`\`\`json block.`;

  const userPrompt = `Student Profile:
${JSON.stringify(studentProfile, null, 2)}

Candidate Mentors:
${JSON.stringify(formattedCandidates, null, 2)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  const parsed = JSON.parse(text.trim());
  const selectedMentor = candidates.find(c => c.id === parsed.mentorId);
  
  if (!selectedMentor) {
    throw new Error(`Gemini selected mentorId ${parsed.mentorId} which was not in candidate list.`);
  }

  return {
    mentor: selectedMentor,
    commonThreads: parsed.commonThreads || [],
    outreachMessage: parsed.outreachMessage,
    isAIPowered: true
  };
}

export async function findBestMatch(userProfile) {
  // Fetch all mentors from Supabase
  const { data: mentors, error } = await supabase
    .from('mentors')
    .select('*');

  if (error) {
    console.error("Error fetching mentors:", error);
    return null;
  }

  if (!mentors || mentors.length === 0) {
    return null;
  }

  // 1. Check if Gemini API key exists, if so try AI matchmaking first
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey) {
    try {
      console.log("matchingEngine: VITE_GEMINI_API_KEY detected, initiating Gemini AI Matcher...");
      const aiResult = await findAIBestMatch(userProfile, mentors, apiKey);
      if (aiResult) {
        console.log("matchingEngine: Gemini AI successfully matched with mentor:", aiResult.mentor.name);
        return aiResult;
      }
    } catch (aiErr) {
      console.warn("matchingEngine: Gemini AI matching failed/errored. Falling back to local heuristic match engine.", aiErr);
    }
  } else {
    console.log("matchingEngine: VITE_GEMINI_API_KEY not found. Running local heuristic match engine.");
  }


  let bestMatch = null;
  let maxScore = -999;
  let commonThreads = [];

  const excludedIds = userProfile.excludedIds || [];
  const userLowerName = (userProfile.name || '').trim().toLowerCase();

  // Parse list inputs defensively (supports text arrays and comma-separated lists)
  const parseArray = (str) => {
    if (Array.isArray(str)) return str.filter(s => typeof s === 'string' && s.trim() !== '');
    if (typeof str === 'string') return str.split(',').map(s => s.trim()).filter(s => s.trim() !== '');
    return [];
  };

  const userTargetColleges = parseArray(userProfile.targetColleges || userProfile.college);
  const userTargetCareers = parseArray(userProfile.targetCareers || userProfile.career);
  const userTargetMajors = parseArray(userProfile.targetMajors || userProfile.major);
  const userActivities = parseArray(userProfile.activities);

  for (const mentor of mentors) {
    // 1. Skip if the mentor is the user themselves (guards against self-matching)
    if (userLowerName && mentor.name && mentor.name.trim().toLowerCase() === userLowerName) {
      continue;
    }

    // 2. Skip already matched mentors to guarantee fresh, duplicate-free matches
    if (excludedIds.includes(mentor.id)) {
      continue;
    }

    let score = 0;
    let currentCommonThreads = [];

    // Combine all mentor education/profile fields to run broad searches
    const mentorSchools = [mentor.college, mentor.first_grad_education, mentor.second_grad_education, mentor.education]
      .filter(Boolean)
      .map(s => s.trim().toLowerCase());

    const mentorProfiles = [mentor.current_position, mentor.education, mentor.role, mentor.college]
      .filter(Boolean)
      .map(c => c.trim().toLowerCase());

    // --- 1. ACADEMIC MAJOR SYNERGY (HIGHEST WEIGHT: +30) ---
    // Direct major match first
    let majorMatchFound = false;
    const matchedMajor = userTargetMajors.find(major => {
      const majorLower = major.toLowerCase();
      return mentorProfiles.some(profile => profile.includes(majorLower) || majorLower.includes(profile));
    });

    if (matchedMajor) {
      score += 30; // Highly focused on intended majors
      majorMatchFound = true;
      currentCommonThreads.push(`Academic Synergy: Shared focus in studying ${matchedMajor}`);
    }

    // --- 2. CAREER & POSITION MATCHING (+25) ---
    let careerMatchFound = false;
    const matchedCareer = userTargetCareers.find(career => {
      const careerLower = career.toLowerCase();
      return mentorProfiles.some(profile => profile.includes(careerLower) || careerLower.includes(profile));
    });

    if (matchedCareer) {
      score += 25;
      careerMatchFound = true;
      const positionName = mentor.current_position || matchedCareer;
      currentCommonThreads.push(`Career Path Alignment: In your target field of ${positionName}`);
    }

    // --- 3. UNIVERSITY MATCHING (+20 or +10 for Affinity Group) ---
    const matchedSchool = userTargetColleges.find(target => {
      const targetLower = target.toLowerCase();
      return mentorSchools.some(school => school.includes(targetLower) || targetLower.includes(school));
    });

    if (matchedSchool) {
      score += 20; 
      const exactSchoolName = [mentor.college, mentor.first_grad_education, mentor.second_grad_education]
        .find(s => s && (s.toLowerCase().includes(matchedSchool.toLowerCase()) || matchedSchool.toLowerCase().includes(s.toLowerCase()))) || mentor.college || matchedSchool;
      currentCommonThreads.push(`Target University: Both connected to ${exactSchoolName}`);
    } else {
      // Affinity tier similarity match (+10)
      let affinityMatch = null;
      let matchedTargetSchool = '';
      let matchedMentorSchool = '';
      
      for (const target of userTargetColleges) {
        const targetGroup = getAffinityGroup(target);
        if (targetGroup) {
          const matchingMentorSchool = mentorSchools.find(school => {
            const mentorGroup = getAffinityGroup(school);
            return mentorGroup && mentorGroup.id === targetGroup.id;
          });
          
          if (matchingMentorSchool) {
            affinityMatch = targetGroup;
            matchedTargetSchool = target;
            matchedMentorSchool = matchingMentorSchool;
            break;
          }
        }
      }

      if (affinityMatch) {
        score += 10;
        const formatSchool = (s) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        currentCommonThreads.push(`University System: Aligned in ${affinityMatch.name} (e.g. ${formatSchool(matchedTargetSchool)} & ${formatSchool(matchedMentorSchool)})`);
      }
    }

    // --- 4. SEMANTIC FIELD ASSOCIATION MATCH (+18) ---
    // Fall back to semantic field associations if no direct major/career match was found
    if (!majorMatchFound && !careerMatchFound) {
      const userKeywords = [...userTargetMajors, ...userTargetCareers].map(k => k.toLowerCase());
      
      let semanticMatch = null;
      for (const [category, keywords] of Object.entries(FIELD_ASSOCIATIONS)) {
        const hasCategoryKeyword = userKeywords.some(uKeyword => 
          category === uKeyword || keywords.some(k => uKeyword.includes(k) || k.includes(uKeyword))
        );

        if (hasCategoryKeyword) {
          const mentorMatchesCategory = mentorProfiles.some(profile => 
            keywords.some(k => profile.includes(k))
          );

          if (mentorMatchesCategory) {
            semanticMatch = category;
            break;
          }
        }
      }

      if (semanticMatch) {
        score += 18;
        const displayCategory = semanticMatch.charAt(0).toUpperCase() + semanticMatch.slice(1);
        currentCommonThreads.push(`Field Synergy: Aligned in the field of ${displayCategory}`);
      }
    }

    // --- 5. GEOGRAPHIC MATCH (+5) ---
    if (userProfile.location && mentor.location && (mentor.location.toLowerCase().includes(userProfile.location.toLowerCase()) || userProfile.location.toLowerCase().includes(mentor.location.toLowerCase()))) {
      score += 5;
      currentCommonThreads.push(`Local Networking: Both based in ${mentor.location}`);
    }

    // --- 6. POPULARITY/SCARCITY PENALTY ---
    const penalty = (mentor.match_count || 0) * 1.5;
    const finalScore = score - penalty;

    // Track best scoring mentor
    if (finalScore > maxScore && score > 0) {
      maxScore = finalScore;
      bestMatch = mentor;
      commonThreads = currentCommonThreads;
    }
  }

  // --- 7. SMART fallback IF NO DIRECT MATCH SCORING FOUND ---
  if (!bestMatch) {
    const sortedMentors = [...mentors]
      .filter(m => {
        // Skip user themselves
        if (userLowerName && m.name && m.name.trim().toLowerCase() === userLowerName) return false;
        // Skip already matched
        return !excludedIds.includes(m.id);
      })
      .sort((a, b) => (a.match_count || 0) - (b.match_count || 0));

    let availableMentors = sortedMentors;
    if (availableMentors.length === 0) {
      availableMentors = mentors.filter(m => {
        return !(userLowerName && m.name && m.name.trim().toLowerCase() === userLowerName);
      });
    }
    
    bestMatch = availableMentors[0] || mentors[0];

    if (bestMatch.current_position) {
      commonThreads = [`Professional Mentoring: ${bestMatch.name} offers expert insights as a ${bestMatch.current_position}`];
    } else if (bestMatch.college) {
      commonThreads = [`Alumni Guidance: ${bestMatch.name} is a Westlake graduate who attended ${bestMatch.college}`];
    } else {
      commonThreads = [`Alumni Network: General career development and networking connection`];
    }
  }

  return {
    mentor: bestMatch,
    commonThreads: commonThreads,
    outreachMessage: generateOutreachMessage(userProfile, bestMatch, commonThreads)
  };
}

function generateOutreachMessage(userProfile, mentor, commonThreads) {
  const greeting = `Dear ${mentor.name},`;
  const intro = `I'm ${userProfile.name || 'a student'} from the Westlake High School class of ${userProfile.gradYear || userProfile.grad_year || ''}.`;
  
  let connection = '';
  if (commonThreads.length > 0) {
    const thread = commonThreads[0];
    if (thread.startsWith("Target University:")) {
      connection = `I noticed we are both connected to ${mentor.college || 'the same university'}! `;
    } else if (thread.startsWith("University System:")) {
      connection = `I noticed we are both connected to colleges in similar university leagues/tiers! `;
    } else if (thread.startsWith("Career Path Alignment:")) {
      connection = `I'm highly interested in your career path as a ${mentor.current_position || 'professional'} and saw your profile on Chap Connect. `;
    } else if (thread.startsWith("Academic Synergy:")) {
      connection = `I saw your academic background and share a major interest in studying similar subjects! `;
    } else if (thread.startsWith("Field Synergy:")) {
      connection = `I noticed your background is highly aligned with my interests in this field, and saw your profile on Chap Connect. `;
    } else if (thread.startsWith("Professional Mentoring:")) {
      connection = `I saw your profile on Chap Connect and was very inspired by your work as a ${mentor.current_position}. `;
    } else {
      connection = `I came across your profile on Chap Connect and wanted to reach out to connect as part of the WHS alumni network. `;
    }
  } else {
    connection = `I saw your profile on Chap Connect and was really inspired by your journey. `;
  }

  const topicField = mentor.college || mentor.current_position || 'your career journey';
  const ask = `Would you be open to a brief 15-minute virtual coffee chat sometime next week? I'd love to ask a few questions about your experiences at WHS and with ${topicField}.`;

  const signoff = `Best regards,\n${userProfile.name || 'A fellow Chap'}`;

  return `${greeting}\n\n${intro} ${connection}${ask}\n\n${signoff}`;
}
