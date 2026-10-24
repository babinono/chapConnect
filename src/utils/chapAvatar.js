// Profile pictures drawn as the Westlake roadrunner mascot: a fuzzy head with
// the tall crest, big white eyes, the wide yellow beak and the grey chest bib.
// Everyone picks red or blue plus one of the looks below; the choice is stored
// as "color:look" (e.g. "blue:graduate"). Anyone without a saved choice gets a
// stable one derived from their name or id, so no profile is ever blank.

export const CHAP_COLORS = {
  red: { label: 'Red', fur: '#D7262F', furDark: '#A3121D', team: '#14286B' },
  blue: { label: 'Blue', fur: '#2452C9', furDark: '#16389A', team: '#C8102E' },
};

// Each look combines a face, a background and any accessories.
export const CHAP_LOOKS = [
  { key: 'classic', label: 'Classic', bg: '#F4EFE4', face: 'smile', acc: [] },
  { key: 'bow', label: 'Pink Bow', bg: '#DCEBFA', face: 'smile', acc: ['bow'] },
  { key: 'graduate', label: 'Graduate', bg: '#FBE7B5', face: 'smile', acc: ['gradcap'] },
  { key: 'gameday', label: 'Game Day', bg: '#CFE8D2', face: 'grin', acc: ['facepaint', 'headband'] },
  { key: 'rodeo', label: 'Rodeo', bg: '#F1DDC2', face: 'smile', acc: ['bandana', 'cowboy'] },
  { key: 'cool', label: 'Too Cool', bg: '#FFD6C2', face: 'smile', acc: ['sunglasses'] },
  { key: 'scholar', label: 'Scholar', bg: '#EAE6F5', face: 'side', acc: ['bowtie', 'glasses'] },
  { key: 'dj', label: 'DJ Chap', bg: '#D9D2F7', face: 'grin', acc: ['headphones'] },
  { key: 'royalty', label: 'Royalty', bg: '#F3E1F7', face: 'happy', acc: ['crown'] },
  { key: 'party', label: 'Party', bg: '#FFD9E6', face: 'grin', acc: ['party'] },
  { key: 'cozy', label: 'Cozy', bg: '#DDEFF5', face: 'happy', acc: ['scarf', 'beanie'] },
  { key: 'coach', label: 'Coach', bg: '#F7D9D6', face: 'smile', acc: ['cap'] },
  { key: 'winky', label: 'Winky', bg: '#D5F0E6', face: 'wink', acc: [] },
  { key: 'whoa', label: 'Whoa', bg: '#FFF1B8', face: 'surprised', acc: [] },
  { key: 'chef', label: 'Chef', bg: '#FFE3CF', face: 'smile', acc: ['chef'] },
  { key: 'flower', label: 'Flower Child', bg: '#EFE0FA', face: 'happy', acc: ['flower'] },
];

export const LOOKS_BY_KEY = Object.fromEntries(CHAP_LOOKS.map(l => [l.key, l]));
export const HATS = new Set(['gradcap', 'cowboy', 'cap', 'beanie', 'crown', 'party', 'chef']);

export function parseAvatar(value) {
  const [color, look] = String(value || '').split(':');
  if (CHAP_COLORS[color] && LOOKS_BY_KEY[look]) return { color, look };
  return null;
}

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function avatarFromSeed(seed) {
  const h = hash(seed || 'chap');
  return `${h % 2 ? 'blue' : 'red'}:${CHAP_LOOKS[(h >>> 1) % CHAP_LOOKS.length].key}`;
}

export function randomAvatar() {
  return avatarFromSeed(Math.random().toString(36));
}

// The avatar to show for a record: its saved choice, else one derived from seed.
export function resolveAvatar(value, seed) {
  return parseAvatar(value) || parseAvatar(avatarFromSeed(seed));
}
