import { selectAll } from './supabaseClient.js';
import { canonicalSchool, COLLEGE_TIERS, KEYWORDS_BY_BLOCK } from './affinityTaxonomy.js';

// Field taxonomy keywords for domain matching
const FIELD_MAP = {
  software: ['software', 'developer', 'engineer', 'tech', 'coding', 'data', 'ai', 'machine learning', 'frontend', 'backend', 'fullstack'],
  finance: ['finance', 'investment', 'banking', 'private equity', 'venture capital', 'analyst', 'wealth', 'accounting', 'hedge fund'],
  consulting: ['consulting', 'consultant', 'mckinsey', 'bain', 'bcg', 'strategy', 'advisory'],
  healthcare: ['doctor', 'physician', 'medicine', 'medical', 'nurse', 'healthcare', 'clinical', 'hospital', 'residency', 'pharma', 'biotech'],
  law: ['law', 'attorney', 'lawyer', 'legal', 'counsel', 'litigation', 'jd'],
  education: ['teacher', 'professor', 'education', 'academic', 'principal', 'teaching', 'instructor'],
  marketing: ['marketing', 'brand', 'advertising', 'growth', 'pr', 'public relations', 'social media', 'creative'],
  engineering: ['mechanical', 'electrical', 'civil', 'aerospace', 'chemical', 'hardware', 'robotics'],
  real_estate: ['real estate', 'property', 'development', 'commercial real estate', 'broker', 'realtor'],
};

function normalize(val) {
  if (Array.isArray(val)) return val.filter(Boolean).join(' ').toLowerCase();
  if (typeof val === 'string') return val.toLowerCase().trim();
  return '';
}

function detectField(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [field, keywords] of Object.entries(FIELD_MAP)) {
    if (keywords.some(k => lower.includes(k))) return field;
  }
  return null;
}

function extractAlumProfile(raw) {
  let meta = {};
  if (raw.post_grad_program && typeof raw.post_grad_program === 'string') {
    try { meta = JSON.parse(raw.post_grad_program); } catch { /* ignore */ }
  }

  const schools = [
    raw.college,
    raw.undergraduate_education,
    raw.education,
    raw.first_grad_education,
    raw.second_grad_education,
    meta.undergradCollege,
    meta.firstGrad,
    meta.secondGrad,
  ].filter(Boolean).map(s => String(s).trim());

  const majors = [
    raw.major,
    meta.undergradMajor,
  ].filter(Boolean).map(s => String(s).trim());

  let company = (raw.company || meta.company || '').trim();
  if (!company && (raw.current_position || raw.career)) {
    const atMatch = (raw.current_position || raw.career || '').match(/(?:at|@)\s+([^,]+)/i);
    if (atMatch) company = atMatch[1].trim();
  }

  const careers = [
    raw.career,
    raw.current_position,
    raw.role,
    raw.industry,
    company,
  ].filter(Boolean).map(s => String(s).trim());

  const locations = [
    raw.location,
    meta.location,
  ].filter(Boolean).map(s => String(s).trim());

  const gradYear = parseInt(raw.grad_year || raw.gradYear, 10) || null;

  return {
    id: raw.id || raw.user_id,
    sourceId: raw.id,
    name: raw.name || 'Alum',
    email: raw.email || meta.contactInfo || '',
    contactPlatform: meta.contactPlatform || 'Email',
    contactInfo: meta.contactInfo || raw.email || '',
    schools,
    primarySchool: schools[0] || 'University',
    majors,
    primaryMajor: majors[0] || '',
    careers,
    primaryCareer: raw.career || raw.current_position || careers[0] || 'Professional',
    company,
    location: locations[0] || '',
    gradYear,
    activities: raw.high_school_activities || raw.activities || [],
    avatar: meta.avatar || '',   // "color:look" mascot Chap, when they picked one
  };
}

/**
 * Score one alumnus against another alumnus.
 */
