import { motion, useReducedMotion } from 'framer-motion';

/**
 * Section tabs drawn as a nav row: labels sit on one line and a red bar slides
 * under the current one. `layoutId` owns the bar's position between tabs, so
 * it never drifts on resize. On narrow screens the row scrolls sideways rather
 * than wrapping labels onto two lines.
 *
 * Arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern).
 *
 * items: [{ key, label, Icon }]
 */
export default function TabBar({ items, active, onChange, className = '' }) {
  const reduce = useReducedMotion();

  const onKeyDown = (e) => {
    const i = items.findIndex((t) => t.key === active);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = items.length - 1;
    if (next !== null) {
      e.preventDefault();
      onChange(items[next].key);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Sections"
      onKeyDown={onKeyDown}
      className={`flex items-stretch gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {items.map(({ key, label, Icon }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(key)}
            className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium cursor-pointer transition-colors ${
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-colors ${isActive ? 'text-action-text' : 'text-ink-faint'}`}
              strokeWidth={1.75}
            />
            <span>{label}</span>
            {isActive && (
              <motion.span
                layoutId="tabbar-underline"
                initial={false}
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-px h-0.5 bg-action"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
