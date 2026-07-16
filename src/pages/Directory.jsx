import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabaseClient';
import { Loader2, Search, ArrowLeft, ArrowRight } from 'lucide-react';

const PAGE_SIZE = 15;

export default function Directory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function fetchDirectory() {
      setLoading(true);
      const [alumniRes, mentorsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, name, grad_year')
          .eq('post_grad_school', 'ALUMNI_METADATA'),
        supabase
          .from('mentors')
          .select('id, name, grad_year')
      ]);

      if (alumniRes.error) console.error('Error loading alumni:', alumniRes.error);
      if (mentorsRes.error) console.error('Error loading mentors:', mentorsRes.error);

      const merged = [
        ...(alumniRes.data || []).map(r => ({ key: `a-${r.id}`, name: r.name, gradYear: r.grad_year })),
        ...(mentorsRes.data || []).map(r => ({ key: `m-${r.id}`, name: r.name, gradYear: r.grad_year }))
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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-6 flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-bold tracking-wide text-sm hover:text-blue-700 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="gradient-brand border border-white/10 rounded-2xl p-8 brutal-shadow text-white mb-8"
      >
        <h1 className="text-4xl font-bold tracking-tight mb-2">Chap Directory</h1>
        <p className="text-white/80 font-bold max-w-2xl text-sm leading-relaxed">
          Browse the full network of Westlake alumni and mentors. Search by name to find a specific Chap.
        </p>
      </motion.div>

      <div className="mb-6 relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search alumni by name..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 dark:bg-[#0c1324] font-medium"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 brutal-shadow p-10 rounded-2xl text-center">
          <p className="font-bold text-slate-700 dark:text-slate-300">
            {rows && rows.length === 0 ? 'No one in the directory yet.' : 'No one matches your search.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow overflow-hidden divide-y divide-slate-100 dark:divide-white/10">
            {current.map((r, i) => (
              <motion.div
                key={r.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.3 }}
                whileHover={{ backgroundColor: 'rgba(37,99,235,0.06)' }}
                className="flex items-center justify-between px-6 py-4"
              >
                <span className="font-bold text-slate-900 dark:text-slate-100">{r.name}</span>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                  {r.gradYear ? `Class of ${r.gradYear}` : '—'}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex items-center space-x-2 bg-white dark:bg-[#111a30] text-slate-900 dark:text-slate-100 font-bold py-2.5 px-4 border border-slate-200 dark:border-white/10 rounded-xl brutal-shadow-sm tracking-wide text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:text-blue-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <span className="text-sm font-bold tracking-wide text-slate-500 dark:text-slate-400">
              Page {safePage + 1} of {pageCount} · {filtered.length} total
            </span>

            <button
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="flex items-center space-x-2 bg-blue-600 text-white font-bold py-2.5 px-4 border border-slate-200 dark:border-white/10 rounded-xl brutal-shadow-sm tracking-wide text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-0.5 transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
