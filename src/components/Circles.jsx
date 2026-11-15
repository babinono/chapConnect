import ChapAvatar from './ChapAvatar';

import { CIRCLES, inCircle } from '../utils/circles';

export default function Circles({ matches = [], me = {}, onOpen }) {
  const circles = CIRCLES
    .map(circle => ({ ...circle, members: matches.filter(m => inCircle(m, circle.key)) }))
    .filter(circle => circle.members.length > 0);
  if (circles.length === 0) return null;

  return (
    <section aria-labelledby="circles-title">
      <h2 id="circles-title" className="font-heading text-2xl font-semibold tracking-tight text-ink mb-4">
        Your circles
      </h2>
      <ul className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {circles.map(({ key, label, note, members }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => onOpen(key)}
              className="group flex h-full w-full flex-col items-start gap-3 bg-surface border border-rule p-4 text-left panel cursor-pointer hover:border-rule-strong transition-colors"
            >
              <span className="flex items-baseline gap-2">
                <span className="wordmark text-3xl leading-none text-heritage tabular">{members.length}</span>
                <span className="text-sm text-ink-muted">{members.length === 1 ? 'Chap' : 'Chaps'}</span>
              </span>
              <span className="min-w-0 max-w-full">
                <span className="block truncate font-semibold text-ink group-hover:text-action-text transition-colors">
                  {label(members[0].candidate, me)}
                </span>
                <span className="block text-sm text-ink-muted">{note}</span>
              </span>
              <span className="mt-auto flex -space-x-2" aria-hidden="true">
                {members.slice(0, 5).map((m, i) => (
                  <ChapAvatar key={m.candidate.id || i} avatar={m.candidate.avatar} seed={m.candidate.id || m.candidate.name} size={28} className="border-2 border-surface" />
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
