import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabaseClient';
import ContactDrawer from '../components/ContactDrawer';
import DonationModal from '../components/DonationModal';
import {
  getDonations, seedIfEmpty, addDonation, deleteDonation, totalRaised, donorIds,
  totalsByContact, totalsByYear, totalsByCampaign, money, CAMPAIGNS, initCRM,
} from '../utils/crmStore';
import {
  Loader2, Search, ArrowLeft, Download, Users, Mail, MessageSquare, ChevronUp, ChevronDown,
  ShieldCheck, LayoutDashboard, Table2, DollarSign, Plus, Trash2, TrendingUp, HeartHandshake,
} from 'lucide-react';

const PAGE_SIZE = 25;

// Categorical palette for charts (brand-aligned, accessible contrast).
const CHART_COLORS = ['#1e3a8a', '#c8102e', '#2563eb', '#0891b2', '#7c3aed', '#d97706'];

// Contact columns — single source of truth for the Contacts table + CSV export.
const COLUMNS = [
  { key: 'name', label: 'Name', get: r => r.name },
  { key: 'source', label: 'Type', get: r => r.source },
  { key: 'grad_year', label: 'Class', get: r => r.grad_year || '' },
  { key: 'lifetime', label: 'Lifetime Giving', get: r => (r.lifetime ? money(r.lifetime) : '') },
  { key: 'status', label: 'Status', get: r => r.status },
  { key: 'email', label: 'Email', get: r => r.email },
  { key: 'college', label: 'Undergrad', get: r => r.college },
  { key: 'major', label: 'Major', get: r => r.major },
  { key: 'education', label: 'Further Education', get: r => r.education },
  { key: 'company', label: 'Company', get: r => r.company },
  { key: 'career', label: 'Position', get: r => r.career },
  { key: 'location', label: 'Location', get: r => r.location },
  { key: 'contact', label: 'Preferred Contact', get: r => r.contact },
  { key: 'newsletter', label: 'Newsletter', get: r => r.newsletter },
  { key: 'studentContact', label: 'Student Contact', get: r => r.studentContact },
  { key: 'joined', label: 'Joined', get: r => r.joined },
];

