import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { selectAll } from '../utils/supabaseClient';
import { Loader2, Search, ArrowLeft, ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import SendMessageModal from '../components/SendMessageModal';
import { isContactUnlocked } from '../utils/messageRelayStore';
import ChapLogo from '../components/ChapLogo';
import ThemeControls from '../components/ui/ThemeControls';

const PAGE_SIZE = 15;

export default function Directory({ session }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [messagingTarget, setMessagingTarget] = useState(null);

  useEffect(() => {
    async function fetchDirectory() {
      setLoading(true);
      const [alumniRes, mentorsRes] = await Promise.all([
        selectAll(
          'user_profiles',
          'id, user_id, name, grad_year, email, college, major, career, company, location',
          q => q.eq('post_grad_school', 'ALUMNI_METADATA'),
        ),
        selectAll('mentors', 'id, name, grad_year, college, current_position, location, role, company'),
      ]);

      if (alumniRes.error) console.error('Error loading alumni:', alumniRes.error);
      if (mentorsRes.error) console.error('Error loading mentors:', mentorsRes.error);

      const merged = [
        ...(alumniRes.data || []).map(r => ({
          key: `a-${r.id || r.user_id}`,
          id: `a-${r.id || r.user_id}`,
          name: r.name,
          gradYear: r.grad_year,
          college: r.college,
          career: r.career || 'Westlake Alum',
          company: r.company,
          email: r.email,
          location: r.location,
        })),
        ...(mentorsRes.data || []).map(r => ({
          key: `m-${r.id}`,
          id: `m-${r.id}`,
          name: r.name,
          gradYear: r.grad_year,
          college: r.college,
          career: r.current_position || r.role || 'Established Alumni',
          company: r.company,
          email: '',
          location: r.location,
        }))
      ].filter(r => r.name).sort((a, b) => a.name.localeCompare(b.name));

      setRows(merged);
      setLoading(false);
    }
    fetchDirectory();
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(0); // jump back to the first page whenever the query changes
  };

  const q = search.trim().toLowerCase();
  const filtered = (rows || []).filter(r => !q || r.name.toLowerCase().includes(q));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const current = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="min-h-[100dvh] py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-ink-muted font-medium tracking-wide text-sm hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <ThemeControls />
          <ChapLogo className="h-8 w-auto" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="gradient-brand border border-white/10 p-8 text-white mb-8"
      >
        <h1 className="text-4xl font-semibold tracking-tight mb-2">Chap Directory</h1>
        <p className="text-white/80 font-medium max-w-2xl text-sm leading-relaxed">
          Browse the full network of Westlake alumni and mentors. Search by name to find a specific Chap.
        </p>
      </motion.div>

      <div className="mb-6 relative">
        <Search className="w-5 h-5 text-ink-faint absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search alumni by name..."
          className="w-full pl-12 pr-4 py-3 border border-rule focus:outline-none focus:border-action bg-sunken font-medium panel"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-ink-faint animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-rule p-10 text-center panel">
          <p className="font-medium text-ink-muted">
            {rows && rows.length === 0 ? 'No one in the directory yet.' : 'No one matches your search.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-surface border border-rule overflow-hidden divide-y divide-slate-100 dark:divide-white/10 panel">
            {current.map((r, i) => {
              const currentUserId = session?.user?.id || 'local_user';
              const unlocked = isContactUnlocked(currentUserId, r.id);

              return (
                <motion.div
                  key={r.key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.3 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-4 gap-3 hover:bg-sunken/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-base">{r.name}</span>
                      {r.gradYear && (
                        <span className="text-xs font-medium text-heritage tabular">
                          '{String(r.gradYear).slice(-2)}
                        </span>
                      )}
                      {unlocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Unlocked
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5 truncate flex flex-wrap gap-x-2">
                      <span>{r.career}</span>
                      {r.college && <span>· {r.college}</span>}
                      {r.location && <span>· {r.location}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setMessagingTarget(r)}
                      className="px-3.5 py-1.5 text-xs font-medium bg-sunken border border-rule hover:border-action text-ink rounded-slight flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-action-text" />
                      <span>Message</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex items-center space-x-2 bg-surface text-ink font-medium py-2.5 px-4 border border-rule tracking-wide text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink transition-colors cursor-pointer rounded-slight"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <span className="text-sm font-medium tracking-wide text-ink-faint">
              Page {safePage + 1} of {pageCount} · {filtered.length} total
            </span>

            <button
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="flex items-center space-x-2 bg-action text-action-ink font-medium py-2.5 px-4 border border-rule tracking-wide text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer rounded-slight"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Message Modal */}
          {messagingTarget && (
            <SendMessageModal
              isOpen={Boolean(messagingTarget)}
              onClose={() => setMessagingTarget(null)}
              recipient={messagingTarget}
              currentUser={session}
              defaultSubject={`ChapConnect — Greeting from ${session?.user?.user_metadata?.full_name || 'a fellow Chap'}`}
              defaultBody={`Hi ${messagingTarget.name ? messagingTarget.name.split(' ')[0] : 'there'},\n\nI came across your profile in the ChapConnect Directory and wanted to say hello! Would love to connect and hear about your journey after Westlake.`}
            />
          )}
        </>
      )}
    </div>
  );
}
