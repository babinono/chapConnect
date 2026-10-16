// ---------------------------------------------------------------------------
// STAGE 1 — FEATURE TAXONOMY & MATRIX BOUNDS
//
// The vocabulary is closed: 24 attributes across 4 fields. Every dimension of
// every profile vector is one of these slots, in this order, forever. Adding a
// slot is a breaking change to the vector space, so the index of each slot is
// pinned here and nowhere else.
//
//   [ 6 archetypes | 4 class zones | 4 college tiers | 10 major categories ]
//
// The onboarding UI collects free text through autocomplete rather than locked
// dropdowns, so a resolver layer sits between the raw field and the taxonomy:
// each slot owns a keyword set, and text that matches nothing lands nowhere
// (the block stays all-zero, which cosine handles natively — see the engine).
//
// KEYWORD CONVENTION — read before editing any dictionary below:
//   'finance'   prefix match on a word boundary. Hits "finance", "financial".
//   'ut '       (trailing space) exact whole-token match. Hits "UT Austin",
//               deliberately NOT "Utah" or "Connecticut".
// Use the exact form for any token under ~4 characters or any token that is a
// prefix of an unrelated word. Everything is lowercased before matching.
// ---------------------------------------------------------------------------

export const ARCHETYPES = [
  { id: 'quant_tech',    label: 'Quant / Tech' },
  { id: 'civic_lead',    label: 'Civic / Leadership' },
  { id: 'lifesci_med',   label: 'Life Science / Medicine' },
  { id: 'creative_arts', label: 'Creative Arts' },
  { id: 'corp_fin',      label: 'Corporate / Finance' },
  { id: 'apex_athletic', label: 'Apex Athletic' },
];

export const CLASS_ZONES = [
  { id: 'stem_advanced',      label: 'STEM Advanced' },
  { id: 'humanities_writing', label: 'Humanities / Writing' },
  { id: 'business_econ',      label: 'Business / Economics' },
  { id: 'creative_finearts',  label: 'Creative / Fine Arts' },
];

export const COLLEGE_TIERS = [
  { id: 'tx_powerhouse',     label: 'Texas Powerhouse' },
  { id: 'elite_private',     label: 'Elite Private / Ivy' },
  { id: 'oos_public',        label: 'Out-of-State Public' },
  { id: 'in_state_regional', label: 'In-State Regional' },
];

export const MAJOR_CATEGORIES = [
  { id: 'computer_science',   label: 'Computer Science' },
  { id: 'engineering',        label: 'Engineering' },
  { id: 'math_physical',      label: 'Math / Physical Sciences' },
  { id: 'biological_sciences',label: 'Biological Sciences' },
  { id: 'health_premed',      label: 'Health / Pre-Med' },
  { id: 'finance_business',   label: 'Finance / Business' },
  { id: 'economics_policy',   label: 'Economics / Policy' },
  { id: 'pre_law_govt',       label: 'Pre-Law / Government' },
  { id: 'humanities_comm',    label: 'Humanities / Communications' },
  { id: 'arts_design',        label: 'Arts / Design' },
];

// Block layout. Offsets are derived, never hand-written, so the 24 stays honest.
// Weights must sum to 1.00 — this is the only place to tune them.
//
// College tier was raised from 0.15 to 0.25, taken from archetype (0.35 ->
// 0.25). The justification is measured, not aesthetic: across 120 simulated
// matched pairs, 100% of shared archetypes ALSO fired from the student's field
// text alone, so archetype was spending 0.35 to restate what major already
// says at 0.40. At equal 0.25 weights, an alum matching major + real college
// now ties an alum matching major + echoed archetype, and the exact-college
// tie-break below decides in favour of the real college match.
export const BLOCKS = [
  { key: 'archetype',   label: 'Archetype',       slots: ARCHETYPES,        weight: 0.25 },
  { key: 'classZone',   label: 'Class Zone',      slots: CLASS_ZONES,       weight: 0.10 },
  { key: 'collegeTier', label: 'College Tier',    slots: COLLEGE_TIERS,     weight: 0.25 },
  { key: 'major',       label: 'Major / Field',   slots: MAJOR_CATEGORIES,  weight: 0.40 },
].map((b, i, all) => ({
  ...b,
  offset: all.slice(0, i).reduce((n, x) => n + x.slots.length, 0),
}));

