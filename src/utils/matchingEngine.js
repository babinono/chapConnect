import { supabase } from './supabaseClient';

import { rankByAffinity, explainMatch } from './affinityEngine';
import { BLOCKS, VECTOR_SIZE } from './affinityTaxonomy';

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
    career: c.career || c.role || c.current_position,
    company: c.company,
    highSchoolActivities: c.highSchoolActivities || c.high_school_activities || c.activities,
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
    activities: userProfile.activities || userProfile.high_school_activities,
    favoriteClasses: userProfile.classes || userProfile.favorite_classes,
    location: userProfile.location
  };

  const systemPrompt = `You are the matching brain of an alumni mentoring platform for Westlake High School (WHS) students.
Your job is to find the absolute best mentor from a list of candidates for a given student profile.

CRITICAL BRANDING RULES:
- NEVER include the words "Chap Connect" or "Chap" in the output (including commonThreads). Instead, use generic descriptions like "alumni network", "mentorship community", or "alumni connection".

CRITICAL INSTRUCTIONS FOR AI HOLISTIC MATCHING & INTERSECTIONAL DOMAIN REASONING:
1. HOLISTIC FACTOR EVALUATION: Evaluate candidate mentors highly holistically across ALL available student data points including target majors, high school clubs/sports, favorite classes, target careers, and geographical location. Do NOT ignore any factor.
2. ACADEMIC & DISCIPLINARY SYNERGY: Prioritize matching the student with a mentor who studied the student's target majors or related fields (highest priority!).
3. CLASS & CLUB INTERSECTION (THE FLAVOR TEST): Go beyond surface-level major matching. Analyze the intersection of WHS classes, clubs, and target majors to discover the student's unique domain "flavor" or sub-discipline leaning.
   - SPECIFIC INTERSECT EXAMPLE (CRITICAL): If a student has biological sciences (e.g. Biology, Biomedical Engineering) as their target majors BUT also has a technical/quantitative club (e.g. Computer Science Club, Robotics, Math Club) and a technical/quantitative favorite class (e.g. Calculus BC, AP Computer Science, Physics C) as their favorite class, you MUST lean heavily into matching them with a technical/computational profile (e.g. computational biology, bioinformatics, software-driven medical devices, technical engineering) rather than a traditional pre-med, clinical medicine, or doctor profile.
   - Apply this high-fidelity intersectional reasoning across all combinations (e.g., Business majors with speech/debate background lean towards consulting/strategy over finance/quantitative analysis).
4. UNIVERSITY ALIGNMENT: Give secondary weight to matching the student with a mentor who attended one of the student's target colleges.

Evaluate candidates based on:
1. Holistic Academic & Major Synergy (highest weight, matching domain sub-specialties)
2. Class & Club Interdisciplinary Synergy (intersections of WHS classes, clubs, and target majors matched to mentor's actual field and background)
3. Target University System Match (secondary weight)
4. Career & Location Alignment

Output your decision strictly as a JSON object with this exact structure:
{
  "mentorId": "the ID of the selected mentor",
  "holisticAssessment": "A super concise, 1-2 sentence personalized explanation (under 30 words) summarizing precisely why this mentor is a perfect match for the student's unique combination of classes, clubs, and major trajectory.",
  "personalizedSnippet": "A personalized 1-2 sentence statement (under 30 words) connecting the student's specific academic goals, favorite classes, or high school activities directly to the mentor's specific college, company, or current career role. (e.g. 'Since I plan to study Biomedical Engineering and saw your fascinating work in medical devices at Google, I\\'m super interested in hearing how you navigated that transition.')",
  "commonThreads": [
    "A bullet point explaining the primary match alignment (e.g., 'Target University: Aligned with your target school, Stanford University')",
    "A bullet point specifically highlighting the class/club intersection reasoning (e.g., 'Interdisciplinary Tech: Connected your CS Club and Calculus BC interests to your mentor\\'s software-driven bioengineering research')"
  ]
}

Return ONLY this JSON object and nothing else. Do NOT wrap in \`\`\`json block.`;

  const userPrompt = `Student Profile:
${JSON.stringify(studentProfile, null, 2)}

Candidate Mentors:
${JSON.stringify(formattedCandidates, null, 2)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const controller = new AbortController();
  const timeoutLimit = userProfile.forceNoTimeout ? 300000 : 150000; // 5 mins if no timeout vs 150s
  const timeoutId = setTimeout(() => {
    console.warn(`matchingEngine: Gemini API request exceeded ${timeoutLimit/1000}s, aborting connection...`);
    controller.abort();
  }, timeoutLimit);

  let response;
  try {
    console.log("matchingEngine: Sending fetch request to Gemini AI...");
    console.time("⏰ gemini_api_fetch_call");
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
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
    console.timeEnd("⏰ gemini_api_fetch_call");
    clearTimeout(timeoutId);
  } catch (err) {
    console.timeEnd("⏰ gemini_api_fetch_call");
    clearTimeout(timeoutId);
    throw new Error(`Gemini API connection failed or timed out: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    // Remove markdown code block fences if present (e.g. ```json ... ```)
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  }

  const parsed = JSON.parse(cleanText);
  const selectedMentor = candidates.find(c => String(c.id) === String(parsed.mentorId));
  
  if (!selectedMentor) {
    throw new Error(`Gemini selected mentorId ${parsed.mentorId} which was not in candidate list.`);
  }

  return {
    mentor: selectedMentor,
    holisticAssessment: parsed.holisticAssessment || '',
    commonThreads: parsed.commonThreads || [],
    outreachMessage: generateOutreachMessage(userProfile, selectedMentor, parsed.commonThreads, parsed.personalizedSnippet),
    isAIPowered: true
  };
}

