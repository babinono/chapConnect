// The ChapConnect mark: two open rings, navy and red, hooked through each
// other. Colours come from the --logo-* tokens so the mark follows the scheme
// and theme; pass onNavy on the navy field.
export default function ChapLogo({ onNavy = false, className = 'h-8 w-auto', title = 'ChapConnect' }) {
  const a = onNavy ? 'var(--logo-a-on-navy)' : 'var(--logo-a)';
  const b = onNavy ? 'var(--logo-b-on-navy)' : 'var(--logo-b)';
  return (
    <svg viewBox="14 28 332 224" className={className} role="img" aria-label={title}>
      <path d="M215 140 A90 90 0 1 0 125 230" fill="none" stroke={a} strokeWidth="36" />
      <path d="M235 50 A90 90 0 1 1 145 140" fill="none" stroke={b} strokeWidth="36" />
    </svg>
  );
}
