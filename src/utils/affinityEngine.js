// ---------------------------------------------------------------------------
// STAGES 2 & 3 — ONE-HOT VECTORIZATION + WEIGHTED COSINE PROXIMITY
//
// A profile becomes a 24-dimensional binary array over the closed taxonomy in
// affinityTaxonomy.js. Every attribute owns a dedicated coordinate, so no
// ordering is ever implied between categories (the reason this is one-hot and
// not an ordinal code: "Finance = 6, Biology = 7" would tell the geometry that
// finance and biology are neighbours, which is false).
//
// Similarity is an ASYMMETRIC weighted cosine between the senior vector and the
// alumni vector:
//
//     sim_a = (S · A)_w / ( ‖S‖_w^a · ‖A‖_w^(1-a) )
//
// ALPHA = 1 anchors the normalisation entirely on the senior: the score reads
// as "what fraction of what this student is looking for does this alum
// satisfy?". ALPHA = 0.5 recovers textbook symmetric cosine, which is reported
// alongside as `cosine` for audit.
//
// Why asymmetric. Under symmetric cosine an alum's own declarations sit in the
// denominator, so declaring a TRUE fact that happens not to match dilutes the
// score. Measured on real taxonomy values: an alum with identical CS + UT +
// software credentials dropped from 96.4 to 85.5 purely for also listing
// Orchestra. That is standard behaviour in document retrieval and wrong for
// mentor matching — it penalises alumni for being forthcoming, and it is the
// opposite of what the magnitude term was introduced to do. At ALPHA = 1 an
// alum's extra attributes can neither help nor hurt.
//
// The accepted cost: an alum who declared every attribute would satisfy every
// senior. Alumni fill a fixed onboarding form with no mechanism or incentive to
// inflate, so this is priced as low risk. If self-reported breadth ever becomes
// gameable, move ALPHA back toward 0.5 — that is the whole dial.
//
// Weighting is applied as w per coordinate inside the inner product (equivalent
// to scaling each axis by sqrt(w)), which keeps each block's coefficient as its
// literal ceiling on the score: a pair agreeing only on major scores exactly
// 0.40.
// ---------------------------------------------------------------------------

import {
  BLOCKS,
  VECTOR_SIZE,
  SLOT_INDEX,
  LABEL_BY_SLOT,
  KEYWORDS_BY_BLOCK,
  COLLEGE_TIERS,
  canonicalSchool,
} from './affinityTaxonomy';

// --- text normalisation ---------------------------------------------------

const normalise = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ').toLowerCase();
  if (typeof value === 'string') return value.toLowerCase();
  return '';
};

const toList = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Compiled once per keyword. Trailing space in the dictionary means exact token;
// otherwise it is a prefix match anchored to a word boundary. See the convention
// note at the top of affinityTaxonomy.js.
const patternCache = new Map();
const patternFor = (keyword) => {
  let re = patternCache.get(keyword);
  if (!re) {
    const exact = keyword.endsWith(' ');
    const body = escapeRegex(keyword.trim());
    re = new RegExp(`(?:^|[^a-z0-9])${body}${exact ? '(?:[^a-z0-9]|$)' : ''}`);
    patternCache.set(keyword, re);
  }
  return re;
};

const hits = (haystack, keyword) => patternFor(keyword).test(haystack);

// --- STAGE 2: one-hot encoding -------------------------------------------

// Every slot whose keyword set fires lights up. Multi-hot within a block is
// intentional: a student targeting both CS and Biomedical Engineering genuinely
// occupies two major coordinates, and the cosine magnitude term prices that in.
function encodeBlock(blockKey, text) {
  const dictionary = KEYWORDS_BY_BLOCK[blockKey];
  const active = [];
  for (const [slotId, keywords] of Object.entries(dictionary)) {
    if (keywords.some((k) => hits(text, k))) active.push(slotId);
  }
  return active;
}

// College tier is resolved school by school rather than over the whole blob,
// and the first tier that claims a school wins. Order in COLLEGE_TIERS is the
// tie-break policy: Rice reads as a Texas powerhouse to a Westlake senior, not
// as a coastal private, so tx_powerhouse is checked first.
function encodeCollegeTier(schools) {
  const active = new Set();
  for (const school of schools) {
    const text = school.toLowerCase();
    for (const tier of COLLEGE_TIERS) {
      const keywords = KEYWORDS_BY_BLOCK.collegeTier[tier.id] || [];
      if (keywords.some((k) => hits(text, k))) {
        active.add(tier.id);
        break;
      }
    }
  }
  return [...active];
}

/**
 * Pull the four taxonomy source texts out of a profile, whichever shape it
 * arrives in. Students describe where they are going; alumni describe where
 * they have been, so the same block reads from different columns per side.
 */