export function scoreAlumniPair(seeker, candidate) {
  let score = 0;
  const threads = [];
  const breakdown = {
    college: 0,
    field: 0,
    major: 0,
    location: 0,
    cohort: 0,
  };

  // 1. College / Alma Mater Matching (max 35)
  const seekerCanonSchools = seeker.schools.map(canonicalSchool).filter(Boolean);
  const candCanonSchools = candidate.schools.map(canonicalSchool).filter(Boolean);
  const sharedCanon = seekerCanonSchools.filter(s => candCanonSchools.includes(s));

  if (sharedCanon.length > 0 || (seeker.primarySchool && candidate.primarySchool && seeker.primarySchool.toLowerCase() === candidate.primarySchool.toLowerCase())) {
    score += 35;
    breakdown.college = 35;
    threads.push(`Shared Alma Mater: Both attended ${candidate.primarySchool || seeker.primarySchool} (35% weight)`);
  } else {
    // Check college tier similarity
    const seekerTiers = new Set();
    const candTiers = new Set();
    for (const s of seeker.schools) {
      for (const tier of COLLEGE_TIERS) {
        if ((KEYWORDS_BY_BLOCK.collegeTier[tier.id] || []).some(k => s.toLowerCase().includes(k.trim()))) {
          seekerTiers.add(tier.id);
        }
      }
    }
    for (const s of candidate.schools) {
      for (const tier of COLLEGE_TIERS) {
        if ((KEYWORDS_BY_BLOCK.collegeTier[tier.id] || []).some(k => s.toLowerCase().includes(k.trim()))) {
          candTiers.add(tier.id);
        }
      }
    }
    const sharedTiers = [...seekerTiers].filter(t => candTiers.has(t));
    if (sharedTiers.length > 0) {
      score += 18;
      breakdown.college = 18;
      const tierObj = COLLEGE_TIERS.find(t => t.id === sharedTiers[0]);
      threads.push(`College System: Both attended ${tierObj ? tierObj.label : 'similar collegiate network'} (18% weight)`);
    }
  }

  // 2. Current Field / Career Synergy (max 30)
  const seekerFieldText = seeker.careers.join(' ');
  const candFieldText = candidate.careers.join(' ');
  const seekerField = detectField(seekerFieldText);
  const candField = detectField(candFieldText);

  if (seekerField && candField && seekerField === candField) {
    score += 30;
    breakdown.field = 30;
    const formattedField = seekerField.charAt(0).toUpperCase() + seekerField.slice(1);
    threads.push(`Industry Synergy: Both work in ${formattedField} (${candidate.primaryCareer})`);
  } else if (seekerFieldText && candFieldText) {
    const sTokens = seekerFieldText.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    const hasOverlap = sTokens.some(t => candFieldText.toLowerCase().includes(t));
    if (hasOverlap) {
      score += 20;
      breakdown.field = 20;
      threads.push(`Professional Alignment: Related career paths in ${candidate.primaryCareer}`);
    }
  }

  // 3. Academic Major Synergy (max 20)
  const seekerMajor = normalize(seeker.majors);
  const candMajor = normalize(candidate.majors);
  if (seekerMajor && candMajor) {
    if (seekerMajor === candMajor || candMajor.includes(seekerMajor) || seekerMajor.includes(candMajor)) {
      score += 20;
      breakdown.major = 20;
      threads.push(`Academic Alignment: Shared background in ${candidate.primaryMajor || seeker.primaryMajor}`);
    } else {
      const sMajTokens = seekerMajor.split(/\s+/).filter(t => t.length > 3);
      if (sMajTokens.some(t => candMajor.includes(t))) {
        score += 12;
        breakdown.major = 12;
        threads.push(`Academic Intersection: Related studies in ${candidate.primaryMajor}`);
      }
    }
  }

  // 4. Geographic / Location Synergy (max 10)
  const seekerLoc = normalize(seeker.location);
  const candLoc = normalize(candidate.location);
  if (seekerLoc && candLoc) {
    const sCity = seekerLoc.split(',')[0].trim();
    if (candLoc.includes(sCity) || seekerLoc.includes(candLoc.split(',')[0].trim())) {
      score += 10;
      breakdown.location = 10;
      threads.push(`Metro Connection: Both currently based in ${candidate.location}`);
    }
  }

  // 5. Grad Year / Era Proximity (max 5)
  if (seeker.gradYear && candidate.gradYear) {
    const diff = Math.abs(seeker.gradYear - candidate.gradYear);
    if (diff === 0) {
      score += 5;
      breakdown.cohort = 5;
      threads.push(`Classmates: Both graduated from Westlake in ${seeker.gradYear}!`);
    } else if (diff <= 3) {
      score += 4;
      breakdown.cohort = 4;
      threads.push(`Shared Era: Westlake contemporaries (${seeker.gradYear} & ${candidate.gradYear})`);
    } else if (diff <= 6) {
      score += 2;
      breakdown.cohort = 2;
      threads.push(`Nearby Cohorts: Graduated within ${diff} years of each other`);
    }
  }

  // If minimal overlap was detected, provide a graceful baseline thread
  if (threads.length === 0) {
    threads.push(`Westlake Alumni Network: Fellow Chap with experience at ${candidate.primarySchool || candidate.primaryCareer}`);
    score = 15;
  }

  return {
    score: Math.min(100, Math.round(score)),
    breakdown,
    threads,
  };
}

/**
 * Generate a personalized outreach draft message for alumni-to-alumni connection.
 */