export const VECTOR_SIZE = BLOCKS.reduce((n, b) => n + b.slots.length, 0); // 24

// Index of every slot id → its absolute coordinate in the 24D array.
export const SLOT_INDEX = BLOCKS.reduce((map, block) => {
  block.slots.forEach((slot, i) => { map[slot.id] = block.offset + i; });
  return map;
}, {});

// --- Keyword dictionaries -------------------------------------------------
// Matching is substring, lowercase, on the whole comma-separated field. Order
// inside a list matters only for readability; a text can light up several slots
// (a "Biomedical Engineering" target legitimately fires engineering AND
// biological_sciences, and cosine's magnitude term keeps that from inflating
// the score).

export const ARCHETYPE_KEYWORDS = {
  quant_tech: [
    'computer science', 'cs ', 'software', 'engineer', 'engineering', 'data ', 'machine learning', 'ai ', 'ml ',
    'artificial intelligence', 'robotics', 'coding', 'programming', 'developer', 'quant ',
    'mathematics', 'math club', 'physics', 'statistics', 'cyber', 'information systems', 'technology',
    'ux', 'product manager', 'devops', 'security', 'analytics', 'science bowl', 'science olympiad',
    'hackathon', 'rocketry', 'aviation', 'aerospace',
  ],
  civic_lead: [
    'student council', 'stuco', 'debate', 'speech', 'model un', 'mun ', 'mock trial', 'law ', 'lawyer', 'legal',
    'attorney', 'politics', 'political', 'government', 'policy', 'public service', 'nonprofit',
    'ngo', 'key club', 'nhs ', 'national honor society', 'volunteer', 'class president', 'ambassador',
    'diplomacy', 'advocacy', 'campaign', 'rotary', 'leadership',
  ],
  lifesci_med: [
    'pre-med', 'premed', 'medicine', 'medical', 'doctor', 'physician', 'nurse', 'nursing', 'biology',
    'biomedical', 'bioengineering', 'biochem', 'neuroscience', 'health', 'healthcare', 'public health',
    'dental', 'pharmacy', 'veterinary', 'hosa ', 'red cross', 'clinical', 'therapy', 'surgeon',
    'genetics', 'microbiology', 'epidemiology',
  ],
  creative_arts: [
    'art ', 'arts ', 'design', 'graphic', 'film', 'cinema', 'television', 'theater', 'theatre', 'drama',
    'music', 'orchestra', 'band', 'choir', 'chorus', 'dance', 'yearbook', 'newspaper', 'journalism',
    'creative writing', 'photography', 'studio', 'animation', 'architecture', 'fashion', 'media',
    'broadcast', 'podcast', 'illustration', 'ceramics', 'improv',
  ],
  corp_fin: [
    'finance', 'financial', 'investment', 'banking', 'private equity', 'venture',
    'hedge fund', 'vc ', 'consulting', 'consultant', 'business', 'entrepreneur', 'startup', 'deca ',
    'fbla ', 'accounting', 'accountant', 'marketing', 'sales', 'management', 'mba', 'real estate',
    'economics', 'strategy', 'operations', 'analyst', 'investment club', 'commerce', 'supply chain',
  ],
  apex_athletic: [
    'varsity', 'football', 'basketball', 'baseball', 'soccer', 'track', 'cross country', 'swim',
    'swimming', 'tennis', 'golf', 'lacrosse', 'volleyball', 'wrestling', 'softball', 'crew', 'rowing',
    'water polo', 'cheer', 'drill team', 'gymnastics', 'athletics', 'sports', 'rugby', 'hockey',
    'diving', 'fencing', 'weightlifting', 'kinesiology', 'athletic training',
  ],
};