const csvEscape = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function downloadCSV(filename, header, rows) {
  const csv = header.join(',') + '\n' + rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminCRM() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');
  const [tick, setTick] = useState(0); // bump to re-read crmStore after mutations

  // contacts controls
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [donorOnly, setDonorOnly] = useState(false);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState(1);
  const [page, setPage] = useState(0);

  // donations controls
  const [campaignFilter, setCampaignFilter] = useState('all');

  // ui
  const [drawer, setDrawer] = useState(null);
  const [modal, setModal] = useState(null); // { fixedContact } | {}

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [alumniRes, mentorsRes] = await Promise.all([
        supabase.from('user_profiles')
          .select('id, name, grad_year, email, college, major, career, company, location, post_grad_program, created_at')
          .eq('post_grad_school', 'ALUMNI_METADATA'),
        supabase.from('mentors').select('id, name, grad_year, college, education, current_position, location, role'),
      ]);
      const alumni = (alumniRes.data || []).map(r => {
        let m = {}; try { m = JSON.parse(r.post_grad_program || '{}'); } catch (e) { /* ignore */ }
        const edu = Array.isArray(m.education) && m.education.length
          ? m.education.map(e => (e.degree ? `${e.school} (${e.degree})` : e.school)).filter(Boolean).join('; ')
          : [m.firstGrad, m.secondGrad].filter(Boolean).join('; ');
        const working = m.working === true || m.status === 'working';
        return {
          id: `a-${r.id}`, source: 'Alumni', name: r.name || '', grad_year: r.grad_year || '',
          status: m.status ? (working ? 'Working' : 'Not working') : '', email: r.email || '',
          college: r.college || '', major: r.major || '', education: edu || '', company: r.company || '',
          career: r.career || '', location: r.location || '',
          contact: m.contactInfo ? `${m.contactPlatform ? m.contactPlatform + ': ' : ''}${m.contactInfo}` : '',
          newsletter: m.newsletterConsent ? 'Yes' : 'No', studentContact: m.contactConsent ? 'Yes' : 'No',
          joined: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
        };
      });
      const mentors = (mentorsRes.data || []).map(r => ({
        id: `m-${r.id}`, source: 'Mentor', name: r.name || '', grad_year: r.grad_year || '',
        status: r.role || 'Mentor', email: '', college: r.college || '', major: '', education: r.education || '',
        company: '', career: r.current_position || '', location: r.location || '', contact: '',
        newsletter: '—', studentContact: '—', joined: '',
      }));
      const all = [...alumni, ...mentors];
      await initCRM();      // hydrate donations/notes/tags cache (Supabase or localStorage)
      seedIfEmpty(all);
      setContacts(all);
      setLoading(false);
      setTick(t => t + 1);  // recompute donation-derived memos now the cache is loaded
    }
    load();
  }, []);

  const donations = useMemo(() => getDonations(), [tick]);
  const byContact = useMemo(() => totalsByContact(donations), [donations]);
  const contactsById = useMemo(() => {
    const m = {}; (contacts || []).forEach(c => { m[c.id] = c; }); return m;
  }, [contacts]);

  // augment contacts with lifetime giving
  const augmented = useMemo(
    () => (contacts || []).map(c => ({ ...c, lifetime: byContact[c.id] || 0 })),
    [contacts, byContact]
  );

  const donors = donorIds(donations);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = augmented.filter(r => {
      if (typeFilter !== 'all' && r.source !== typeFilter) return false;
      if (donorOnly && !donors.has(r.id)) return false;
      if (!q) return true;
      return COLUMNS.some(c => String(c.get(r) ?? '').toLowerCase().includes(q));
    });
    const col = COLUMNS.find(c => c.key === sortKey) || COLUMNS[0];
    list = [...list].sort((a, b) => {
      if (sortKey === 'grad_year') return ((Number(a.grad_year) || 0) - (Number(b.grad_year) || 0)) * sortDir;
      if (sortKey === 'lifetime') return ((a.lifetime || 0) - (b.lifetime || 0)) * sortDir;
      return String(col.get(a)).localeCompare(String(col.get(b))) * sortDir;
    });
    return list;
  }, [augmented, search, typeFilter, donorOnly, sortKey, sortDir, donors]);

  const stats = useMemo(() => {
    const alum = augmented.filter(r => r.source === 'Alumni');
    return {
      total: augmented.length,
      alumni: alum.length,
      raised: totalRaised(donations),
      donors: donors.size,
      avg: donations.length ? Math.round(totalRaised(donations) / donations.length) : 0,
      newsletter: alum.filter(r => r.newsletter === 'Yes').length,
      contactable: alum.filter(r => r.studentContact === 'Yes').length,
      gifts: donations.length,
    };
  }, [augmented, donations, donors]);

  const yearData = useMemo(() => {
    const m = totalsByYear(donations);
    return Object.keys(m).sort().map(y => ({ label: y, value: m[y] }));
  }, [donations]);
  const campaignData = useMemo(() => {
    const m = totalsByCampaign(donations);
    return CAMPAIGNS.map(c => ({ label: c, value: m[c] || 0 })).sort((a, b) => b.value - a.value);
  }, [donations]);
  const topDonors = useMemo(() => {
    return Object.entries(byContact)
      .map(([id, v]) => ({ id, name: contactsById[id]?.name || 'Unknown', value: v }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [byContact, contactsById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const currentRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const filteredDonations = useMemo(
    () => campaignFilter === 'all' ? donations : donations.filter(d => d.campaign === campaignFilter),
    [donations, campaignFilter]
  );

  const toggleSort = (key) => { if (sortKey === key) setSortDir(d => -d); else { setSortKey(key); setSortDir(1); } };
  const changed = () => setTick(t => t + 1);
  const saveDonation = (d) => { addDonation(d); setModal(null); changed(); };

  const deleteContact = async (contact) => {
    if (!window.confirm(`Permanently delete ${contact.name}? This removes their record from the database and cannot be undone.`)) return;
    const rawId = contact.id.replace(/^[am]-/, '');
    const table = contact.source === 'Alumni' ? 'user_profiles' : 'mentors';
    const { error } = await supabase.from(table).delete().eq('id', rawId);
    if (error) {
      alert('Delete failed: ' + error.message);
      return;
    }
    setContacts(prev => (prev || []).filter(c => c.id !== contact.id));
    setDrawer(null);
  };

  const exportContacts = () => downloadCSV(
    `chap-connect-contacts-${new Date().toISOString().slice(0, 10)}.csv`,
    COLUMNS.map(c => c.label),
    filtered.map(r => COLUMNS.map(c => c.get(r)))
  );
  const exportDonations = () => downloadCSV(
    `chap-connect-donations-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Donor', 'Amount', 'Date', 'Campaign', 'Method', 'Note'],
    filteredDonations.map(d => [d.contactName, d.amount, d.date, d.campaign, d.method, d.note])
  );

  const TABS = [
    { key: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { key: 'contacts', label: 'Contacts', Icon: Table2 },
    { key: 'donations', label: 'Donations', Icon: DollarSign },
  ];

  const maxYear = Math.max(1, ...yearData.map(d => d.value));
  const maxCamp = Math.max(1, ...campaignData.map(d => d.value));
  const maxTop = Math.max(1, ...topDonors.map(d => d.value));

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <button onClick={() => navigate('/')} className="mb-6 flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-bold tracking-wide text-sm hover:text-blue-700 transition-colors cursor-pointer">
        <ArrowLeft className="w-5 h-5" /><span>Exit Admin</span>
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="gradient-brand border border-white/10 rounded-2xl p-8 brutal-shadow text-white mb-6"
      >
        <div className="inline-flex items-center space-x-2 bg-white/15 border border-white/20 px-3 py-1 rounded-md text-xs font-bold tracking-wide mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /><span>Admin Access</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Alumni CRM</h1>
        <p className="text-white/80 font-bold text-sm mt-1">Manage the network, track engagement, and grow donations — all in one place.</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 cursor-pointer transition-all ${view === t.key ? 'bg-blue-700 text-white brutal-shadow-sm' : 'bg-white dark:bg-[#111a30] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:text-blue-700'}`}>
            <t.Icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>

            {/* ===================== OVERVIEW ===================== */}
            {view === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Raised', value: money(stats.raised), Icon: TrendingUp, accent: 'text-green-600 dark:text-green-400' },
                    { label: 'Donors', value: stats.donors, Icon: HeartHandshake, accent: 'text-red-600 dark:text-red-400' },
                    { label: 'Avg Gift', value: money(stats.avg), Icon: DollarSign, accent: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Total Gifts', value: stats.gifts, Icon: DollarSign, accent: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Total Records', value: stats.total, Icon: Users, accent: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Registered Alumni', value: stats.alumni, Icon: ShieldCheck, accent: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Newsletter Opt-ins', value: stats.newsletter, Icon: Mail, accent: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Contactable', value: stats.contactable, Icon: MessageSquare, accent: 'text-blue-600 dark:text-blue-400' },
                  ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-xl brutal-shadow-sm p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">{s.label}</span>
                        <s.Icon className={`w-4 h-4 ${s.accent}`} />
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Giving by year */}
                  <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow p-6">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-5">Giving by Year</h3>
                    {yearData.length === 0 ? <p className="text-sm text-slate-400">No donations yet.</p> : (
                      <div className="flex items-end gap-4 h-44" role="img" aria-label={`Giving by year: ${yearData.map(d => `${d.label} ${money(d.value)}`).join(', ')}`}>
                        {yearData.map((d) => (
                          <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.value)}</span>
                            <motion.div title={`${d.label}: ${money(d.value)}`} className="w-full rounded-t-lg bg-blue-700 dark:bg-blue-500"
                              initial={{ height: 0 }} animate={{ height: `${(d.value / maxYear) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ minHeight: 4 }} />
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">{d.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* By campaign */}
                  <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow p-6">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-5">Giving by Campaign</h3>
                    <div className="space-y-3">
                      {campaignData.map((d, i) => (
                        <div key={d.label}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700 dark:text-slate-300">{d.label}</span>
                            <span className="text-slate-500 dark:text-slate-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.value)}</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              initial={{ width: 0 }} animate={{ width: `${(d.value / maxCamp) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top donors */}
                <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow p-6">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-5">Top Donors</h3>
                  {topDonors.length === 0 ? <p className="text-sm text-slate-400">No donations yet.</p> : (
                    <div className="space-y-3">
                      {topDonors.map((d, i) => (
                        <div key={d.id} className="flex items-center gap-3">
                          <span className="w-6 text-sm font-bold text-slate-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                          <button onClick={() => setDrawer(contactsById[d.id])} className="w-40 shrink-0 text-left text-sm font-bold text-slate-900 dark:text-slate-100 truncate hover:text-blue-700 cursor-pointer">{d.name}</button>
                          <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                            <motion.div className="h-full rounded-full bg-red-600" initial={{ width: 0 }} animate={{ width: `${(d.value / maxTop) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                          </div>
                          <span className="w-20 text-right text-sm font-bold text-slate-700 dark:text-slate-300" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================== CONTACTS ===================== */}
            {view === 'contacts' && (
              <div>
                <div className="flex flex-col md:flex-row gap-3 mb-5">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search any field..."
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-white dark:bg-[#111a30] font-medium" />
                  </div>
                  <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                    className="px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111a30] font-bold cursor-pointer">
                    <option value="all">All Types</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Mentor">Mentors</option>
                  </select>
                  <button onClick={() => { setDonorOnly(v => !v); setPage(0); }}
                    className={`px-4 py-3 rounded-xl border font-bold cursor-pointer flex items-center gap-2 ${donorOnly ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-[#111a30] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'}`}>
                    <HeartHandshake className="w-4 h-4" /> Donors only
                  </button>
                  <button onClick={exportContacts} className="px-4 py-3 rounded-xl bg-slate-900 dark:bg-white/10 text-white font-bold cursor-pointer flex items-center gap-2 hover:translate-y-[1px]">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                </div>

                <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-brand-navy text-white text-xs tracking-wide">
                        <tr>
                          {COLUMNS.map(c => (
                            <th key={c.key} onClick={() => toggleSort(c.key)} className="px-4 py-3 font-bold cursor-pointer select-none hover:bg-white/10">
                              <span className="inline-flex items-center gap-1">{c.label}{sortKey === c.key && (sortDir === 1 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {currentRows.map(r => (
                          <tr key={r.id} onClick={() => setDrawer(r)} className="font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                            {COLUMNS.map(c => {
                              const v = c.get(r);
                              if (c.key === 'name') return <td key={c.key} className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{v}</td>;
                              if (c.key === 'lifetime') return <td key={c.key} className="px-4 py-3 font-bold text-green-600 dark:text-green-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{v || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>;
                              if (c.key === 'source') return <td key={c.key} className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${r.source === 'Alumni' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'}`}>{r.source}</span></td>;
                              if (c.key === 'newsletter' || c.key === 'studentContact') { const col = v === 'Yes' ? 'text-green-600 dark:text-green-400' : v === 'No' ? 'text-slate-400' : 'text-slate-300 dark:text-slate-600'; return <td key={c.key} className={`px-4 py-3 font-bold ${col}`}>{v}</td>; }
                              return <td key={c.key} className="px-4 py-3 max-w-[220px] truncate" title={String(v || '')}>{v || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0} className="bg-white dark:bg-[#111a30] text-slate-900 dark:text-slate-100 font-bold py-2 px-4 border border-slate-200 dark:border-white/10 rounded-xl brutal-shadow-sm text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Prev</button>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Page {safePage + 1} / {pageCount}</span>
                    <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1} className="bg-blue-600 text-white font-bold py-2 px-4 border border-slate-200 dark:border-white/10 rounded-xl brutal-shadow-sm text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Next</button>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== DONATIONS ===================== */}
            {view === 'donations' && (
              <div>
                <div className="flex flex-col md:flex-row gap-3 mb-5">
                  <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(totalRaised(filteredDonations))}</span>
                    <span className="text-slate-400 font-medium text-sm">· {filteredDonations.length} gifts</span>
                  </div>
                  <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111a30] font-bold cursor-pointer">
                    <option value="all">All Campaigns</option>
                    {CAMPAIGNS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex-1" />
                  <button onClick={exportDonations} className="px-4 py-3 rounded-xl bg-slate-900 dark:bg-white/10 text-white font-bold cursor-pointer flex items-center gap-2 hover:translate-y-[1px]"><Download className="w-4 h-4" /> CSV</button>
                  <button onClick={() => setModal({})} className="px-4 py-3 rounded-xl bg-green-600 text-white font-bold cursor-pointer flex items-center gap-2 brutal-shadow hover:translate-y-[1px]"><Plus className="w-4 h-4" /> Log Donation</button>
                </div>

                <div className="bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-brand-navy text-white text-xs tracking-wide">
                        <tr>
                          <th className="px-4 py-3 font-bold">Donor</th><th className="px-4 py-3 font-bold">Amount</th>
                          <th className="px-4 py-3 font-bold">Date</th><th className="px-4 py-3 font-bold">Campaign</th>
                          <th className="px-4 py-3 font-bold">Method</th><th className="px-4 py-3 font-bold">Note</th><th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {filteredDonations.length === 0 ? (
                          <tr><td colSpan="7" className="px-4 py-10 text-center font-bold text-slate-400">No donations yet. Click "Log Donation" to add one.</td></tr>
                        ) : filteredDonations.map(d => (
                          <tr key={d.id} className="font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{d.contactName}</td>
                            <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.amount)}</td>
                            <td className="px-4 py-3">{d.date}</td>
                            <td className="px-4 py-3">{d.campaign}</td>
                            <td className="px-4 py-3">{d.method}</td>
                            <td className="px-4 py-3 max-w-[220px] truncate" title={d.note}>{d.note || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                            <td className="px-4 py-3"><button onClick={() => { deleteDonation(d.id); changed(); }} className="text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {drawer && (
          <ContactDrawer key="drawer" contact={drawer} onClose={() => setDrawer(null)} onChanged={changed}
            onAddDonation={(c) => setModal({ fixedContact: c })} onDelete={deleteContact} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {modal && (
          <DonationModal key="modal" contacts={contacts || []} fixedContact={modal.fixedContact || null}
            onClose={() => setModal(null)} onSave={saveDonation} />
        )}
      </AnimatePresence>
    </div>
  );
}
