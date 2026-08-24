import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

/**
 * Tab strip whose active indicator reads like a folder tab: squared along the
 * bottom, domed across the top, and rising past the strip's own border so the
 * current section is unmistakable at a glance.
 *
 * Two motion systems, deliberately separated so they cannot fight:
 *   - `layoutId` owns the pill's POSITION between tabs. framer-motion measures
 *     it, so it never drifts the way a getBoundingClientRect-on-click plus
 *     resize-listener implementation does.
 *   - an inner element owns the magnetic RESPONSE (nudge toward the cursor,
 *     slight lift, slight swell). Layout animation and transforms on the same
 *     element conflict, hence the nesting.
 *
 * Pointer position lives in motion values, never React state, so moving the
 * mouse across the strip costs zero re-renders. Only `transform` is animated.
 *
 * items: [{ key, label, Icon }]
 */

// Wide shallow dome on top, near-square corners along the bottom edge.
const TAB_RADIUS = '38px 38px 6px 6px / 26px 26px 6px 6px';

export default function TabBar({ items, active, onChange, className = '' }) {
  const reduce = useReducedMotion();
  const stripRef = useRef(null);

  // Signed distance of the cursor from the active pill's centre, in px.
  const pointerDelta = useMotionValue(0);
  const hovering = useMotionValue(0);

  // Magnetic nudge, clamped so the pill leans toward the cursor without
  // detaching from the tab it belongs to.
  const nudge = useTransform(pointerDelta, [-160, 0, 160], [-7, 0, 7], { clamp: true });
  const x = useSpring(nudge, { stiffness: 260, damping: 26, mass: 0.5 });
  const lift = useSpring(useTransform(hovering, [0, 1], [0, -2]), {
    stiffness: 300,
    damping: 24,
  });
  const swell = useSpring(useTransform(hovering, [0, 1], [1, 1.035]), {
    stiffness: 300,
    damping: 24,
  });

  const onPointerMove = (e) => {
    if (reduce) return;
    const pill = stripRef.current?.querySelector('[data-pill]');
    if (!pill) return;
    const r = pill.getBoundingClientRect();
    pointerDelta.set(e.clientX - (r.left + r.width / 2));
    hovering.set(1);
  };

  const onPointerLeave = () => {
    pointerDelta.set(0);
    hovering.set(0);
  };

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
      ref={stripRef}
      role="tablist"
      aria-label="Sections"
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      /* The dome deliberately overhangs the top border: the pill's -top-6
         exceeds this pt-4, and overflow stays visible so it truly breaks out. */
      className={`relative inline-flex items-end gap-1.5 border border-rule bg-sunken px-2 pb-2 pt-4 panel ${className}`}
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
            className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer rounded-slight transition-colors"
          >
            {isActive && (
              <motion.span
                layoutId="tabbar-pill"
                data-pill
                aria-hidden="true"
                /* -top-6 vs the strip's pt-4 leaves 8px of dome above the border. */
                className="absolute -top-6 bottom-0 -left-1.5 -right-1.5 z-0"
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }
                }
              >
                <motion.span
                  className="navy-field absolute inset-0 origin-bottom"
                  style={
                    reduce
                      ? { borderRadius: TAB_RADIUS }
                      : { x, y: lift, scale: swell, borderRadius: TAB_RADIUS }
                  }
                />
              </motion.span>
            )}

            <span className="relative z-10 flex items-center gap-2">
              <Icon
                className={`w-4 h-4 transition-colors ${isActive ? 'text-heritage-on-navy' : 'text-ink-faint'}`}
                strokeWidth={1.75}
              />
              <span className={isActive ? 'text-on-navy' : 'text-ink-muted'}>{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
