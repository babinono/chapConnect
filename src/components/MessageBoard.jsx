import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Pin, Calendar, User, ExternalLink, X, Newspaper, Sparkles, Filter } from 'lucide-react';
import { getBoardPosts, initMessageBoard } from '../utils/messageBoardStore';

const CATEGORIES = ['All', 'Alumni Magazine', 'Spotlight', 'Events', 'Campus News'];

export default function MessageBoard() {
  const [posts, setPosts] = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [activeStory, setActiveStory] = useState(null);

  useEffect(() => {
    initMessageBoard().then(() => {
      setPosts(getBoardPosts());
    });
  }, []);

  const filtered = selectedCat === 'All'
    ? posts
    : posts.filter(p => p.category === selectedCat);

  return (
    <div className="space-y-8 animate-in fade-in duration-400">
      {/* Editorial Header */}
      <div className="navy-field p-8 relative">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-action uppercase mb-2">
          <Newspaper className="w-4 h-4 text-accent-navy" />
          <span className="text-on-navy-muted">Community Bulletin &amp; Gazette</span>
        </div>
        <h2 className="font-heading text-title font-semibold tracking-tight text-on-navy mb-2">
          The Alumni Message Board
        </h2>
        <p className="text-on-navy-muted max-w-prose leading-relaxed text-sm sm:text-base">
          Read highlights from the latest alumni magazine issues, graduate spotlights, campus developments, and community gatherings.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-4">
        <span className="text-xs font-medium text-ink-faint flex items-center gap-1.5 mr-2">
          <Filter className="w-3.5 h-3.5" /> Topic:
        </span>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-slight transition-all cursor-pointer ${
              selectedCat === cat
                ? 'bg-action text-action-ink shadow-xs'
                : 'bg-surface text-ink-muted border border-rule hover:text-ink'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((post, idx) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className="bg-surface border border-rule p-6 panel flex flex-col justify-between hover:border-rule-strong transition-all group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 bg-sunken border border-rule text-action tracking-wide rounded-xs">
                  {post.category}
                </span>
                <div className="flex items-center gap-3 text-xs text-ink-faint">
                  {post.pinned && (
                    <span className="flex items-center gap-1 text-action font-medium">
                      <Pin className="w-3 h-3 fill-current" /> Pinned
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {post.date}
                  </span>
                </div>
              </div>

              <h3 className="font-heading text-lg font-semibold text-ink group-hover:text-action transition-colors leading-snug mb-2">
                {post.title}
              </h3>

              <p className="text-sm text-ink-muted leading-relaxed line-clamp-3 mb-4">
                {post.summary || post.content}
              </p>
            </div>

            <div className="pt-4 border-t border-rule flex items-center justify-between gap-3 text-xs">
              <span className="text-ink-faint flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5" /> {post.author}
              </span>

              <div className="flex items-center gap-2">
                {post.linkUrl && (
                  <a
                    href={post.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-muted hover:text-action flex items-center gap-1 p-1 transition-colors"
                    title="External resource"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setActiveStory(post)}
                  className="font-medium text-action hover:text-action-hover transition-colors cursor-pointer py-1 px-2.5 bg-sunken border border-rule rounded-slight"
                >
                  Read full story
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-surface border border-rule p-8 panel">
          <BookOpen className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-sm font-medium text-ink-muted">No posts found in this category yet.</p>
        </div>
      )}

      {/* Full Article Modal */}
      <AnimatePresence>
        {activeStory && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-surface border border-rule w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 panel shadow-2xl relative"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-rule">
                <div>
                  <span className="text-xs font-semibold text-action uppercase tracking-wider">
                    {activeStory.category}
                  </span>
                  <h2 className="font-heading text-2xl font-semibold text-ink tracking-tight mt-1">
                    {activeStory.title}
                  </h2>
                  <div className="flex items-center gap-4 text-xs text-ink-faint mt-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> By {activeStory.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {activeStory.date}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveStory(null)}
                  className="p-1 text-ink-faint hover:text-ink transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-6 space-y-4 text-sm text-ink leading-relaxed whitespace-pre-line">
                {activeStory.content}
              </div>

              {activeStory.linkUrl && (
                <div className="pt-4 border-t border-rule flex items-center justify-between">
                  <span className="text-xs text-ink-faint">Linked resource available:</span>
                  <a
                    href={activeStory.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-action hover:text-action-hover"
                  >
                    <span>View original link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
