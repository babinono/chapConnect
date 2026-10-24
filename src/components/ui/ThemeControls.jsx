import SchemeToggle from './SchemeToggle';
import ThemeToggle from '../ThemeToggle';

// The scheme and light/dark switches as one group. Pages place it in their own
// header row rather than floating it over content.
export default function ThemeControls({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SchemeToggle />
      <ThemeToggle />
    </div>
  );
}
