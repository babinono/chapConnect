import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Briefcase, Check, FolderHeart, GraduationCap, Link2, Mail, MapPin, UserPen } from 'lucide-react';
import ChapAvatar from './ChapAvatar';

// The Home tab's main column: alumni whose path looks like yours, so the
// network reads as alum-to-alum as much as student-to-alum. Fed by the same
// findAlumniMatches results the Directory tab shows.
const cleanThread = (t) => String(t || '').replace(/\s*\(\d+% weight\)/g, '');

// The grid always shows at least two rows (6 cells at three columns). Real
// matches come first; open cells take action tiles, and the last tile spans
// to the end of its row so the grid never has a hole.
const MIN_CELLS = 6;
const XL_SPAN = { 1: '', 2: 'xl:col-span-2', 3: 'xl:col-span-3' };
const SM_SPAN = { 1: '', 2: 'sm:col-span-2' };

export default function SimilarChaps({ matches = [], onMessage, onSeeAll, onEditProfile, limit = 6 }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const shown = matches.slice(0, limit);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions, non-secure origin): show the link to copy by hand.
      window.prompt('Copy this link to invite a classmate:', window.location.origin);
    }
  };

  const tiles = [
    { key: 'profile', Icon: UserPen, title: 'Find more Chaps', body: 'Your college, major, field and city drive who shows up here.', cta: 'Update your profile', onClick: onEditProfile },
    { key: 'invite', Icon: copied ? Check : Link2, title: 'Invite a classmate', body: "Know a Chap who isn't here yet? Send them the link.", cta: copied ? 'Link copied' : 'Copy invite link', onClick: copyInvite },
    { key: 'directory', Icon: FolderHeart, title: 'Browse the directory', body: 'Search every Chap by college, company, class or city.', cta: 'Open the directory', onClick: onSeeAll },
  ].slice(0, Math.max(0, MIN_CELLS - shown.length));
  const total = shown.length + tiles.length;
  const xlRem = total % 3 === 0 ? 0 : 3 - (total % 3);
  const smRem = total % 2;

  return (
    <section aria-labelledby="similar-chaps-title">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 id="similar-chaps-title" className="font-heading text-2xl font-semibold tracking-tight text-ink">
            Chaps like you
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Matched on college, major, field and city.</p>
        </div>
        {matches.length > 0 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-action-text hover:underline cursor-pointer"
          >
            <span>Browse the directory</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {(
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((m, idx) => {
            const c = m.candidate;
            const role = [c.primaryCareer, c.company].filter(Boolean).join(' @ ');
            const school = [c.primarySchool, c.primaryMajor && `(${c.primaryMajor})`].filter(Boolean).join(' ');
            return (
              <motion.li
                key={c.id || idx}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                className="flex flex-col bg-surface border border-rule p-4 panel hover:border-rule-strong transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ChapAvatar avatar={c.avatar} seed={c.id || c.name} size={44} className="border border-rule" />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink leading-tight truncate">{c.name}</p>
                    {c.gradYear && (
                      <p className="text-xs text-ink-faint mt-0.5">
                        Class of <span className="tabular text-heritage font-medium">{c.gradYear}</span>
                      </p>
                    )}
                  </div>
                </div>

                <dl className="mt-3 flex-1 space-y-1 text-sm text-ink-muted">
                  {role && (
                    <div className="flex items-center gap-2 min-w-0">
                      <dt className="sr-only">Role</dt>
                      <Briefcase className="w-4 h-4 text-ink-faint shrink-0" strokeWidth={1.75} />
                      <dd className="truncate">{role}</dd>
                    </div>
                  )}
                  {school && (
                    <div className="flex items-center gap-2 min-w-0">
                      <dt className="sr-only">School</dt>
                      <GraduationCap className="w-4 h-4 text-ink-faint shrink-0" strokeWidth={1.75} />
                      <dd className="truncate">{school}</dd>
                    </div>
                  )}
                  {c.location && (
                    <div className="flex items-center gap-2 min-w-0">
                      <dt className="sr-only">Location</dt>
                      <MapPin className="w-4 h-4 text-ink-faint shrink-0" strokeWidth={1.75} />
                      <dd className="truncate">{c.location}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 pt-3 flex items-center justify-between gap-3 border-t border-rule">
                  {m.threads?.[0] ? (
                    <p className="min-w-0 text-xs text-ink-muted line-clamp-2">{cleanThread(m.threads[0])}</p>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={() => onMessage(m)}
                    className="shrink-0 h-9 px-3 border border-rule bg-surface text-sm font-medium text-ink hover:border-action hover:text-action-text transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" strokeWidth={1.75} />
                    <span>Message {c.name.split(' ')[0]}</span>
                  </button>
                </div>
              </motion.li>
            );
          })}
          {tiles.map((t, i) => {
            const last = i === tiles.length - 1;
            return (
              <li
                key={t.key}
                className={`flex flex-col border border-dashed border-rule-strong p-5 panel ${last ? `${XL_SPAN[1 + xlRem]} ${SM_SPAN[1 + smRem]}` : ''}`}
              >
                <t.Icon className="w-5 h-5 text-heritage" strokeWidth={1.75} aria-hidden="true" />
                <p className="mt-3 font-semibold text-ink">{t.title}</p>
                <p className="mt-1 text-sm text-ink-muted">{t.body}</p>
                <button
                  type="button"
                  onClick={t.onClick}
                  aria-live={t.key === 'invite' ? 'polite' : undefined}
                  className="mt-auto pt-3 self-start text-sm font-medium text-action-text hover:underline cursor-pointer"
                >
                  {t.cta}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
