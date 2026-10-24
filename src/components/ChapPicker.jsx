import ChapAvatar from './ChapAvatar';
import { CHAP_COLORS, CHAP_LOOKS, resolveAvatar } from '../utils/chapAvatar';

// The global `button { border-radius }` rule sits outside Tailwind's layers and
// beats rounded-full, so the round shape is set inline.
const PILL = { borderRadius: '9999px' };

// Pick a profile Chap: red or blue, then a look. `value` is "color:look".
// layout="panel" stacks a large preview above a 4-wide grid, for use as its own
// column; the default sits inline with other fields.
export default function ChapPicker({ value, onChange, seed, label = 'Pick your Chap', layout = 'inline' }) {
  const panel = layout === 'panel';
  const { color, look } = resolveAvatar(value, seed);
  const choose = (nextColor, nextLook) => onChange(`${nextColor}:${nextLook}`);

  return (
    <div className={panel ? 'flex flex-col gap-4 bg-sunken border border-rule p-5 panel' : 'flex flex-col gap-3'}>
      <div className={panel ? 'flex flex-col items-center text-center gap-3 sm:flex-row sm:text-left sm:gap-4' : 'flex items-center gap-4'}>
        <ChapAvatar avatar={`${color}:${look}`} size={panel ? 88 : 72} className="border border-rule" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-sm text-ink-faint">Your profile picture across ChapConnect.</p>
          <div role="radiogroup" aria-label="Chap colour" className={`mt-2 inline-flex rounded-full border border-rule p-0.5 ${panel ? 'bg-surface' : 'bg-sunken'}`}>
            {Object.entries(CHAP_COLORS).map(([key, c]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={color === key}
                onClick={() => choose(key, look)}
                style={PILL}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  color === key ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.fur }} aria-hidden="true" />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div role="radiogroup" aria-label="Chap look" className={panel ? 'grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-4 gap-2.5' : 'grid grid-cols-4 sm:grid-cols-8 gap-2'}>
        {CHAP_LOOKS.map(l => {
          const selected = l.key === look;
          return (
            <button
              key={l.key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={l.label}
              title={l.label}
              onClick={() => choose(color, l.key)}
              style={PILL}
              className={`aspect-square rounded-full p-0.5 cursor-pointer transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action ${
                selected ? 'ring-2 ring-action' : 'ring-1 ring-rule'
              }`}
            >
              <ChapAvatar avatar={`${color}:${l.key}`} size={44} className="w-full h-auto" title={l.label} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
