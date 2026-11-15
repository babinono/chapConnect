// Class year as a varsity-style patch: ’15 in the wordmark slab. The full
// "Class of 2015" stays available to screen readers and on hover.
export default function ClassBadge({ year, onNavy = false, className = '' }) {
  const y = parseInt(year, 10);
  if (!y) return null;
  return (
    <span
      title={`Class of ${y}`}
      className={`class-badge ${onNavy ? 'class-badge-on-navy' : ''} ${className}`}
    >
      <span aria-hidden="true">’{String(y).slice(-2)}</span>
      <span className="sr-only">Class of {y}</span>
    </span>
  );
}
