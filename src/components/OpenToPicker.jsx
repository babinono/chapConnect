import { OPEN_TO } from '../utils/openTo';

// Toggle chips for what an alum is happy to hear from other Chaps about.
export default function OpenToPicker({ value = [], onChange }) {
  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  return (
    <div role="group" aria-labelledby="open-to-label">
      <p id="open-to-label" className="label">Happy to hear from Chaps about</p>
      <div className="flex flex-wrap gap-2">
        {OPEN_TO.map(o => (
          <button key={o.id} type="button" className="chip" aria-pressed={value.includes(o.id)} onClick={() => toggle(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-faint">Optional. Shows on your card in the directory.</p>
    </div>
  );
}
