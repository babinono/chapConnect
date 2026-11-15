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
    avatar: meta.avatar || '',
    openTo: Array.isArray(meta.openTo) ? meta.openTo : [],   // "color:look" mascot Chap, when they picked one
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
    threads.push(`You both went to ${candidate.primarySchool || seeker.primarySchool}`);
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
      threads.push(tierObj ? `Similar colleges (${tierObj.label})` : 'Similar colleges');
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
    threads.push(`You both work in ${seekerField.replace('_', ' ')}`);
  } else if (seekerFieldText && candFieldText) {
    const sTokens = seekerFieldText.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    const hasOverlap = sTokens.some(t => candFieldText.toLowerCase().includes(t));
    if (hasOverlap) {
      score += 20;
      breakdown.field = 20;
      threads.push('Similar line of work');
    }
  }

  // 3. Academic Major Synergy (max 20)
  const seekerMajor = normalize(seeker.majors);
  const candMajor = normalize(candidate.majors);
  if (seekerMajor && candMajor) {
    if (seekerMajor === candMajor || candMajor.includes(seekerMajor) || seekerMajor.includes(candMajor)) {
      score += 20;
      breakdown.major = 20;
      threads.push(`You both studied ${candidate.primaryMajor || seeker.primaryMajor}`);
    } else {
      const sMajTokens = seekerMajor.split(/\s+/).filter(t => t.length > 3);
      if (sMajTokens.some(t => candMajor.includes(t))) {
        score += 12;
        breakdown.major = 12;
        threads.push('Related majors');
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
      threads.push(`You're both in ${candidate.location}`);
    }
  }

  // 5. Grad Year / Era Proximity (max 5)
  if (seeker.gradYear && candidate.gradYear) {
    const diff = Math.abs(seeker.gradYear - candidate.gradYear);
    if (diff === 0) {
      score += 5;
      breakdown.cohort = 5;
      threads.push(`Same class, ${seeker.gradYear}`);
    } else if (diff <= 3) {
      score += 4;
      breakdown.cohort = 4;
      threads.push('At Westlake around the same time');
    } else if (diff <= 6) {
      score += 2;
      breakdown.cohort = 2;
      threads.push(`${diff} classes apart`);
    }
  }

  // If minimal overlap was detected, provide a graceful baseline thread
  if (threads.length === 0) {
    threads.push('Fellow Chap');
    score = 15;
  }

  return {
    score: Math.min(100, Math.round(score)),
    breakdown,
    threads,
  };
}

/**
 * A first message from one alum to another. Opens with the one thing the two
 * have in common, then asks for something small and specific.
 */
export function generateAlumniOutreachDraft(seekerProfile, candidateProfile) {
  const seeker = extractAlumProfile(seekerProfile);
  const cand = candidateProfile.schools ? candidateProfile : extractAlumProfile(candidateProfile);
  const { breakdown } = scoreAlumniPair(seeker, cand);

  const candFirstName = cand.name ? cand.name.split(' ')[0] : 'there';
  const seekerClass = seeker.gradYear ? ` (WHS '${String(seeker.gradYear).slice(-2)})` : '';
  const sameSchool = breakdown.college === 35;

  const subject = sameSchool
    ? `Fellow Chap and ${cand.primarySchool} alum`
    : `Hello from a fellow Chap${seekerClass}`;

  const about = [
    seeker.location && `in ${seeker.location}`,
    seeker.primaryCareer && seeker.primaryCareer !== 'Professional' && `working in ${seeker.primaryCareer}`,
  ].filter(Boolean).join(', ');

  let common = 'I found you in the alumni directory on ChapConnect.';
  if (sameSchool) common = `I saw on ChapConnect that you went to ${cand.primarySchool} too.`;
  else if (breakdown.field >= 20) common = `I saw on ChapConnect that you work in ${cand.primaryCareer}, which is close to what I do.`;
  else if (breakdown.cohort === 5) common = 'I saw on ChapConnect that we were in the same class.';
  else if (breakdown.location === 10) common = `I saw on ChapConnect that you're in ${cand.location} too.`;

  const body = [
    `Hi ${candFirstName},`,
    '',
    `I'm ${seeker.name || 'a fellow Westlake grad'}${seekerClass}${about ? `, ${about}` : ''}. ${common}`,
    '',
    `I'd like to hear how you got from Westlake to where you are now. Do you have 15 minutes for a call sometime in the next couple of weeks?`,
    '',
    'Thanks,',
    seeker.name || 'A fellow Chap',
  ].join('\n');

  return { subject, body };
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
