import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpen, Pin, ExternalLink, X } from 'lucide-react';
import { getBoardPosts, initMessageBoard } from '../utils/messageBoardStore';
import { artFor } from '../utils/newsArt';

const CATEGORIES = ['All', 'Alumni Magazine', 'Spotlight', 'Events', 'Campus News'];


// Category and date on one line, above a headline.
function Kicker({ post }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-semibold text-heritage">{post.category}</span>
      <span className="text-ink-faint">{post.date}</span>
      {post.pinned && (
        <span className="flex items-center gap-1 font-medium text-ink-muted">
          <Pin className="w-3 h-3 fill-current text-action-text" /> Pinned
        </span>
      )}
    </p>
  );
}

export default function MessageBoard() {
  const reduce = useReducedMotion();
  const [posts, setPosts] = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [activeStory, setActiveStory] = useState(null);

  useEffect(() => {
    initMessageBoard().then(() => {
      setPosts(getBoardPosts());
    });
  }, []);

  // Escape closes an open story.
  useEffect(() => {
    if (!activeStory) return;
    const onKey = (e) => { if (e.key === 'Escape') setActiveStory(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeStory]);

  const filtered = selectedCat === 'All'
    ? posts
    : posts.filter(p => p.category === selectedCat);

  // The pinned story leads; otherwise the newest one does.
  const lead = filtered.find(p => p.pinned) || filtered[0];
  const rest = filtered.filter(p => p !== lead);

  const enter = (i) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.05, duration: 0.3 },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-400">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-sm font-medium text-ink-muted">Community Bulletin &amp; Gazette</p>
          <h2 className="mt-1 font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
            Alumni News
          </h2>
          <p className="mt-2 text-ink-muted">Magazine issues, alumni spotlights, events and campus news.</p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              aria-pressed={selectedCat === cat}
              className={`h-9 px-3.5 text-sm font-medium border transition-colors cursor-pointer ${
                selectedCat === cat
                  ? 'bg-ink text-canvas border-ink'
                  : 'bg-surface text-ink-muted border-rule hover:text-ink hover:border-rule-strong'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {lead && (
        <motion.article
          key={lead.id}
          {...enter(0)}
          className="group relative grid overflow-hidden bg-surface border border-rule panel md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] hover:border-rule-strong transition-colors"
        >
          <div className="aspect-[16/10] md:aspect-auto md:min-h-80 overflow-hidden bg-sunken">
            <img
              src={artFor(lead)}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
            <Kicker post={lead} />
            <h3 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-ink leading-tight">
              <button
                type="button"
                onClick={() => setActiveStory(lead)}
                className="text-left cursor-pointer after:absolute after:inset-0 focus-visible:outline-none"
              >
                {lead.title}
              </button>
            </h3>
            <p className="text-ink-muted leading-relaxed line-clamp-3">{lead.summary || lead.content}</p>
            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-sm text-ink-faint">{lead.author}</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink group-hover:text-action-text transition-colors">
                Read full story <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </motion.article>
      )}

      {rest.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, idx) => (
            <motion.article
              key={post.id}
              {...enter(idx + 1)}
              className="group relative flex flex-col overflow-hidden bg-surface border border-rule panel hover:border-rule-strong transition-colors"
            >
              <div className="aspect-[16/9] overflow-hidden bg-sunken">
                <img
                  src={artFor(post)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <Kicker post={post} />
                <h3 className="font-heading text-lg font-semibold text-ink leading-snug line-clamp-2">
                  <button
                    type="button"
                    onClick={() => setActiveStory(post)}
                    className="text-left cursor-pointer after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    {post.title}
                  </button>
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed line-clamp-2">{post.summary || post.content}</p>
                <p className="mt-auto pt-2 text-xs text-ink-faint">{post.author}</p>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-surface border border-rule p-8 panel">
          <BookOpen className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-sm font-medium text-ink-muted">No posts found in this category yet.</p>
        </div>
      )}

      {/* Full Article Modal */}
      <AnimatePresence>
        {activeStory && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs"
            onClick={(e) => { if (e.target === e.currentTarget) setActiveStory(null); }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="story-title"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-surface border border-rule w-full max-w-2xl max-h-[85vh] overflow-y-auto panel shadow-2xl relative"
            >
              <div className="aspect-[16/7] overflow-hidden bg-sunken">
                <img src={artFor(activeStory)} alt="" className="h-full w-full object-cover" />
              </div>
              <button
                onClick={() => setActiveStory(null)}
                aria-label="Close story"
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-surface/90 border border-rule text-ink hover:border-rule-strong transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 sm:p-8">
                <Kicker post={activeStory} />
                <h2 id="story-title" className="font-heading text-2xl sm:text-3xl font-semibold text-ink tracking-tight mt-2 leading-tight">
                  {activeStory.title}
                </h2>
                <p className="mt-2 text-sm text-ink-faint">By {activeStory.author}</p>

                <div className="mt-6 space-y-4 text-base text-ink leading-relaxed whitespace-pre-line">
                  {activeStory.content}
                </div>

                {activeStory.linkUrl && (
                  <div className="mt-6 pt-4 border-t border-rule flex items-center justify-between gap-4">
                    <span className="text-sm text-ink-faint">Linked resource available:</span>
                    <a
                      href={activeStory.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-action-text hover:underline"
                    >
                      <span>View original link</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
