import { supabase } from './supabaseClient';

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

  let bestMatch = null;
  let maxScore = -1;
  let commonThreads = [];

  // Arrays from Supabase come back as actual arrays if defined as TEXT[], but let's be safe
  const parseArray = (str) => {
    if (Array.isArray(str)) return str;
    if (typeof str === 'string') return str.split(',').map(s => s.trim());
    return [];
  };

  const userTargetColleges = parseArray(userProfile.targetColleges || userProfile.college);
  const userTargetCareers = parseArray(userProfile.targetCareers || userProfile.career);
  const userTargetMajors = parseArray(userProfile.targetMajors);
  const userActivities = parseArray(userProfile.activities);

  for (const mentor of mentors) {
    let score = 0;
    let currentCommonThreads = [];

    // Match on college (highest weight)
    if (mentor.college && userTargetColleges.includes(mentor.college)) {
      score += 10;
      currentCommonThreads.push(`Interested in ${mentor.college}`);
    }

    // Match on career/major
    if (mentor.career && userTargetCareers.includes(mentor.career)) {
      score += 8;
      currentCommonThreads.push(`Interested in ${mentor.career}`);
    } else if (mentor.major && userTargetMajors.includes(mentor.major)) {
      score += 5;
      currentCommonThreads.push(`Interested in ${mentor.major}`);
    }

    // Match on high school activities
    if (userActivities.length > 0 && mentor.high_school_activities) {
      const mentorActivities = parseArray(mentor.high_school_activities);
      const sharedActivities = mentorActivities.filter(a => userActivities.includes(a));
      
      if (sharedActivities.length > 0) {
        score += sharedActivities.length * 3;
        currentCommonThreads.push(`Both participated in ${sharedActivities.join(' and ')}`);
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = mentor;
      commonThreads = currentCommonThreads;
    }
  }

  // Fallback to random if no match score
  if (!bestMatch || maxScore === 0) {
    bestMatch = mentors[Math.floor(Math.random() * mentors.length)];
    commonThreads = ["Both are part of the Westlake High School community"];
  }

  return {
    mentor: bestMatch,
    commonThreads: commonThreads,
    outreachMessage: generateOutreachMessage(userProfile, bestMatch, commonThreads)
  };
}

function generateOutreachMessage(userProfile, mentor, commonThreads) {
  const isInstagram = mentor.contact_platform === 'Instagram';
  const greeting = isInstagram ? `Hey ${mentor.name.split(' ')[0]}!` : `Dear ${mentor.name},`;
  const intro = `I'm ${userProfile.name || 'a student'} from the Westlake High School class of ${userProfile.gradYear}.`;
  
  let connection = '';
  if (commonThreads.length > 0 && commonThreads[0] !== "Both are part of the Westlake High School community") {
    connection = `I saw on Chap Connect that ${commonThreads[0].toLowerCase()}! `;
  } else {
    connection = `I saw your profile on Chap Connect and was really inspired by your journey. `;
  }

  const ask = isInstagram 
    ? `I'd love to ask you a quick question about your experience at ${mentor.college || mentor.company} if you have a minute?` 
    : `I'd love to learn more about your experience at ${mentor.college || mentor.company}. Would you be open to a brief 15-minute virtual coffee chat sometime next week?`;

  const signoff = isInstagram ? `Thanks! - ${userProfile.name || 'A fellow Chap'}` : `Best regards,\n${userProfile.name || 'A fellow Chap'}`;

  return `${greeting}\n\n${intro} ${connection}${ask}\n\n${signoff}`;
}
