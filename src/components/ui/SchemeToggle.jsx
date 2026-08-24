import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Magnetic from './Magnetic';

/**
 * Switches between the two colour-and-type schemes: the default Chaparral
 * register (the Eanes ISD brand palette, Gotham/Montserrat) and Ivy (Newsreader
 * on cream, Ink Navy owning action with Westlake Red and Oxblood on emphasis).
 *
 * The control is a specimen of its own destination. The swatches and the "Aa"
 * are drawn in the scheme you would be switching TO, with the serif set in
 * Newsreader explicitly rather than through the token, since the token only
 * resolves once the scheme is already applied. So the button shows you the
 * answer before you commit to it, which is more useful than an icon of a
 * paintbrush.
 *
 * Scheme lives in an `.ivy` class on <html>, independent of `.dark`, and is
 * persisted under `cc_scheme`. The pre-paint script in index.html applies it
 * before first paint so there is no flash of the wrong scheme.
 */

// Previews of a scheme that is NOT currently applied, so these cannot be read
// from the cascade and are duplicated deliberately. Each trio is the three
// colours its scheme actually leads with.
const PREVIEW = {
  // Ink Navy, Oxblood, Westlake Red.
  ivy: { a: '#16233d', b: '#6e1a24', c: '#a8202f' },
  // Eanes Navy, Eanes Blue, Eanes Red, straight from the district palette.
  default: { a: '#102047', b: '#003087', c: '#A6192E' },
};

export default function SchemeToggle() {
  const reduce = useReducedMotion();
  const [ivy, setIvy] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('ivy')
  );

  useEffect(() => {
    const root = document.documentElement;
    if (ivy) root.classList.add('ivy');
    else root.classList.remove('ivy');
    try {
      localStorage.setItem('cc_scheme', ivy ? 'ivy' : 'default');
    } catch {
      /* private browsing; the scheme just will not persist */
    }
  }, [ivy]);

  // What the button offers, which is always the scheme you are not in.
  const next = ivy ? 'default' : 'ivy';
  const sw = PREVIEW[next];
  const serifNext = next === 'ivy';

  return (
    <Magnetic
      onClick={() => setIvy((v) => !v)}
      strength={3}
      tilt={1.4}
      aria-label={
        ivy ? 'Switch to the Chaparral scheme' : 'Switch to the Ivy scheme'
      }
      title={ivy ? 'Chaparral scheme' : 'Ivy scheme'}
      className="fixed top-4 right-[4.25rem] z-50 h-11 pl-2.5 pr-3 flex items-center gap-2.5 bg-surface border border-rule text-ink cursor-pointer panel"
    >
      {/* Three stacked swatches read as a bound set of colours rather than as
          a single dot, which is what makes it legible as a scheme. */}
      <span aria-hidden="true" className="flex items-center -space-x-1">
        {[sw.a, sw.c, sw.b].map((c) => (
          <motion.span
            key={c}
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: c, boxShadow: '0 0 0 1.5px var(--surface)' }}
          />
        ))}
      </span>

      {/* The type specimen. Two glyphs is enough to show serif versus sans. */}
      <span className="relative w-5 h-5 overflow-hidden" aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={next}
            initial={reduce ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 460, damping: 30 }}
            className="absolute inset-0 flex items-center justify-center text-[15px] leading-none"
            style={{
              fontFamily: serifNext
                ? "'Newsreader', Georgia, serif"
                : "'Gotham', 'Montserrat', Arial, sans-serif",
              fontStyle: serifNext ? 'italic' : 'normal',
              fontWeight: serifNext ? 500 : 600,
            }}
          >
            Aa
          </motion.span>
        </AnimatePresence>
      </span>
    </Magnetic>
  );
}
