import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

/**
 * A trailing bubble around the pointer: a translucent ring that lags slightly,
 * and an opaque dot pinned to the exact pointer position.
 *
 * Position is driven entirely by motion values, never React state, so moving
 * the mouse costs zero re-renders. A useState-per-frame version of this is the
 * usual reason custom cursors feel awful on mid-range hardware.
 *
 * It disables itself when it would be unhelpful or hostile:
 *   - coarse pointers (touch), where there is no cursor to decorate
 *   - prefers-reduced-motion, where a lagging follower is exactly the problem
 *   - forced-colors / high-contrast, where the OS owns cursor rendering
 */
export default function BubbleCursor() {
  const reduce = useReducedMotion();
  // Resolved once at mount rather than set from inside an effect, which would
  // cause a cascading render on every load.
  const [envOk, setEnvOk] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: fine)').matches &&
      !window.matchMedia('(forced-colors: active)').matches
  );
  const enabled = envOk && !reduce;

  // The dot tracks the pointer exactly; the ring springs toward it.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 380, damping: 30, mass: 0.45 });
  const ringY = useSpring(y, { stiffness: 380, damping: 30, mass: 0.45 });

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const forced = window.matchMedia('(forced-colors: active)');
    const sync = () => setEnvOk(fine.matches && !forced.matches);
    fine.addEventListener('change', sync);
    forced.addEventListener('change', sync);
    return () => {
      fine.removeEventListener('change', sync);
      forced.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    // Leaving the window parks the bubble offscreen rather than freezing it.
    const leave = () => {
      x.set(-100);
      y.set(-100);
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    document.documentElement.classList.add('has-bubble-cursor');

    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      document.documentElement.classList.remove('has-bubble-cursor');
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="bubble-cursor-ring"
        style={{ x: ringX, y: ringY }}
      />
      <motion.div aria-hidden="true" className="bubble-cursor-dot" style={{ x, y }} />
    </>
  );
}
