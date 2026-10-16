// Matching analytics for the admin CRM.
//
// Same contract as crmAnalytics.js: every export is a pure function over
// (matches, mentors, students) with no I/O and no component state, so the
// Matching tab stays a thin renderer and every number can be checked by hand.
//
// Two things make this more than a row count. First, it re-runs the live
// matching engine over the recorded pairs, so "match quality" is the actual
// score the student was served rather than a proxy. Second, it reads the
// network through the same taxonomy the matcher uses, which is what surfaces
// supply gaps — a field twenty students want and two alumni can serve looks
// fine in a contact list and is the single biggest driver of weak matches.

import { encodeProfile, isCurrentStudent } from './affinityEngine';
import { cosineAffinity } from './affinityEngine';
import { MAJOR_CATEGORIES, BLOCKS, canonicalSchool } from './affinityTaxonomy';

const pct = (n, d) => (d > 0 ? n / d : 0);

/** Inequality of a load distribution. 0 = every mentor equally used, 1 = one mentor takes everything. */
export function gini(values) {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  const sum = s.reduce((a, b) => a + b, 0);
  if (!n || !sum) return 0;
  return (2 * s.reduce((acc, v, i) => acc + (i + 1) * v, 0)) / (n * sum) - (n + 1) / n;
}

/** Shape a raw user_profiles row into what the matching engine expects. */
export function toStudentProfile(row) {
  return {
    name: row.name,
    targetColleges: row.target_colleges,
    targetMajors: row.target_majors,
    targetCareers: row.target_careers,
    activities: row.high_school_activities,
    classes: row.favorite_classes,
  };
}

// --- Volume ---------------------------------------------------------------

/** Matches per month, oldest first, with gaps filled so the trend line is honest. */
export function monthlyVolume(matches) {
  const rows = matches.filter(m => m.created_at);
  if (!rows.length) return [];
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const counts = {};
  const students = {};
  for (const m of rows) {
    const k = key(new Date(m.created_at));
    counts[k] = (counts[k] || 0) + 1;
    (students[k] ||= new Set()).add(m.user_id);
  }
  const keys = Object.keys(counts).sort();
  const out = [];
  const [y0, m0] = keys[0].split('-').map(Number);
  const [y1, m1] = keys[keys.length - 1].split('-').map(Number);
  for (let y = y0, mo = m0; y < y1 || (y === y1 && mo <= m1); mo === 12 ? (mo = 1, y++) : mo++) {
    const k = `${y}-${String(mo).padStart(2, '0')}`;
    out.push({ key: k, matches: counts[k] || 0, students: students[k]?.size || 0 });
  }
  return out;
}

// --- Mentor load ----------------------------------------------------------

/**
 * How evenly the network is being used. Counts come from the recorded matches
 * rather than mentors.match_count, because match_count is incremented
 * optimistically at match time and drifts if a write fails.
 */
export function mentorLoad(matches, mentors) {
  const byId = new Map(mentors.map(m => [String(m.id), m]));
  const counts = new Map();
  for (const m of matches) {
    const k = String(m.mentor_id);
    if (byId.has(k)) counts.set(k, (counts.get(k) || 0) + 1);
  }
  const used = [...counts.entries()]
    .map(([id, n]) => ({ mentor: byId.get(id), matches: n }))
    .sort((a, b) => b.matches - a.matches);

  const loads = mentors.map(m => counts.get(String(m.id)) || 0);
  const total = matches.length;
  const top5 = used.slice(0, 5).reduce((a, b) => a + b.matches, 0);

  // Concentration only means something once there have been enough matches for
  // the roster to have been meaningfully sampled. With 22 matches across 1151
  // mentors the Gini is ~0.99 by arithmetic alone, which reads as hoarding and
  // is really just an empty history.
  const meaningful = total >= mentors.length * 0.5;

  return {
    total,
    meaningful,
    distinctUsed: used.length,
    neverMatched: mentors.length - used.length,
    rosterSize: mentors.length,
    busiest: used[0]?.matches || 0,
    fairShare: mentors.length ? total / mentors.length : 0,
    top5Share: pct(top5, total),
    gini: gini(loads),
    leaders: used.slice(0, 8),
  };
}

// --- Supply vs demand -----------------------------------------------------

/**
 * The most actionable cut in here: for each field in the taxonomy, how many
 * students want it against how many alumni can serve it. A ratio above ~8
 * students per mentor means those students are competing for the same handful
 * of people and will start receiving visibly weaker matches.
 */
export function supplyDemand(students, mentors) {
  const demand = {};
  const supply = {};
  const supplyPros = {};

  for (const s of students) {
    for (const slot of encodeProfile(toStudentProfile(s), 'student').active.major) {
      demand[slot] = (demand[slot] || 0) + 1;
    }
  }
  for (const m of mentors) {
    const pro = !isCurrentStudent(m);
    for (const slot of encodeProfile(m, 'alum').active.major) {
      supply[slot] = (supply[slot] || 0) + 1;
      if (pro) supplyPros[slot] = (supplyPros[slot] || 0) + 1;
    }
  }

  return MAJOR_CATEGORIES
    .map(c => {
      const d = demand[c.id] || 0;
      const s = supply[c.id] || 0;
      const p = supplyPros[c.id] || 0;
      return {
        key: c.id,
        label: c.label,
        students: d,
        mentors: s,
        professionals: p,
        // Students per working professional — the number that actually bites.
        ratio: p > 0 ? d / p : (d > 0 ? Infinity : 0),
      };
    })
    .filter(r => r.students > 0 || r.mentors > 0)
    .sort((a, b) => b.students - a.students);
}