export async function findBestMatch(userProfile) {
  console.log("matchingEngine: Fetching candidates from Supabase...");
  console.time("⏰ supabase_fetch_all_mentors");
  // Fetch all mentors from Supabase
  const { data: mentors, error } = await supabase
    .from('mentors')
    .select('*');
  console.timeEnd("⏰ supabase_fetch_all_mentors");

  if (error) {
    console.error("Error fetching mentors:", error);
    return null;
  }

  if (!mentors || mentors.length === 0) {
    return null;
  }

  // If local algorithm matchmaking is explicitly requested, bypass Gemini AI matching entirely!
  if (userProfile.matchType === 'algo') {
    console.log("matchingEngine: Local algorithm match type requested. Bypassing Gemini AI.");
  } else {
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
        console.error("matchingEngine: Gemini AI matching failed/errored.", aiErr);
        if (userProfile.matchType === 'ai') {
          // If the user explicitly requested AI match, throw the error so the UI shows the failure instead of silently falling back!
          throw new Error(`Gemini AI Matching failed: ${aiErr.message}`);
        }
      }
    } else {
      console.warn("matchingEngine: VITE_GEMINI_API_KEY not found.");
      if (userProfile.matchType === 'ai') {
        throw new Error("Gemini AI matching is not configured. VITE_GEMINI_API_KEY is missing.");
      }
    }
  }




  // ------------------------------------------------------------------
  // LOCAL PATH — 24D one-hot vectorisation + weighted cosine proximity.
  // This is the production matcher: no API key, no quota, no network hop,
  // and a score that can be recomputed and audited offline.
  // ------------------------------------------------------------------
  console.time("⏰ cosine_affinity_pass");
  const { ranked, seniorVector, seniorSlots, scored } = rankByAffinity(userProfile, mentors, {
    excludedIds: userProfile.excludedIds || [],
    limit: 3,
  });
  console.timeEnd("⏰ cosine_affinity_pass");
  console.log(`matchingEngine: scored ${scored} alumni across ${VECTOR_SIZE} dimensions.`);

  if (!ranked.length) {
    console.warn("matchingEngine: every candidate was filtered out (self-match or already matched).");
    return null;
  }

  const best = ranked[0];
  const commonThreads = explainMatch(best, best.mentor);

  console.log(
    "matchingEngine: top 3 by weighted cosine —",
    ranked.map((r) => `${r.mentor.name} ${r.score}`).join(", ")
  );

  return {
    mentor: best.mentor,
    commonThreads,
    outreachMessage: generateOutreachMessage(userProfile, best.mentor, commonThreads),
    // Full geometric report. The UI renders the headline match today; the
    // runners-up and per-block breakdown are here for the dashboard and for
    // anyone auditing why a given pairing was made.
    affinity: {
      similarity: best.similarity,
      score: best.score,
      cosine: best.cosine,
      // Do not present `score` as a match strength when provisional — too
      // little of the model was populated for the number to mean anything.
      confidence: best.confidence,
      provisional: best.provisional,
      coverage: best.coverage,
      blocks: best.blocks,
      loadPenalty: best.loadPenalty,
      seniorVector,
      seniorSlots,
      alumVector: best.alumVector,
      alumSlots: best.alumSlots,
      weights: BLOCKS.map((b) => ({ key: b.key, label: b.label, weight: b.weight })),
    },
    topMatches: ranked.map((r) => ({
      mentor: r.mentor,
      score: r.score,
      similarity: r.similarity,
      confidence: r.confidence,
      provisional: r.provisional,
      blocks: r.blocks,
      commonThreads: explainMatch(r, r.mentor),
    })),
  };
}

