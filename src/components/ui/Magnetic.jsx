import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

/**
 * A control that leans toward the cursor and flexes very slightly as it does.
 *
 * The character comes from three tiny transforms layered together, not from one
 * large one: a lean toward the pointer, a fractional tilt in the direction of
 * travel, and a small swell. Individually none of them is noticeable; together
 * the control feels like it is paying attention.
 *
 * Pointer position lives in motion values, so moving across a button costs zero
 * re-renders. Only `transform` is animated, so it stays on the compositor.
 * Under `prefers-reduced-motion` every transform is dropped and this renders as
 * an ordinary element.
 *
 * Usage: <Magnetic className="..." onClick={...}>Continue</Magnetic>
 *        <Magnetic as="a" href="..." strength={4}>Visit</Magnetic>
 */

const TAGS = { button: motion.button, a: motion.a };

export default function Magnetic({
  as = 'button',
  strength = 5,
  tilt = 1.1,
  swell = 1.02,
  className = '',
  children,
  ...rest
}) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const Tag = TAGS[as] || motion.button;

  // Cursor offset from the control's centre, normalised to -1..1.
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);
  const active = useMotionValue(0);

  const spring = { stiffness: 300, damping: 22, mass: 0.4 };
  const x = useSpring(useTransform(nx, [-1, 1], [-strength, strength]), spring);
  const y = useSpring(useTransform(ny, [-1, 1], [-strength * 0.6, strength * 0.6]), spring);
  const rotate = useSpring(useTransform(nx, [-1, 1], [-tilt, tilt]), spring);
  const scale = useSpring(useTransform(active, [0, 1], [1, swell]), spring);

  const onPointerMove = (e) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Clamped so a wide control does not produce an exaggerated lean at its edges.
    nx.set(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))));
    ny.set(Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))));
    active.set(1);
  };

  const reset = () => {
    nx.set(0);
    ny.set(0);
    active.set(0);
  };

  return (
    <Tag
      ref={ref}
      className={className}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onBlur={reset}
      style={reduce ? undefined : { x, y, rotate, scale }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