// --- Network composition --------------------------------------------------

/**
 * What the roster is made of, and how completely it is filled in. Profile
 * completeness is the fraction of the weighted model a record populates — the
 * matcher can only compare on what people actually entered.
 */
export function networkComposition(mentors) {
  let pros = 0;
  let currentStudents = 0;
  let withClubs = 0;
  let withClasses = 0;
  let weightSum = 0;
  const buckets = { thin: 0, partial: 0, full: 0 };

  for (const m of mentors) {
    const enc = encodeProfile(m, 'alum');
    if (isCurrentStudent(m)) currentStudents++; else pros++;
    if (enc.declared.activities) withClubs++;
    if (enc.declared.classes) withClasses++;
    weightSum += enc.sourceWeight;
    if (enc.sourceWeight < 0.5) buckets.thin++;
    else if (enc.sourceWeight < 0.75) buckets.partial++;
    else buckets.full++;
  }
  const n = mentors.length || 1;
  return {
    total: mentors.length,
    professionals: pros,
    currentStudents,
    studentShare: pct(currentStudents, mentors.length),
    withClubs, withClasses,
    clubShare: pct(withClubs, mentors.length),
    classShare: pct(withClasses, mentors.length),
    avgCompleteness: weightSum / n,
    buckets,
  };
}

// --- Match quality --------------------------------------------------------

/**
 * Re-score every recorded pairing with the live engine. This is what the
 * student was actually served, so a low mean here is a real product signal and
 * not a modelling abstraction.
 */
export function matchQuality(matches, mentors, students) {
  const mentorById = new Map(mentors.map(m => [String(m.id), m]));
  const studentById = new Map(students.map(s => [String(s.user_id), s]));
  const scored = [];

  for (const m of matches) {
    const mentor = mentorById.get(String(m.mentor_id));
    const student = studentById.get(String(m.user_id));
    if (!mentor || !student) continue;
    const r = cosineAffinity(
      encodeProfile(toStudentProfile(student), 'student'),
      encodeProfile(mentor, 'alum'),
    );
    scored.push({
      key: m.id,
      student: student.name,
      mentor: mentor.name,
      college: mentor.college,
      position: mentor.current_position,
      score: r.score,
      confidence: r.confidence,
      exactCollege: r.exactColleges.length > 0,
      isStudent: isCurrentStudent(mentor),
      blocks: r.blocks.filter(b => b.shared.length).map(b => b.key),
      created_at: m.created_at,
    });
  }

  const n = scored.length;
  const bands = { strong: 0, fair: 0, weak: 0 };
  for (const s of scored) {
    if (s.score >= 80) bands.strong++;
    else if (s.score >= 50) bands.fair++;
    else bands.weak++;
  }
  return {
    scored: scored.sort((a, b) => b.score - a.score),
    count: n,
    mean: n ? scored.reduce((a, b) => a + b.score, 0) / n : 0,
    bands,
    exactCollegeShare: pct(scored.filter(s => s.exactCollege).length, n),
    studentMentorShare: pct(scored.filter(s => s.isStudent).length, n),
    lowConfidence: scored.filter(s => s.confidence === 'low').length,
    // Which blocks are actually earning their weight across real matches.
    blockHitRate: BLOCKS.map(b => ({
      key: b.key,
      label: b.label,
      weight: b.weight,
      hits: scored.filter(s => s.blocks.includes(b.key)).length,
      share: pct(scored.filter(s => s.blocks.includes(b.key)).length, n),
    })),
  };
}

// --- College demand -------------------------------------------------------

/** Dream colleges ranked by student demand, joined to whether the network can serve them. */
export function collegeDemand(students, mentors) {
  const alumniByKey = new Map();
  for (const m of mentors) {
    const k = canonicalSchool(m.college);
    if (!k) continue;
    if (!alumniByKey.has(k)) alumniByKey.set(k, { total: 0, pros: 0 });
    const e = alumniByKey.get(k);
    e.total++;
    if (!isCurrentStudent(m)) e.pros++;
  }

  const demand = new Map();
  for (const s of students) {
    for (const raw of s.target_colleges || []) {
      const k = canonicalSchool(raw);
      if (!k) continue;
      if (!demand.has(k)) demand.set(k, { key: k, label: raw, students: 0 });
      demand.get(k).students++;
    }
  }

  return [...demand.values()]
    .map(d => ({ ...d, alumni: alumniByKey.get(d.key)?.total || 0, professionals: alumniByKey.get(d.key)?.pros || 0 }))
    .sort((a, b) => b.students - a.students || a.label.localeCompare(b.label));
}

// --- Outcomes -------------------------------------------------------------

/**
 * Status distribution. `tracked` is false when every row still sits at the
 * initial status, which means outcomes are not being recorded and no funnel
 * conclusion should be drawn from this.
 */
export function outcomes(matches) {
  const counts = {};
  for (const m of matches) counts[m.status || 'Unknown'] = (counts[m.status || 'Unknown'] || 0) + 1;
  const keys = Object.keys(counts);
  return {
    counts: keys.map(k => ({ key: k, label: k, value: counts[k] })).sort((a, b) => b.value - a.value),
    tracked: !(keys.length === 1 && keys[0] === 'Matched'),
    total: matches.length,
  };
}