export function extractFeatureText(profile, side) {
  const isAlum = side === 'alum';

  const schools = isAlum
    ? toList([
        profile.college,
        profile.undergraduate_education,
        profile.education,
        profile.first_grad_education,
        profile.second_grad_education,
      ].filter(Boolean).join(', '))
    : toList(profile.targetColleges || profile.target_colleges || profile.college);

  const majorText = isAlum
    ? normalise([profile.major, profile.education, profile.first_grad_education, profile.second_grad_education].filter(Boolean))
    : normalise(profile.targetMajors || profile.target_majors || profile.major);

  const careerText = isAlum
    ? normalise([profile.career, profile.current_position, profile.role, profile.industry, profile.company, profile.skills].filter(Boolean))
    : normalise(profile.targetCareers || profile.target_careers || profile.career);

  const activityText = normalise(
    profile.activities || profile.highSchoolActivities || profile.high_school_activities
  );

  const classText = normalise(profile.classes || profile.favorite_classes || profile.favoriteClasses);

  return { schools, majorText, careerText, activityText, classText };
}

/**
 * STAGE 2 — build the 24D one-hot array.
 *
 * Archetype is the behavioural read, so it draws on clubs/sports *and* the
 * declared field: a senior whose activities are Robotics and Math Club lands in
 * Quant/Tech whether or not they have named a major yet. Major/Field draws on
 * the academic and professional text only.
 */
export function encodeProfile(profile, side = 'student') {
  const { schools, majorText, careerText, activityText, classText } = extractFeatureText(profile, side);

  const active = {
    archetype: encodeBlock('archetype', [activityText, majorText, careerText].filter(Boolean).join(' , ')),
    classZone: encodeBlock('classZone', classText),
    collegeTier: encodeCollegeTier(schools),
    major: encodeBlock('major', [majorText, careerText].filter(Boolean).join(' , ')),
  };

  const vector = new Array(VECTOR_SIZE).fill(0);
  for (const slotIds of Object.values(active)) {
    for (const id of slotIds) vector[SLOT_INDEX[id]] = 1;
  }

  // Which SOURCE fields this profile actually populated. Coverage has to be
  // measured here rather than off the fired blocks, because archetype is
  // DERIVED from the field text: a senior who types only "Finance" lights up
  // both the major and archetype blocks, which would read as 75% of the model
  // evidenced when really it is one word. Only clubs/activities are independent
  // evidence for archetype, so only they count toward its weight.
  const declared = {
    field: Boolean(majorText || careerText),   // -> major block
    activities: Boolean(activityText),         // -> archetype block
    classes: Boolean(classText),               // -> class zone block
    colleges: schools.length > 0,              // -> college tier block
  };
  const sourceWeight =
    (declared.field ? 0.40 : 0) +
    (declared.activities ? 0.35 : 0) +
    (declared.classes ? 0.10 : 0) +
    (declared.colleges ? 0.15 : 0);

  // Retained for exact-college matching, which is finer-grained than the
  // four-bucket tier block can express.
  const schoolKeys = [...new Set(schools.map(canonicalSchool).filter(Boolean))];

  return { vector, active, side, declared, sourceWeight, schools, schoolKeys };
}

// --- STAGE 3: weighted cosine --------------------------------------------

// Normalisation exponent on the senior magnitude. 1 = senior-anchored (extra
// alumni attributes are inert), 0.5 = textbook symmetric cosine.
export const ALPHA = 1;

// --- Coverage guard -------------------------------------------------------
// Both this metric and weighted Manhattan are overlap-over-size ratios, so both
// will happily report a flawless match between a senior who declared one
// attribute and an alum who declared the same one. That is not a metric
// problem and swapping the distance function does not fix it — the model was
// only ever evaluated on a sliver of itself. So we track how much of the
// weighted model each side actually populated and refuse to present a bare
// percentage when that is too thin to mean anything.
const CONFIDENCE_FLOOR = 0.5;   // below this the score is not fit to present
const CONFIDENCE_STRONG = 0.75;

function gradeConfidence(seniorWeight, alumWeight) {
  if (seniorWeight < CONFIDENCE_FLOOR || alumWeight < CONFIDENCE_FLOOR) return 'low';
  if (seniorWeight < CONFIDENCE_STRONG || alumWeight < CONFIDENCE_STRONG) return 'medium';
  return 'high';
}

/**
 * Score one encoded senior against one encoded alum, with a per-block
 * breakdown of where the number came from.
 *
 * Returns similarity in [0, 1]. Per-block contributions sum exactly to it.
 */
/**
 * Schools both sides actually name, canonicalised. A student targeting Stanford
 * and an alum who attended Stanford share a key; a Wake Forest alum does not,
 * even though both sit in the Elite Private tier.
 */