function generateOutreachMessage(userProfile, mentor, commonThreads, personalizedSnippet) {
  const mentorFirstName = mentor.name ? mentor.name.split(' ')[0] : 'Alumni';
  const studentFirstName = userProfile.name ? userProfile.name.split(' ')[0] : 'a student';
  const studentFullName = userProfile.name || 'A fellow Chap';
  const gradYearVal = userProfile.gradYear || userProfile.grad_year || '';

  const parseArray = (str) => {
    if (Array.isArray(str)) return str.filter(s => typeof s === 'string' && s.trim() !== '');
    if (typeof str === 'string') return str.split(',').map(s => s.trim()).filter(s => s.trim() !== '');
    return [];
  };

  const activities = parseArray(userProfile.activities || userProfile.high_school_activities);
  const act1 = activities[0] || 'clubs';
  const act2 = activities[1] || 'extracurriculars';

  const sharedCollege = mentor.college || 'your university';
  const major = parseArray(userProfile.targetMajors || userProfile.major)[0] || 'my intended major';

  const flowType = userProfile.flow_type || userProfile.flow || 'student';
  const isStudent = flowType === 'student';
  const isAlumni = !isStudent;
  const currentCollege = userProfile.college || 'my college';

  let introText = `My name is ${studentFirstName}, and I’m a student at Westlake (Class of ${gradYearVal}) involved in ${act1} and ${act2}.`;
  
  if (isAlumni) {
    const isWorkingProfessional = flowType === 'post_schooling' || flowType === 'established' || userProfile.company;
    if (isWorkingProfessional) {
      const positionStr = userProfile.career || 'my field';
      introText = `My name is ${studentFirstName}, and I’m a Westlake graduate (Class of ${gradYearVal}) currently working as a ${positionStr}.`;
    } else {
      introText = `My name is ${studentFirstName}, and I’m a Westlake graduate (Class of ${gradYearVal}) currently studying ${major} at ${currentCollege}.`;
    }
  }

  let defaultSnippet = `Since ${sharedCollege} is at the top of my list and I’m very interested in ${major}, I wanted to reach out.`;
  let askText = `Would you be open to a quick, 15-minute virtual coffee chat sometime soon? I’m trying to learn as much as I can about the path ahead and would love to hear about your experiences and your transition from WHS.`;
  
  if (isAlumni) {
    const mentorField = mentor.career || mentor.role || mentor.industry || 'your field';
    if (userProfile.college && mentor.college && userProfile.college.toLowerCase().trim() === mentor.college.toLowerCase().trim()) {
      defaultSnippet = `I noticed that we both share the ${sharedCollege} connection, and given your background in ${mentorField}, I wanted to reach out.`;
    } else {
      defaultSnippet = `I noticed your background in ${mentorField} and wanted to connect with a fellow Chap in the field.`;
    }
    
    askText = `Would you be open to a quick, 15-minute virtual chat sometime soon? I’d love to hear about your career journey and connect.`;
  }

  const snippetToUse = personalizedSnippet || defaultSnippet;

  return `Hi ${mentorFirstName},\n\nI hope your week is going well! ${introText}\n\n${snippetToUse}\n\n${askText}\n\nBest,\n\n${studentFullName}`;
}