export const CLASS_ZONE_KEYWORDS = {
  stem_advanced: [
    'calculus', 'calc ', 'bc ', 'ab ', 'physics', 'chemistry', 'chem ', 'biology', 'bio ', 'statistics',
    'stats ', 'computer science', 'comp sci', 'csa ', 'algebra', 'geometry', 'precalculus', 'pre-calc',
    'trigonometry', 'engineering', 'anatomy', 'environmental science', 'math', 'science', 'robotics',
  ],
  humanities_writing: [
    'english', 'literature', 'lit ', 'writing', 'composition', 'history', 'apush', 'us history',
    'world history', 'european history', 'government', 'gov ', 'psychology', 'psych ', 'sociology',
    'philosophy', 'latin', 'spanish', 'french', 'german', 'chinese', 'language', 'humanities',
    'rhetoric', 'debate', 'seminar', 'human geography',
  ],
  business_econ: [
    'economics', 'econ ', 'macro', 'micro', 'business', 'accounting', 'finance', 'marketing',
    'entrepreneurship', 'personal finance', 'management', 'business law', 'money matters',
  ],
  creative_finearts: [
    'art ', 'arts ', 'studio art', 'drawing', 'painting', 'ceramics', 'photography', 'graphic design', 'design',
    'theater', 'theatre', 'drama', 'music', 'band', 'orchestra', 'choir', 'dance', 'film', 'media',
    'yearbook', 'journalism', 'creative writing', 'architecture',
  ],
};

// College tiers resolve off school NAMES, so the dictionaries are name fragments.
// Order matters here: the first tier whose fragment appears wins for that school,
// which keeps "Rice" out of elite_private and in the Texas block on purpose —
// a Texas kid reads Rice as a Texas school, not as a coastal private.
export const COLLEGE_TIER_KEYWORDS = {
  tx_powerhouse: [
    'ut ', 'ut austin', 'university of texas at austin', 'texas a&m', 'tamu ', 'aggie',
    'longhorn', 'mccombs', 'rice', 'baylor', 'smu ', 'southern methodist', 'tcu ',
    'texas christian', 'dell medical', 'ut southwestern', 'utsw ',
  ],
  elite_private: [
    'harvard', 'yale', 'princeton', 'columbia', 'brown', 'dartmouth', 'cornell',
    'university of pennsylvania', 'upenn', 'wharton', 'stanford', 'mit ',
    'massachusetts institute', 'caltech', 'california institute', 'university of chicago',
    'uchicago', 'duke', 'northwestern', 'johns hopkins', 'jhu ', 'vanderbilt',
    'washington university', 'wustl', 'washu', 'notre dame', 'emory', 'georgetown',
    'carnegie mellon', 'cmu ', 'southern california', 'usc ', 'new york university', 'nyu ',
    'tufts', 'wake forest', 'boston college', 'williams college', 'amherst', 'swarthmore',
    'pomona', 'wellesley', 'bowdoin', 'carleton', 'middlebury', 'claremont mckenna',
    'davidson', 'harvey mudd', 'barnard', 'haverford', 'colgate', 'hamilton college',
    'vassar', 'grinnell', 'colby', 'smith college', 'wesleyan', 'bates college',
    'georgia tech', 'georgia institute', 'oxford', 'cambridge', 'london school',
    'imperial college', 'juilliard', 'risd ', 'babson',
  ],
  oos_public: [
    'berkeley', 'ucla ', 'ucsd ', 'ucsb ', 'uc davis', 'uc irvine', 'uc santa', 'uc riverside',
    'uc merced', 'california, ', 'university of michigan', 'umich', 'michigan state',
    'university of virginia', 'uva ', 'virginia tech', 'chapel hill', 'unc ',
    'university of florida', 'florida state', 'university of georgia', 'uga ',
    'wisconsin', 'illinois', 'uiuc ', 'university of washington', 'maryland', 'ohio state',
    'penn state', 'pennsylvania state', 'purdue', 'indiana university', 'minnesota',
    'university of iowa', 'iowa state', 'rutgers', 'pittsburgh', 'colorado', 'arizona',
    'asu ', 'utah', 'oregon', 'kansas', 'missouri', 'mizzou', 'nebraska', 'oklahoma',
    'arkansas', 'alabama', 'auburn', 'tennessee', 'kentucky', 'lsu ', 'louisiana state',
    'clemson', 'south carolina', 'nc state', 'ncsu ', 'connecticut', 'uconn', 'umass',
    'stony brook', 'binghamton', 'buffalo', 'san diego state', 'cal poly',
  ],
  in_state_regional: [
    'texas tech', 'ttu ', 'university of houston', 'texas state', 'north texas', 'unt ',
    'utd ', 'texas at dallas', 'uta ', 'texas at arlington', 'utsa ', 'texas at san antonio',
    'utep ', 'texas at el paso', 'sam houston', 'stephen f. austin', 'lamar university',
    'utmb ', 'texas medical branch', 'uthealth', 'st. edward', 'trinity university',
    'austin community', 'acc ',
  ],
};