export function exactCollegeOverlap(senior, alum) {
  if (!senior.schoolKeys?.length || !alum.schoolKeys?.length) return [];
  const alumKeys = new Set(alum.schoolKeys);
  return senior.schoolKeys.filter((k) => alumKeys.has(k));
}

export function cosineAffinity(senior, alum) {
  let dot = 0;
  let normS = 0;
  let normA = 0;
  const seniorWeight = senior.sourceWeight;
  const alumWeight = alum.sourceWeight;
  let seniorBlocks = 0;
  let alumBlocks = 0;
  const blocks = [];

  for (const block of BLOCKS) {
    const w = block.weight;
    let blockDot = 0;
    let blockS = 0;
    let blockA = 0;
    const shared = [];

    for (let i = 0; i < block.slots.length; i += 1) {
      const idx = block.offset + i;
      const s = senior.vector[idx];
      const a = alum.vector[idx];
      blockS += w * s * s;
      blockA += w * a * a;
      if (s && a) {
        blockDot += w;
        shared.push(block.slots[i].id);
      }
    }

    dot += blockDot;
    normS += blockS;
    normA += blockA;
    if (blockS > 0) seniorBlocks += 1;
    if (blockA > 0) alumBlocks += 1;

    blocks.push({
      key: block.key,
      label: block.label,
      weight: w,
      shared,
      sharedLabels: shared.map((id) => LABEL_BY_SLOT[id]),
      seniorSlots: senior.active[block.key],
      alumSlots: alum.active[block.key],
      rawDot: blockDot,
    });
  }

  // Asymmetric denominator. At ALPHA = 1 this is just the senior's weighted
  // magnitude, so nothing the alum declares beyond the overlap moves the score.
  const denom = ALPHA === 1
    ? normS
    : Math.pow(normS, ALPHA) * Math.pow(normA, 1 - ALPHA);

  const similarity = denom > 0 ? dot / denom : 0;

  for (const b of blocks) {
    b.contribution = denom > 0 ? b.rawDot / denom : 0;
  }

  const exactColleges = exactCollegeOverlap(senior, alum);
  const symmetric = normS > 0 && normA > 0 ? dot / (Math.sqrt(normS) * Math.sqrt(normA)) : 0;
  const confidence = gradeConfidence(seniorWeight, alumWeight);

  return {
    similarity,
    score: Math.round(similarity * 1000) / 10, // 0–100, one decimal
    // Textbook symmetric cosine, retained for audit and for anyone
    // reconciling the engine against the published specification.
    cosine: symmetric,
    blocks,
    // Schools named by BOTH sides. Drives the primary tie-break: the tier block
    // cannot tell Stanford from Wake Forest, and a student who named Stanford
    // should get the Stanford alum.
    exactColleges,
    confidence,
    // When true the headline percentage is not fit to show as a match strength:
    // too little of the model was populated for it to carry meaning.
    provisional: confidence === 'low',
    coverage: {
      senior: senior.vector.reduce((n, v) => n + v, 0),
      alum: alum.vector.reduce((n, v) => n + v, 0),
      seniorBlocks,
      alumBlocks,
      // Fraction of the weighted model each side independently evidenced, and
      // the fraction on which this pairing could actually be assessed.
      seniorWeight: Math.round(seniorWeight * 1000) / 1000,
      alumWeight: Math.round(alumWeight * 1000) / 1000,
      assessed: Math.round(Math.min(seniorWeight, alumWeight) * 1000) / 1000,
    },
  };
}

// --- Ranking --------------------------------------------------------------

/**
 * A current college student rather than a working professional. The mentors
 * table has no career-stage column — 47% of rows simply carry "Student" in
 * current_position — so this is the only signal available.
 */
export function isCurrentStudent(mentor) {
  const position = mentor.current_position || mentor.career || mentor.role || '';
  return /\bstudents?\b/i.test(position);
}

// Load balancing. Alumni consent to being contacted, not to being the whole
// network's mentor, so each prior match shaves a little similarity. Capped so
// it can only ever break a near-tie, never overturn a genuine best match.
const LOAD_PENALTY_PER_MATCH = 0.012;
const LOAD_PENALTY_CAP = 0.06;

/**
 * Rank every candidate against one senior and return them best-first.
 * Self-matches and already-matched mentors are filtered before scoring.
 */
