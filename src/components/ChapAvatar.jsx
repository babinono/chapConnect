import { useId } from 'react';
import { CHAP_COLORS, LOOKS_BY_KEY, HATS, resolveAvatar } from '../utils/chapAvatar';

// Draws a profile Chap; the looks and helpers live in utils/chapAvatar.

const BEAK = '#F2B53A';
const BEAK_DARK = '#C4861A';
const MOUTH = '#3B1416';
const TONGUE = '#F07A8A';
const BIB = '#BFC3CC';
const BIB_DARK = '#8E939E';
const INK = '#141414';

// A bumpy circle, so the head reads as fur rather than a flat disc.
function fuzzyCircle(cx, cy, r, bumps, amp) {
  let d = '';
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) { d += `M${x.toFixed(2)} ${y.toFixed(2)}`; continue; }
    const mid = a - Math.PI / bumps;
    const qx = cx + Math.cos(mid) * (r + amp);
    const qy = cy + Math.sin(mid) * (r + amp);
    d += ` Q${qx.toFixed(2)} ${qy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d + 'Z';
}

const HEAD = fuzzyCircle(50, 52, 25, 22, 2.6);
const CREST = 'M43 31 C37 17 43 6 52 3 C50 10 54 13 59 9 C61 18 58 26 57 31 Z';
const CREST_SMALL = 'M56 30 C58 22 64 18 69 18 C66 23 64 27 62 32 Z';

function Eyes({ face }) {
  if (face === 'happy') {
    return (
      <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
        <path d="M35 46 Q41 39 47 46" />
        <path d="M53 46 Q59 39 65 46" />
      </g>
    );
  }
  // Pupils sit slightly inward (friendly), or both glance right for "side".
  const shift = face === 'side' ? 2.6 : 0;
  const pr = face === 'surprised' ? 2.2 : 3.1;
  const eye = (cx, pupil) => (
    <>
      <ellipse cx={cx} cy="44.5" rx="6.6" ry="7.6" fill="#fff" stroke={INK} strokeWidth="0.9" />
      <circle cx={pupil + shift} cy="45.5" r={pr} fill={INK} />
      <circle cx={pupil + shift + 1} cy="44" r="0.9" fill="#fff" />
    </>
  );
  return (
    <g>
      {face === 'wink'
        ? <path d="M35 46 Q41 40 47 46" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        : eye(41, 41.8)}
      {eye(59, 58.2)}
    </g>
  );
}

function Beak({ face }) {
  const upper = (
    <path
      d="M29 56 C36 48.5 64 48.5 71 56 C72.5 60 69.5 62.5 66 62.5 L34 62.5 C30.5 62.5 27.5 60 29 56 Z"
      fill={BEAK}
      stroke={BEAK_DARK}
      strokeWidth="0.8"
    />
  );
  if (face === 'surprised') {
    return (
      <g>
        <ellipse cx="50" cy="67" rx="5.5" ry="5.5" fill={MOUTH} stroke={BEAK} strokeWidth="2.6" />
        {upper}
      </g>
    );
  }
  const big = face === 'grin';
  return (
    <g>
      <path d={big ? 'M33 62 C38 81 62 81 67 62 Z' : 'M35 62 C40 75 60 75 65 62 Z'} fill={MOUTH} />
      <ellipse cx="50" cy={big ? 73 : 69.5} rx={big ? 7.5 : 6} ry={big ? 3.6 : 2.6} fill={TONGUE} />
      <path
        d={big ? 'M31 62 C37 84 63 84 69 62' : 'M33 62 C38 78 62 78 67 62'}
        fill="none"
        stroke={BEAK}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {upper}
    </g>
  );
}

// Things worn at the neck, drawn before the head so the chin overlaps them.
function NeckWear({ acc, team }) {
  return (
    <g>
      {acc.includes('scarf') && (
        <g>
          <path d="M27 73 C40 81 60 81 73 73 L74 81 C60 90 40 90 26 81 Z" fill="#E8B04B" />
          <path d="M60 82 L66 98 L58 99 L54 84 Z" fill="#E8B04B" />
          <path d="M32 77 L33 83 M42 80 L42.5 86 M52 81 L52 87 M62 79 L61.5 85" stroke="#C98F2B" strokeWidth="2" />
        </g>
      )}
      {acc.includes('bandana') && (
        <g>
          <path d="M31 74 L69 74 L50 92 Z" fill={team} />
          <circle cx="44" cy="78" r="1.1" fill="#fff" />
          <circle cx="55" cy="78" r="1.1" fill="#fff" />
          <circle cx="50" cy="84" r="1.1" fill="#fff" />
        </g>
      )}
      {acc.includes('bowtie') && (
        <g>
          <path d="M50 80 L39 74 L39 86 Z M50 80 L61 74 L61 86 Z" fill={team} />
          <circle cx="50" cy="80" r="2.6" fill={team} stroke="#00000033" strokeWidth="0.8" />
        </g>
      )}
    </g>
  );
}

function FaceWear({ acc, team }) {
  return (
    <g>
      {acc.includes('facepaint') && (
        <g>
          <path d="M28.5 50 L35 49 M28 53.5 L34.5 52.5" stroke={team} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M65 49 L71.5 50 M65.5 52.5 L72 53.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}
      {acc.includes('sunglasses') && (
        <g>
          <rect x="32.5" y="39.5" width="15.5" height="10.5" rx="4" fill={INK} />
          <rect x="52" y="39.5" width="15.5" height="10.5" rx="4" fill={INK} />
          <path d="M48 43 L52 43" stroke={INK} strokeWidth="2" />
          <path d="M35 42 L39 42 M54.5 42 L58.5 42" stroke="#ffffff99" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      )}
      {acc.includes('glasses') && (
        <g fill="none" stroke="#2A2320" strokeWidth="1.6">
          <circle cx="41" cy="44.5" r="8.2" />
          <circle cx="59" cy="44.5" r="8.2" />
          <path d="M49.2 43.5 Q50 42 50.8 43.5" />
        </g>
      )}
    </g>
  );
}

function HeadWear({ acc, team, furDark }) {
  return (
    <g>
      {acc.includes('headband') && (
        <g>
          <path d="M25 40 C32 29 68 29 75 40 L75.5 34.5 C68 23.5 32 23.5 24.5 34.5 Z" fill="#fff" />
          <path d="M25 37.5 C32 27 68 27 75 37.5" fill="none" stroke={team} strokeWidth="1.8" />
        </g>
      )}
      {acc.includes('headphones') && (
        <g>
          <path d="M23 50 C21 16 79 16 77 50" fill="none" stroke="#222" strokeWidth="4" strokeLinecap="round" />
          <rect x="15.5" y="43" width="11" height="17" rx="4.5" fill="#222" />
          <rect x="73.5" y="43" width="11" height="17" rx="4.5" fill="#222" />
          <rect x="17.5" y="46" width="3" height="11" rx="1.5" fill={team} />
          <rect x="79.5" y="46" width="3" height="11" rx="1.5" fill={team} />
        </g>
      )}
      {acc.includes('gradcap') && (
        <g>
          <path d="M34 33 L66 33 L64 23 L36 23 Z" fill="#1B1F2E" />
          <path d="M50 9 L84 19 L50 29 L16 19 Z" fill="#111522" />
          <circle cx="50" cy="19" r="1.6" fill="#F2B53A" />
          <path d="M50 19 L75 23 L75 34" fill="none" stroke="#F2B53A" strokeWidth="1.5" />
          <rect x="73.3" y="33" width="3.4" height="6" rx="1" fill="#F2B53A" />
        </g>
      )}
      {acc.includes('cowboy') && (
        <g>
          <ellipse cx="50" cy="31" rx="35" ry="6.5" fill="#8B5A2B" />
          <path d="M33 31 C33 14 42 11 50 16 C58 11 67 14 67 31 Z" fill="#A86E3A" />
          <path d="M33.5 26 C42 28.5 58 28.5 66.5 26 L67 30 C58 32.5 42 32.5 33 30 Z" fill="#3B2412" />
        </g>
      )}
      {acc.includes('cap') && (
        <g>
          <path d="M26 37 C26 15 74 15 74 37 Z" fill={team} />
          <path d="M60 36 C70 33 84 34 86 38 C80 40 68 40 60 39 Z" fill={team} stroke="#00000040" strokeWidth="0.8" />
          <circle cx="50" cy="17.5" r="2" fill={team} stroke="#00000040" strokeWidth="0.8" />
          <text x="50" y="32" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="11" fill="#fff">W</text>
        </g>
      )}
      {acc.includes('beanie') && (
        <g>
          <path d="M26 37 C26 13 74 13 74 37 Z" fill={team} />
          <path d="M34 34 L34 20 M42 34 L42 16 M50 34 L50 15 M58 34 L58 16 M66 34 L66 20" stroke="#00000026" strokeWidth="1.6" />
          <rect x="24" y="31" width="52" height="8" rx="4" fill="#F4EFE4" />
          <circle cx="50" cy="12" r="5.5" fill="#F4EFE4" />
        </g>
      )}
      {acc.includes('crown') && (
        <g>
          <path d="M33 33 L33 17 L42 25 L50 11 L58 25 L67 17 L67 33 Z" fill="#F5C542" stroke="#C99A1A" strokeWidth="1" />
          <circle cx="50" cy="28" r="2.2" fill="#C8102E" />
          <circle cx="40" cy="29" r="1.6" fill="#2452C9" />
          <circle cx="60" cy="29" r="1.6" fill="#2452C9" />
        </g>
      )}
      {acc.includes('party') && (
        <g>
          <path d="M39 32 L52 4 L63 32 Z" fill="#FF6FA8" />
          <path d="M42.5 24.5 L59.5 24 M46 17 L56.5 16.5 M49 10 L53.5 9.8" stroke="#FFE066" strokeWidth="2.2" />
          <circle cx="52" cy="4" r="3.2" fill="#FFE066" />
        </g>
      )}
      {acc.includes('chef') && (
        <g>
          <circle cx="38" cy="18" r="9" fill="#fff" />
          <circle cx="50" cy="12" r="10" fill="#fff" />
          <circle cx="62" cy="18" r="9" fill="#fff" />
          <rect x="33" y="20" width="34" height="13" rx="2" fill="#fff" stroke="#E2E2E2" strokeWidth="0.8" />
          <path d="M42 22 L42 32 M50 22 L50 32 M58 22 L58 32" stroke="#E2E2E2" strokeWidth="1" />
        </g>
      )}
      {acc.includes('bow') && (
        <g>
          <path d="M63 27 L52.5 20.5 L53.5 33 Z M63 27 L73.5 20.5 L72.5 33 Z" fill="#F7A8C4" stroke="#E07FA4" strokeWidth="0.9" />
          <circle cx="63" cy="27" r="2.8" fill="#F28DB2" />
        </g>
      )}
      {acc.includes('flower') && (
        <g>
          {[0, 72, 144, 216, 288].map(a => (
            <circle
              key={a}
              cx={68 + Math.cos((a * Math.PI) / 180) * 4.6}
              cy={30 + Math.sin((a * Math.PI) / 180) * 4.6}
              r="3.6"
              fill="#FF8FB1"
            />
          ))}
          <circle cx="68" cy="30" r="2.8" fill="#FFD23F" />
        </g>
      )}
      {/* a little fur line on the crown when nothing covers it */}
      {!acc.some(a => HATS.has(a)) && !acc.includes('headband') && (
        <path d="M44 30 Q50 27 56 30" fill="none" stroke={furDark} strokeWidth="1" opacity="0.6" />
      )}
    </g>
  );
}

export default function ChapAvatar({ avatar, seed, size = 48, className = '', title }) {
  const clipId = useId();
  const { color, look } = resolveAvatar(avatar, seed);
  const c = CHAP_COLORS[color];
  const l = LOOKS_BY_KEY[look];
  const hat = l.acc.some(a => HATS.has(a));

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title || `${c.label} Chap, ${l.label}`}
      className={`rounded-full shrink-0 ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="100" height="100" fill={l.bg} />

        {/* shoulders and the grey chest bib */}
        <path d="M8 102 Q12 77 34 73 L66 73 Q88 77 92 102 Z" fill={c.fur} />
        <path d="M37 75 Q50 71 63 75 L59 102 L41 102 Z" fill={BIB} />
        <path d="M42 80 l2 3 M48 79 l2 3 M54 80 l2 3 M44 87 l2 3 M51 86 l2 3 M46 94 l2 3 M53 93 l2 3" stroke={BIB_DARK} strokeWidth="1.1" strokeLinecap="round" />

        <NeckWear acc={l.acc} team={c.team} />

        {!hat && <path d={CREST_SMALL} fill={c.fur} stroke={c.furDark} strokeWidth="0.8" />}
        {!hat && <path d={CREST} fill={c.fur} stroke={c.furDark} strokeWidth="0.8" />}
        <path d={HEAD} fill={c.fur} stroke={c.furDark} strokeWidth="0.8" />

        <FaceWear acc={l.acc.filter(a => a === 'facepaint')} team={c.team} />
        <Eyes face={l.face} />
        <Beak face={l.face} />
        <FaceWear acc={l.acc.filter(a => a !== 'facepaint')} team={c.team} />
        <HeadWear acc={l.acc} team={c.team} furDark={c.furDark} />
      </g>
    </svg>
  );
}