export const MAJOR_KEYWORDS = {
  computer_science: [
    'computer science', 'cs ', 'software', 'data science', 'machine learning', 'artificial intelligence',
    'ai ', 'ml ',
    'information systems', 'mis ', 'cybersecurity', 'computer engineering', 'programming',
    'developer', 'informatics', 'computational',
  ],
  engineering: [
    'engineering', 'mechanical', 'electrical', 'aerospace', 'civil', 'chemical engineering',
    'industrial', 'petroleum', 'materials', 'robotics', 'systems engineering', 'engineer',
  ],
  math_physical: [
    'mathematics', 'math ', 'applied math', 'statistics', 'physics', 'astronomy', 'chemistry',
    'geology', 'actuarial', 'econometrics', 'quantitative',
  ],
  biological_sciences: [
    'biology', 'biological', 'biochemistry', 'microbiology', 'neuroscience', 'genetics',
    'molecular', 'ecology', 'zoology', 'biomedical', 'bioengineering', 'environmental science',
  ],
  health_premed: [
    'pre-med', 'premed', 'medicine', 'medical', 'nursing', 'public health', 'kinesiology',
    'physical therapy', 'pharmacy', 'dentistry', 'dental', 'health', 'physician', 'nutrition',
    'md ', 'clinical',
  ],
  finance_business: [
    'finance', 'business', 'accounting', 'marketing', 'management', 'international business',
    'entrepreneurship', 'supply chain', 'real estate', 'mba', 'commerce', 'banking', 'investment',
    'consulting', 'analyst',
  ],
  economics_policy: [
    'economics', 'econ ', 'public policy', 'policy', 'international relations', 'development',
    'urban planning', 'public administration',
  ],
  pre_law_govt: [
    'pre-law', 'prelaw', 'law ', 'lawyer', 'legal', 'jd ', 'political science', 'government', 'politics',
    'criminal justice', 'international affairs', 'attorney', 'judicial',
  ],
  humanities_comm: [
    'english', 'literature', 'history', 'philosophy', 'sociology', 'anthropology', 'linguistics',
    'psychology', 'communications', 'journalism', 'religious studies', 'classics', 'education',
    'human development', 'social work',
  ],
  arts_design: [
    'art ', 'arts ', 'fine arts', 'graphic design', 'design', 'architecture', 'film', 'television', 'theater',
    'theatre', 'drama', 'music', 'dance', 'photography', 'fashion', 'animation', 'studio art',
    'art history', 'creative writing',
  ],
};