export function rankByAffinity(profile, candidates, options = {}) {
  const { excludedIds = [], limit = 3 } = options;
  const selfName = (profile.name || '').trim().toLowerCase();
  const senior = encodeProfile(profile, 'student');

  const excluded = new Set(excludedIds.map(String));

  const ranked = candidates
    .filter((c) => {
      if (selfName && c.name && c.name.trim().toLowerCase() === selfName) return false;
      if (excluded.has(String(c.id))) return false;
      return true;
    })
    .map((mentor) => {
      const alum = encodeProfile(mentor, 'alum');
      const result = cosineAffinity(senior, alum);
      const penalty = Math.min((mentor.match_count || 0) * LOAD_PENALTY_PER_MATCH, LOAD_PENALTY_CAP);
      return {
        mentor,
        ...result,
        isStudent: isCurrentStudent(mentor),
        loadPenalty: penalty,
        adjusted: Math.max(0, result.similarity - penalty),
        alumVector: alum.vector,
        alumSlots: alum.active,
      };
    })
    // Tie-break chain. With a coarse taxonomy and a 1000-row roster, exact
    // score ties are the norm rather than the exception — one real student
    // profile tied 50 candidates at 90.0 — so this ordering decides most
    // matches in practice and every step of it was checked against live data.
    //
    //   1. exact college   a student who named Stanford gets the Stanford alum,
    //                      not another Elite Private the tier block can't
    //                      distinguish from it.
    //   2. career stage    professionals ahead of current college students.
    //                      Not excluded: a 2025 grad is the best person to ask
    //                      about getting in, just not about a career.
    //   3. load            spreads matches across the tied pool. MUST precede
    //                      experience: with experience first, a 40-student
    //                      cohort sent all 40 matches to one alum.
    //   4. experience      only among equally-loaded peers.
    .sort((a, b) =>
      b.adjusted - a.adjusted
      || b.exactColleges.length - a.exactColleges.length
      || (a.isStudent ? 1 : 0) - (b.isStudent ? 1 : 0)
      || b.coverage.alumWeight - a.coverage.alumWeight
      || (a.mentor.match_count || 0) - (b.mentor.match_count || 0)
      || (a.mentor.grad_year || 9999) - (b.mentor.grad_year || 9999));

  return {
    seniorVector: senior.vector,
    seniorSlots: senior.active,
    ranked: ranked.slice(0, limit),
    scored: ranked.length,
  };
}

/**
 * Turn a scored pair into the "why you match" lines the match card renders.
 * Blocks are read in descending contribution, so the strongest geometric reason
 * is always the first thing the student sees.
 */
export function explainMatch(result, mentor) {
  const threads = [];
  const ordered = [...result.blocks].sort((a, b) => b.contribution - a.contribution);

  // Coverage guard. A high percentage computed over a sliver of the model is
  // worse than no percentage at all, so say so before saying anything else.
  if (result.provisional) {
    const pct = Math.round(result.coverage.seniorWeight * 100);
    threads.push(
      result.coverage.seniorWeight < 0.5
        ? `Provisional match: your profile covers ${pct}% of what the matcher looks at, so this pairing was assessed on that much of the model. Adding your clubs, favourite classes and target colleges will change it materially.`
        : `Provisional match: this alum's record covers ${Math.round(result.coverage.alumWeight * 100)}% of what the matcher looks at, so the pairing rests on limited information.`
    );
  }

  for (const block of ordered) {
    if (!block.shared.length) continue;
    const names = block.sharedLabels.join(' and ');
    const pct = Math.round(block.contribution * 100);

    if (block.key === 'major') {
      threads.push(`Field alignment: you and ${mentor.name.split(' ')[0]} both sit in ${names} (${pct}% of the match).`);
    } else if (block.key === 'archetype') {
      threads.push(`Shared archetype: ${names} — the same behavioural profile across clubs and career (${pct}%).`);
    } else if (block.key === 'collegeTier') {
      threads.push(
        result.exactColleges?.length
          ? `Same college: they actually attended ${mentor.college || result.exactColleges[0]}, one of your targets (${pct}%).`
          : `College tier: your targets and their path both land in ${names} (${pct}%).`
      );
    } else if (block.key === 'classZone') {
      threads.push(`Class zone: a shared ${names} academic lean (${pct}%).`);
    }
  }

  const foundOverlap = ordered.some((b) => b.shared.length > 0);

  if (result.confidence === 'medium' && !result.provisional && foundOverlap) {
    threads.push(`Assessed on ${Math.round(result.coverage.assessed * 100)}% of the matching model — a fuller profile on either side would sharpen it.`);
  }

  if (!foundOverlap) {
    const role = mentor.current_position || mentor.career || mentor.role;
    const field = mentor.major || mentor.college;
    if (role) {
      threads.push(`Nearest available profile: ${mentor.name.split(' ')[0]} works in ${role}, the closest fit in the network to what you have told us so far.`);
    } else if (field) {
      threads.push(`Nearest available profile: ${mentor.name.split(' ')[0]} came out of ${field}, the closest fit in the network so far.`);
    } else {
      threads.push('Nearest available profile: nothing you have declared overlaps the network yet — adding your intended majors and favourite classes will sharpen this considerably.');
    }
  }

  return threads;
}