export function generateAlumniOutreachDraft(seekerProfile, candidateProfile, threads = []) {
  const seeker = extractAlumProfile(seekerProfile);
  const cand = candidateProfile.schools ? candidateProfile : extractAlumProfile(candidateProfile);

  const seekerFirstName = seeker.name ? seeker.name.split(' ')[0] : 'a fellow Chap';
  const candFirstName = cand.name ? cand.name.split(' ')[0] : 'there';
  const candClass = cand.gradYear ? ` (WHS '${String(cand.gradYear).slice(-2)})` : '';
  const seekerClass = seeker.gradYear ? ` (WHS '${String(seeker.gradYear).slice(-2)})` : '';

  // Subject line options
  let subject = `Westlake Alumni Connection — ${seeker.name || 'Fellow Chap'}`;
  if (cand.primarySchool && seeker.primarySchool && cand.primarySchool.toLowerCase() === seeker.primarySchool.toLowerCase()) {
    subject = `Fellow Chap & ${cand.primarySchool} Alum — Connecting from ${seeker.name || 'Westlake'}`;
  } else if (cand.primaryCareer && seeker.primaryCareer) {
    subject = `Westlake Alum in ${cand.primaryCareer} — Connecting with ${seeker.name || 'a fellow Chap'}`;
  }

  // Body construction
  const lines = [
    `Hi ${candFirstName},`,
    '',
    `I hope you're having a great week! I'm ${seeker.name || 'a fellow Westlake alum'}${seekerClass}, currently based in ${seeker.location || 'the area'}${seeker.primaryCareer ? ` working in ${seeker.primaryCareer}` : ''}.`,
    '',
  ];

  // Tailored connection point
  if (threads && threads.length > 0) {
    const primaryReason = threads[0];
    lines.push(`I came across your profile through ChapConnect and noticed our shared connection: ${primaryReason.replace(/\s*\(\d+%.*?\)/g, '')}.`);
  } else if (cand.primarySchool) {
    lines.push(`I came across your profile through ChapConnect and noticed you also attended ${cand.primarySchool}${candClass}.`);
  } else {
    lines.push(`I came across your profile through the Westlake alumni directory on ChapConnect and wanted to reach out.`);
  }

  lines.push('');
  lines.push(`I'd love to connect, hear how your path from Westlake has unfolded, and share experiences. Would you be open to a quick 15-minute virtual coffee or phone chat sometime in the next couple of weeks?`);
  lines.push('');
  lines.push(`Best regards,`);
  lines.push(seeker.name || seekerFirstName);

  return {
    subject,
    body: lines.join('\n'),
  };
}

/**
 * Fetch alumni candidates from mentors and user_profiles, then score and rank.
 */
export async function findAlumniMatches(userProfile, options = {}) {
  const { limit = 6, excludedIds = [] } = options;
  const seeker = extractAlumProfile(userProfile);
  const selfName = (seeker.name || '').trim().toLowerCase();
  const selfId = String(seeker.id || '');

  // 1. Fetch from user_profiles (other registered alumni) and mentors
  const [alumniRes, mentorsRes] = await Promise.all([
    selectAll(
      'user_profiles',
      'id, user_id, name, grad_year, email, college, major, career, company, location, post_grad_program',
      q => q.eq('post_grad_school', 'ALUMNI_METADATA'),
    ),
    selectAll(
      'mentors',
      'id, name, grad_year, college, education, first_grad_education, second_grad_education, current_position, location, role',
    ),
  ]);

  const candidates = [];
  const seenIds = new Set(excludedIds.map(String));
  if (selfId) seenIds.add(selfId);

  // Parse registered alumni
  for (const row of alumniRes.data || []) {
    const candId = String(row.id || row.user_id || '');
    const candName = (row.name || '').trim().toLowerCase();
    if (candId && seenIds.has(candId)) continue;
    if (selfName && candName === selfName) continue;
    seenIds.add(candId);

    const extracted = extractAlumProfile(row);
    candidates.push({
      ...extracted,
      raw: row,
      isRegisteredUser: true,
    });
  }

  // Parse mentors table (1,150+ real Westlake alumni in main database)
  for (const row of mentorsRes.data || []) {
    const candId = `m-${row.id}`;
    const candName = (row.name || '').trim().toLowerCase();
    if (seenIds.has(candId)) continue;
    if (selfName && candName === selfName) continue;
    seenIds.add(candId);

    const extracted = extractAlumProfile({
      id: candId,
      name: row.name,
      grad_year: row.grad_year,
      college: row.college,
      education: row.education,
      first_grad_education: row.first_grad_education,
      second_grad_education: row.second_grad_education,
      career: row.current_position || row.role,
      current_position: row.current_position,
      location: row.location,
    });
    candidates.push({
      ...extracted,
      raw: row,
      isRegisteredUser: false,
    });
  }

  // Score candidates
  const scored = candidates.map(cand => {
    const result = scoreAlumniPair(seeker, cand);
    return {
      candidate: cand,
      score: result.score,
      threads: result.threads,
      breakdown: result.breakdown,
    };
  });

  // Sort by highest score first, tie-breaking by exact college match then cohort proximity
  scored.sort((a, b) => b.score - a.score || (b.candidate.gradYear || 0) - (a.candidate.gradYear || 0));

  return scored.slice(0, limit);
}