export const KEYWORDS_BY_BLOCK = {
  archetype: ARCHETYPE_KEYWORDS,
  classZone: CLASS_ZONE_KEYWORDS,
  collegeTier: COLLEGE_TIER_KEYWORDS,
  major: MAJOR_KEYWORDS,
};

export const LABEL_BY_SLOT = BLOCKS.reduce((map, block) => {
  block.slots.forEach((slot) => { map[slot.id] = slot.label; });
  return map;
}, {});

// ---------------------------------------------------------------------------
// SCHOOL CANONICALISATION
//
// College tier is four coarse buckets, so a student targeting Stanford gets the
// same tier credit from a Wake Forest alum as from a Stanford alum. To rank an
// exact college match above a mere tier match we need to know when two strings
// name the same school — and the two sides write them differently: students
// enter "Stanford University" and "Massachusetts Institute of Technology" from
// the autocomplete, while alumni records hold "Stanford" and "MIT".
//
// Stopword stripping handles the "X University" / "X" case on its own. The
// alias table covers abbreviations, which stripping cannot reach. Both were
// built from the live data, not guessed.
// ---------------------------------------------------------------------------

const SCHOOL_STOPWORDS = new Set(['university', 'college', 'the', 'of', 'at', 'in', 'school']);

export const SCHOOL_ALIASES = {
  'mit': 'mit', 'massachusetts institute technology': 'mit',
  'cmu': 'carnegie mellon', 'carnegie mellon': 'carnegie mellon',
  'ut': 'ut austin', 'ut austin': 'ut austin', 'texas austin': 'ut austin',
  'texas': 'ut austin', 'mccombs': 'ut austin',
  'tamu': 'texas a&m', 'texas a&m': 'texas a&m', 'texas a m': 'texas a&m',
  'upenn': 'upenn', 'penn': 'upenn', 'pennsylvania': 'upenn', 'wharton': 'upenn',
  'washu': 'washu', 'wustl': 'washu', 'washington st louis': 'washu',
  'washington saint louis': 'washu',
  'ucla': 'ucla', 'california los angeles': 'ucla',
  'berkeley': 'berkeley', 'uc berkeley': 'berkeley', 'cal': 'berkeley',
  'california berkeley': 'berkeley',
  'uchicago': 'uchicago', 'chicago': 'uchicago',
  'jhu': 'johns hopkins', 'johns hopkins': 'johns hopkins',
  'nyu': 'nyu', 'new york': 'nyu',
  'usc': 'usc', 'southern california': 'usc',
  'smu': 'smu', 'southern methodist': 'smu',
  'tcu': 'tcu', 'texas christian': 'tcu',
  'gatech': 'georgia tech', 'georgia tech': 'georgia tech',
  'georgia institute technology': 'georgia tech',
  'uatx': 'uatx', 'austin': 'uatx',
  'unc': 'unc', 'north carolina': 'unc', 'north carolina chapel hill': 'unc',
  'uiuc': 'uiuc', 'illinois urbana champaign': 'uiuc', 'illinois': 'uiuc',
  'uva': 'uva', 'virginia': 'uva',
  'umich': 'michigan', 'michigan': 'michigan',
  'uga': 'georgia', 'georgia': 'georgia',
  'bc': 'boston college', 'boston': 'boston university',
  'west point': 'west point', 'united states military academy': 'west point',
};

/**
 * Reduce a school string to a comparison key. Returns '' when the input is
 * empty or reduces to nothing.
 */
export function canonicalSchool(name) {
  if (!name || typeof name !== 'string') return '';
  const cleaned = name
    .toLowerCase()
    .replace(/&/g, ' & ')
    .replace(/[^a-z0-9& ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !SCHOOL_STOPWORDS.has(w))
    .join(' ')
    .trim();
  if (!cleaned) return '';
  return SCHOOL_ALIASES[cleaned] || cleaned;
}
