// Deterministic synthetic giving history for demos.
//
// Every gift is derived from a hash of the contact's own identity (id + name),
// never from array position — so the same person always produces exactly the
// same gifts regardless of row order, page, machine, or whether the data came
// from Supabase or localStorage. Run it a hundred times and you get a hundred
// identical datasets.
//
// The synthetic donor profile is built from that person's REAL Supabase fields:
// grad year (capacity grows with career age), city (market), college, and
// career/position (industry). So the trend cuts show real structure instead of
// noise, and "finance alumni in New York give the most" is a claim the numbers
// actually support.
//
// No imports on purpose: this file is loaded both by the React app and by the
// plain-node seeding script (scripts/seed-donations.mjs).

export const DEMO_CAMPAIGNS = ['Annual Fund', 'Scholarship Fund', 'Athletics', 'Fine Arts', 'Capital Campaign', 'Teacher Grants'];
export const DEMO_YEARS = [2021, 2022, 2023, 2024, 2025];

/* ---------- Deterministic randomness ---------- */

// FNV-1a. Stable across engines, unlike anything involving Math.random.
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
// A tiny PRNG seeded per contact, so each person has their own stable stream.
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// RFC-4122-shaped v4 uuid built from the hash, so re-seeding upserts the same
// rows instead of duplicating them.
export function stableUuid(key) {
  let out = '';
  for (let i = 0; i < 4; i++) out += hash(`${key}#${i}`).toString(16).padStart(8, '0');
  const b = out.split('');
  b[12] = '4';
  b[16] = '89ab'[parseInt(b[16], 16) % 4];
  const s = b.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/* ---------- Real-field → donor-profile mapping ---------- */

// Metro capacity. Keys match the `location` values actually in the database.
const CITY_WEIGHT = {
  'new york city': 2.0, 'new york': 2.0, 'san francisco': 2.1, 'boston': 1.5,
  'seattle': 1.45, 'chicago': 1.4, 'washington dc': 1.4, 'los angeles': 1.35,
  'dallas': 1.4, 'houston': 1.25, 'austin': 1.15, 'atlanta': 1.1,
  'denver': 1.1, 'philadelphia': 1.1, 'fort worth': 1.05, 'st. louis': 0.95,
  'nashville': 1.0, 'durham': 0.9, 'ann arbor': 0.85, 'ithaca': 0.85,
  'college station': 0.8, 'virginia': 0.95,
};

// Industry is inferred from the free-text career / current_position field.
// Order matters: the first matching pattern wins, so specific beats generic.
const INDUSTRY_RULES = [
  { name: 'Finance', weight: 2.4, re: /\b(finance|financial|investment|banker|banking|private equity|hedge fund|venture|vc|trader|trading|quant|wealth|asset manage|actuar)/i },
  { name: 'Law', weight: 1.7, re: /\b(law|legal|attorney|lawyer|counsel|judicial|paralegal)/i },
  { name: 'Medicine', weight: 1.8, re: /\b(doctor|physician|surgeon|md\b|medical|medicine|dental|dentist|nurse|nursing|pharmac|veterinar)/i },
  { name: 'Consulting', weight: 1.9, re: /\b(consult|strategy|mckinsey|bain|bcg|deloitte|accenture)/i },
  { name: 'Real Estate', weight: 1.8, re: /\b(real estate|realtor|property|broker|development(?!al)|construction)/i },
  { name: 'Technology', weight: 1.6, re: /\b(software|swe\b|engineer(?!ing student)|developer|data scien|machine learning|\bcs\b|computer|product manager|\bit\b|cyber|google|microsoft|amazon|apple|meta\b)/i },
  { name: 'Business', weight: 1.3, re: /\b(business|management|manager|operations|sales|marketing|analyst|accounting|accountant|founder|ceo|coo|cfo|entrepreneur|executive)/i },
  { name: 'Engineering', weight: 1.2, re: /\b(engineering|mechanical|aerospace|civil|chemical|electrical|meche|chem ?e|ece\b|bme\b|bioengineer)/i },
  { name: 'Science & Research', weight: 0.9, re: /\b(research|scientist|biology|chemistry|physics|neuroscience|biochem|phd|laborator)/i },
  { name: 'Education', weight: 0.8, re: /\b(teacher|teaching|professor|educat|school|academic)/i },
  { name: 'Arts & Media', weight: 0.9, re: /\b(art|artist|design|music|film|media|journalis|writer|photograph|theatre|theater|actor)/i },
  { name: 'Government & Nonprofit', weight: 0.8, re: /\b(government|policy|public service|nonprofit|non-profit|military|army|navy|air force|politic)/i },
  { name: 'Athletics', weight: 1.4, re: /\b(athlet|football|basketball|soccer|coach|sports|d1\b)/i },
];

// Someone still in school has a stipend, not a giving capacity.
const STUDENT_RE = /\b(student|undergrad|gap year|intern)\b/i;

export function industryOf(contact) {
  const text = [contact?.career, contact?.company, contact?.major].filter(Boolean).join(' ');
  if (!text.trim()) return null;
  if (STUDENT_RE.test(text)) {
    // Classify a student by their field of study, but flag them as a student
    // so capacity stays low — a "Business Student" is not a business donor.
    const rule = INDUSTRY_RULES.find(r => r.re.test(text));
    return { name: rule ? `${rule.name} (student)` : 'Student', weight: 0.25, student: true };
  }
  const rule = INDUSTRY_RULES.find(r => r.re.test(text));
  return rule ? { name: rule.name, weight: rule.weight, student: false } : { name: 'Other', weight: 1.0, student: false };
}

// A handful of schools where the alumni network correlates with giving capacity.
const COLLEGE_BONUS = /\b(harvard|yale|princeton|stanford|mit|wharton|penn\b|columbia|dartmouth|brown|cornell|duke|northwestern|rice|vanderbilt|chicago|berkeley|georgetown)\b/i;

function cityKey(contact) {
  return String(contact?.location || '').split(',')[0].trim().toLowerCase();
}

/* ---------- Campaign & calendar shape ---------- */

const CAMPAIGN_MIX = [
  // share = how often a gift lands here; scale = typical gift-size multiplier
  { name: 'Annual Fund', share: 0.34, scale: 0.7 },
  { name: 'Scholarship Fund', share: 0.22, scale: 1.4 },
  { name: 'Capital Campaign', share: 0.10, scale: 4.5 },
  { name: 'Athletics', share: 0.15, scale: 0.9 },
  { name: 'Fine Arts', share: 0.10, scale: 0.8 },
  { name: 'Teacher Grants', share: 0.09, scale: 1.1 },
];
// Appeal calendar: spring campaign, summer lull, December tax-year push.
const MONTH_WEIGHT = [3, 3, 6, 9, 8, 4, 2, 3, 5, 7, 8, 14];

function weightedPick(r, items, weightOf) {
  const total = items.reduce((s, it) => s + weightOf(it), 0);
  let x = r() * total;
  for (const it of items) { x -= weightOf(it); if (x <= 0) return it; }
  return items[items.length - 1];
}
// Round to amounts a human would actually write on a check.
function niceAmount(n) {
  if (n >= 5000) return Math.round(n / 1000) * 1000;
  if (n >= 1000) return Math.round(n / 500) * 500;
  if (n >= 250) return Math.round(n / 50) * 50;
  return Math.max(25, Math.round(n / 25) * 25);
}

/* ---------- Generator ---------- */

// Returns the full synthetic gift list for a contact set. Pure and stable:
// same contacts in, same gifts out, every single time.
export function generateDonations(contacts, opts = {}) {
  const now = opts.now || 2025;          // pinned, so results don't drift each January
  const out = [];

  for (const c of contacts || []) {
    if (!c || !c.id) continue;
    // Seed from identity, not position in the array.
    const seed = hash(`${c.id}|${c.name || ''}`);
    const r = rng(seed);

    const grad = Number(c.grad_year) || 0;
    const industry = industryOf(c);
    const yearsOut = grad ? Math.max(0, Math.min(45, now - grad)) : 10;
    const seniority = yearsOut / 45;                     // 0 = just graduated
    const cityMult = CITY_WEIGHT[cityKey(c)] || 0.8;
    const indMult = industry ? industry.weight : 1.0;
    const collegeMult = COLLEGE_BONUS.test(c.college || '') ? 1.25 : 1.0;

    // Students barely give no matter how long ago they graduated.
    const studentDamp = industry?.student ? 0.3 : 1.0;

    // Probability this person is a donor at all.
    const pDonor = Math.min(0.8,
      (0.08 + seniority * 0.75) * (0.7 + (cityMult - 0.8) * 0.35) * (0.65 + indMult * 0.3) * studentDamp
    );
    if (r() > pDonor) continue;

    // Loyal donors give across several years; new grads typically give once.
    const giftCount = 1 + Math.floor(r() * (1 + seniority * 3.4));
    const capacity = (100 + seniority * 1500) * cityMult * indMult * collegeMult * studentDamp;

    // Pick which years they gave in. Scoring every year first and then taking
    // the top `giftCount` avoids front-loading: walking 2021→2025 and stopping
    // once the quota fills would starve the later years and fake a collapse in
    // every campaign's year-over-year trend.
    const chosen = DEMO_YEARS
      .map(y => ({ y, score: r() }))
      .sort((a, b) => a.score - b.score)
      .slice(0, Math.min(giftCount, DEMO_YEARS.length))
      .map(x => x.y)
      .sort((a, b) => a - b);

    chosen.forEach((year, gi) => {
      const camp = weightedPick(r, CAMPAIGN_MIX, it => it.share);
      const month = weightedPick(r, MONTH_WEIGHT.map((w, i) => ({ w, m: i + 1 })), it => it.w).m;
      const day = 1 + Math.floor(r() * 27);
      const yearLift = 1 + (year - 2021) * 0.08;   // the program has grown modestly
      const loyaltyLift = 1 + gi * 0.2;            // repeat donors step up
      const jitter = 0.55 + r() * 1.1;
      const amount = niceAmount(capacity * camp.scale * yearLift * loyaltyLift * jitter);
      const method = amount >= 5000 ? (r() < 0.5 ? 'Stock' : 'Wire')
        : amount >= 1000 ? (r() < 0.6 ? 'Check' : 'Credit Card')
          : (r() < 0.75 ? 'Credit Card' : 'Check');
      out.push({
        id: stableUuid(`${c.id}|${gi}`),
        contactId: c.id,
        contactName: c.name || 'Anonymous',
        amount,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        campaign: camp.name,
        method,
        note: '',
      });
    });
  }

  // Stable ordering so exports and diffs are reproducible too.
  return out.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
}
