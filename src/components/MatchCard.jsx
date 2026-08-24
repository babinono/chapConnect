import React from 'react';
import { Briefcase, GraduationCap, MapPin } from 'lucide-react';

export default function MatchCard({ matchData }) {
  if (!matchData || !matchData.mentor) return null;
  const { mentor, commonThreads, isAIPowered, holisticAssessment } = matchData;
  const gradYear = mentor.grad_year || mentor.gradYear;

  const rows = [
    {
      Icon: Briefcase,
      content:
        mentor.current_position ||
        mentor.currentPosition ||
        [mentor.career, mentor.company].filter(Boolean).join(' · '),
    },
    (mentor.college || mentor.undergraduate_education) && {
      Icon: GraduationCap,
      content: mentor.college || mentor.undergraduate_education,
      sub: [mentor.first_grad_education, mentor.second_grad_education].filter(Boolean),
    },
    mentor.location && { Icon: MapPin, content: mentor.location },
  ].filter(Boolean);

  return (
    <article className="bg-surface border border-rule panel">
      <header className="flex items-start gap-5 border-b border-rule p-6">
        <img
          src={
            mentor.avatar ||
            `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(mentor.name)}`
          }
          alt=""
          className="w-16 h-16 rounded-full bg-sunken flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm text-ink-faint">The mentor</p>
          <h2 className="font-heading text-2xl font-semibold text-ink leading-tight tracking-tight">
            {mentor.name}
          </h2>
          {gradYear && (
            <p className="mt-1 text-sm text-ink-muted">
              Class of <span className="tabular text-heritage font-medium">{gradYear}</span>
            </p>
          )}
        </div>
      </header>

      <dl className="p-6 space-y-4">
        {rows.map(({ Icon, content, sub }, i) => (
          <div key={i} className="flex items-start gap-3">
            <dt className="flex-shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-ink-faint" aria-hidden="true" />
            </dt>
            <dd className="min-w-0 text-ink">
              {content}
              {sub?.map((line) => (
                <span key={line} className="block text-sm text-ink-muted">
                  {line}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-rule px-6 py-6">
        <h3 className="font-heading text-sm font-semibold text-ink">Why you match</h3>

        {isAIPowered && holisticAssessment && (
          <p className="mt-3 border-l-2 border-heritage pl-4 text-ink-muted leading-relaxed">
            {holisticAssessment}
          </p>
        )}

        <ul className="mt-4 space-y-0">
          {commonThreads?.map((thread, i) => (
            <li
              key={i}
              className="border-t border-rule py-3 text-ink leading-snug first:border-t-0 first:pt-0"
            >
              {thread}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-rule p-6">
        <a
          href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(
            `${mentor.name} ${mentor.college || ''} ${mentor.current_position || ''}`
          )}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink border-b border-rule-strong hover:border-ink pb-0.5 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
          Find on LinkedIn
        </a>
      </div>
    </article>
  );
}
