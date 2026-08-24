import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, selectAll } from '../utils/supabaseClient';
import ContactDrawer from '../components/ContactDrawer';
import DonationModal from '../components/DonationModal';
import {
  getDonations, seedIfEmpty, addDonation, deleteDonation, totalRaised, donorIds,
  totalsByContact, totalsByYear, totalsByCampaign, money, CAMPAIGNS, initCRM,
  crmMode, seedSupabaseDemo,
} from '../utils/crmStore';
import {
  byCohort, byCampaign, byCity, byMethod, byIndustry, byCollege, monthSeries,
  retentionByYear, lapsedDonors, insights,
} from '../utils/crmAnalytics';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Database,
  DollarSign,
  Download,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LineChart,
  Loader2,
  MapPin,
  PhoneCall,
  Plus,
  Repeat,
  School,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import TabBar from '../components/ui/TabBar';

const PAGE_SIZE = 25;

// Categorical palette for charts (brand-aligned, accessible contrast).
// Theme-aware categorical series (see index.css). Never red — red means action.
const CHART_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)'];

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

const pctText = (v) => `${Math.round((v || 0) * 100)}%`;
// Signed growth text; null means not enough years of history to claim a trend.
const growthText = (g) => (g == null ? '-' : `${g >= 0 ? '+' : ''}${Math.round(g * 100)}%`);

// Card shell used by every trend panel.
function Panel({ title, subtitle, Icon, children }) {
  return (
    <div className="bg-surface border border-rule p-6 panel">
      <div className="flex items-start gap-3 mb-5">
        {Icon && <Icon className="w-5 h-5 text-ink mt-0.5 shrink-0" />}
        <div>
          <h3 className="font-medium text-ink">{title}</h3>
          {subtitle && <p className="text-xs font-medium text-ink-faint mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// Compact analysis table. `cols` = [{ label, get, align, strong }].
function TrendTable({ cols, rows, empty = 'Not enough data yet.' }) {
  if (!rows.length) return <p className="text-sm text-ink-faint">{empty}</p>;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="text-xs tracking-wide text-ink-faint border-b border-rule">
            {cols.map(c => <th key={c.label} className={`px-2 py-2 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
          {rows.map((r, i) => (
            <tr key={r.key || i} className="font-medium text-ink-muted">
              {cols.map(c => (
                <td key={c.label} className={`px-2 py-2.5 ${c.align === 'right' ? 'text-right' : ''} ${c.strong ? 'font-medium text-ink' : ''}`}
                  style={c.align === 'right' ? { fontVariantNumeric: 'tabular-nums' } : undefined}>
                  {c.get(r, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Horizontal proportional bar. No filled background track: the bar itself is
// the whole signal, and a heavy grey track behind it is dashboard clutter.
function Bar({ value, max, color = 'var(--series-1)' }) {
  return (
    <div className="h-1.5 w-full min-w-[60px] overflow-hidden">
      <motion.div
        className="h-full panel"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
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
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Paged: the mentors table is already past PostgREST's 1000-row ceiling.
      const [alumniRes, mentorsRes] = await Promise.all([
        selectAll(
          'user_profiles',
          'id, name, grad_year, email, college, major, career, company, location, post_grad_program, created_at',
          q => q.eq('post_grad_school', 'ALUMNI_METADATA'),
        ),
        selectAll('mentors', 'id, name, grad_year, college, education, current_position, location, role'),
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
        newsletter: '-', studentContact: '-', joined: '',
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

  /* ---------- Trend analysis (see utils/crmAnalytics.js) ---------- */
  // Cohort/city cuts join gifts back onto contacts, so they need `augmented`.
  const cohortData = useMemo(() => byCohort(donations, augmented), [donations, augmented]);
  const campaignPerf = useMemo(() => byCampaign(donations), [donations]);
  // Require 2+ alumni in a city before showing it — a single person is a name,
  // not a market, and surfacing them here would out an individual's giving.
  const cityData = useMemo(() => byCity(donations, augmented, 2), [donations, augmented]);
  const methodData = useMemo(() => byMethod(donations), [donations]);
  // Career fields with at least 3 people — a one-person "industry" is a person.
  const industryData = useMemo(() => byIndustry(donations, augmented, 3), [donations, augmented]);
  const collegeData = useMemo(() => byCollege(donations, augmented, 4), [donations, augmented]);
  const lapsed = useMemo(() => lapsedDonors(donations, augmented), [donations, augmented]);
  const monthData = useMemo(() => monthSeries(donations), [donations]);
  const retention = useMemo(() => retentionByYear(donations), [donations]);
  const headlines = useMemo(() => insights(donations, augmented), [donations, augmented]);

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

  // Writes the deterministic demo history (utils/demoDonations.js) to Supabase.
  // Explicit and confirmed — synthetic gifts should never land in a donations
  // table by accident.
  const seedDemo = async () => {
    if (!window.confirm(
      `Generate the demo giving history for all ${contacts?.length || 0} people and REPLACE everything currently in the donations table?\n\n` +
      'The data is derived from each person\'s real grad year, city, college and career, and is identical every time you run it.'
    )) return;
    setSeeding(true);
    try {
      const { inserted } = await seedSupabaseDemo(contacts || [], { replace: true });
      changed();
      alert(`Seeded ${inserted} donations to Supabase.`);
    } catch (err) {
      alert('Seeding failed: ' + (err?.message || err));
    } finally {
      setSeeding(false);
    }
  };

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
    { key: 'trends', label: 'Trends', Icon: LineChart },
  ];

  const maxYear = Math.max(1, ...yearData.map(d => d.value));
  const maxCamp = Math.max(1, ...campaignData.map(d => d.value));
  const maxTop = Math.max(1, ...topDonors.map(d => d.value));

  return (
    <div className="min-h-[100dvh] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <button onClick={() => navigate('/')} className="mb-6 flex items-center space-x-2 text-ink-muted font-medium tracking-wide text-sm hover:text-ink transition-colors cursor-pointer">
        <ArrowLeft className="w-5 h-5" /><span>Exit Admin</span>
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}
        className="gradient-brand border border-white/10 p-8 text-white mb-6"
      >
        <div className="inline-flex items-center space-x-2 bg-white/15 border border-white/20 px-3 py-1 text-xs font-medium tracking-wide mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /><span>Admin Access</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">Alumni CRM</h1>
        <p className="text-white/80 font-medium text-sm mt-1">Manage the network, track engagement, and grow donations, all in one place.</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <TabBar
          active={view}
          onChange={setView}
          items={TABS.map(t => ({ key: t.key, label: t.label, Icon: t.Icon }))}
        />
        {/* Demo seeding. only offered when the CRM is actually talking to
            Supabase, since in localStorage mode the data seeds itself. */}
        {!loading && crmMode() === 'supabase' && (
          <button onClick={seedDemo} disabled={seeding} title="Replace the donations table with the deterministic demo history"
            className="ml-auto px-4 py-2.5 font-medium text-sm flex items-center gap-2 cursor-pointer bg-surface text-ink-faint border border-rule hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed rounded-slight">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {seeding ? 'Seeding…' : 'Seed demo data'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-10 h-10 text-ink-faint animate-spin" /></div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>

            {/* ===================== OVERVIEW ===================== */}
            {view === 'overview' && (
              <div className="space-y-8">
                {/* Hierarchy instead of eight equal boxes: one headline figure,
                    three supporting, and the roster counts as a compact strip. */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="navy-field panel p-6 lg:row-span-2 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-on-navy-muted">Total raised</span>
                      <TrendingUp className="w-4 h-4 text-on-navy-muted" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="font-heading text-4xl lg:text-5xl font-semibold text-on-navy tabular">
                        {money(stats.raised)}
                      </div>
                      <div className="mt-3 flex items-baseline gap-2 text-sm text-on-navy-muted">
                        <span className="tabular text-heritage-on-navy font-medium">{stats.gifts}</span>
                        <span>gifts from</span>
                        <span className="tabular text-heritage-on-navy font-medium">{stats.donors}</span>
                        <span>donors</span>
                      </div>
                    </div>
                  </motion.div>

                  {[
                    { label: 'Average gift', value: money(stats.avg) },
                    { label: 'Donors', value: stats.donors },
                    { label: 'Gifts on record', value: stats.gifts },
                    { label: 'Registered alumni', value: stats.alumni },
                  ].map((s2, i) => (
                    <motion.div
                      key={s2.label}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                      className="bg-surface border border-rule panel p-5"
                    >
                      <span className="text-sm text-ink-faint">{s2.label}</span>
                      <div className="mt-1 font-heading text-2xl font-semibold text-ink tabular">{s2.value}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Roster counts are reference, not headline. A strip, not tiles. */}
                <dl className="flex flex-wrap items-baseline gap-x-10 gap-y-3 border-t border-rule pt-5">
                  {[
                    { label: 'Total records', value: stats.total },
                    { label: 'Newsletter opt-ins', value: stats.newsletter },
                    { label: 'Contactable', value: stats.contactable },
                  ].map(r => (
                    <div key={r.label} className="flex items-baseline gap-2">
                      <dt className="text-sm text-ink-faint">{r.label}</dt>
                      <dd className="font-medium text-ink tabular">{r.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Giving by year */}
                  <div className="bg-surface border border-rule p-6 panel">
                    <h3 className="font-medium text-ink mb-5">Giving by Year</h3>
                    {yearData.length === 0 ? <p className="text-sm text-ink-faint">No donations yet.</p> : (
                      <div className="flex items-end gap-4 h-44" role="img" aria-label={`Giving by year: ${yearData.map(d => `${d.label} ${money(d.value)}`).join(', ')}`}>
                        {yearData.map((d) => (
                          <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full">
                            <span className="text-xs font-medium text-ink-muted mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.value)}</span>
                            <motion.div title={`${d.label}: ${money(d.value)}`} className="w-full bg-ink"
                              initial={{ height: 0 }} animate={{ height: `${(d.value / maxYear) * 100}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ minHeight: 4 }} />
                            <span className="text-xs font-medium text-ink-faint mt-2">{d.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* By campaign */}
                  <div className="bg-surface border border-rule p-6 panel">
                    <h3 className="font-medium text-ink mb-5">Giving by Campaign</h3>
                    <div className="space-y-3">
                      {campaignData.map((d, i) => (
                        <div key={d.label}>
                          <div className="flex justify-between text-xs font-medium mb-1">
                            <span className="text-ink-muted">{d.label}</span>
                            <span className="text-ink-faint" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.value)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden">
                            <motion.div className="h-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                              initial={{ width: 0 }} animate={{ width: `${(d.value / maxCamp) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top donors */}
                <div className="bg-surface border border-rule p-6 panel">
                  <h3 className="font-medium text-ink mb-5">Top Donors</h3>
                  {topDonors.length === 0 ? <p className="text-sm text-ink-faint">No donations yet.</p> : (
                    <div className="space-y-3">
                      {topDonors.map((d, i) => (
                        <div key={d.id} className="flex items-center gap-3">
                          <span className="w-6 text-sm font-medium text-ink-faint" style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                          <button onClick={() => setDrawer(contactsById[d.id])} className="w-40 shrink-0 text-left text-sm font-medium text-ink truncate hover:text-ink cursor-pointer">{d.name}</button>
                          <div className="flex-1 h-1.5 overflow-hidden">
                            <motion.div className="h-full bg-[var(--series-2)]" initial={{ width: 0 }} animate={{ width: `${(d.value / maxTop) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
                          </div>
                          <span className="w-20 text-right text-sm font-medium text-ink-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================== TRENDS ===================== */}
            {view === 'trends' && (() => {
              const maxCohort = Math.max(1, ...cohortData.map(d => d.total));
              const maxCity = Math.max(1, ...cityData.slice(0, 12).map(d => d.total));
              const maxMonth = Math.max(1, ...monthData.map(d => d.total));
              const maxRet = Math.max(1, ...retention.map(d => d.total));
              const maxMethod = Math.max(1, ...methodData.map(d => d.total));
              const maxIndustry = Math.max(1, ...industryData.map(d => d.total));
              const maxCollege = Math.max(1, ...collegeData.slice(0, 14).map(d => d.total));
              const thin = donations.length < 5;

              return (
                <div className="space-y-8">
                  {thin && (
                    <div className="bg-sunken border border-rule p-4 text-sm text-warn panel">
                      Only {donations.length} gift{donations.length === 1 ? '' : 's'} logged. These cuts need more history before the patterns mean anything.
                    </div>
                  )}

                  {/* Auto-generated takeaways */}
                  {headlines.length > 0 && (
                    <Panel title="What the giving data says" subtitle="Recomputed from the gifts on record. not hand-written copy." Icon={LineChart}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {headlines.map((h, i) => (
                          <motion.div key={h.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="border border-rule p-4">
                            <div className="text-xs font-medium tracking-wide text-ink-faint">{h.label}</div>
                            <div className="text-lg font-semibold text-ink mt-1">{h.value}</div>
                            <div className="text-xs font-medium text-ink-faint mt-1">{h.detail}</div>
                          </motion.div>
                        ))}
                      </div>
                    </Panel>
                  )}

                  {/* LYBUNT. the call list */}
                  {lapsed.lybunt.length > 0 && (
                    <Panel
                      title={`Lapsed donors. call list (LYBUNT ${lapsed.prior} → ${lapsed.current})`}
                      subtitle={`Gave in ${lapsed.prior}, nothing yet in ${lapsed.current}. They have already said yes once, which makes this the cheapest money on the board to win back.`}
                      Icon={PhoneCall}>
                      <div className="flex flex-wrap gap-4 mb-5">
                        {[
                          { label: 'At risk', value: money(lapsed.atRisk), accent: 'text-bad' },
                          { label: 'Lapsed donors', value: lapsed.lybunt.length },
                          { label: `Never renewed (SYBUNT)`, value: lapsed.sybunt.length },
                        ].map(s2 => (
                          <div key={s2.label} className="border border-rule px-4 py-3 min-w-[140px]">
                            <div className="text-xs font-medium tracking-wide text-ink-faint">{s2.label}</div>
                            <div className={`text-xl font-semibold mt-0.5 ${s2.accent || 'text-ink'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{s2.value}</div>
                          </div>
                        ))}
                      </div>
                      <TrendTable
                        rows={lapsed.lybunt.slice(0, 12)}
                        cols={[
                          { label: '#', align: 'right', get: (r, i) => i + 1 },
                          { label: 'Donor', get: r => (
                            r.contact
                              ? <button onClick={() => setDrawer(r.contact)} className="text-left font-medium text-ink hover:text-ink cursor-pointer">{r.name}</button>
                              : <span className="font-medium text-ink">{r.name}</span>
                          ) },
                          { label: 'Class', get: r => r.gradYear || '-' },
                          { label: 'Location', get: r => r.location || '-' },
                          { label: `Gave ${lapsed.prior}`, align: 'right', get: r => money(r.lapsedAmount), strong: true },
                          { label: 'Lifetime', align: 'right', get: r => money(r.lifetime) },
                          { label: 'Last gift', align: 'right', get: r => r.lastGiftDate || '-' },
                          { label: 'To', get: r => r.lastCampaign || '-' },
                        ]}
                      />
                      {lapsed.lybunt.length > 12 && (
                        <p className="text-xs font-medium text-ink-faint mt-3">
                          Showing the top 12 of {lapsed.lybunt.length} by amount at risk.
                        </p>
                      )}
                    </Panel>
                  )}

                  {/* Class cohorts */}
                  <Panel title="Giving by class year" subtitle="Five-year cohorts. Participation is donors ÷ alumni on record. the number that shows engagement independent of wealth."
                    Icon={GraduationCap}>
                    <TrendTable
                      rows={cohortData.filter(c => c.people > 0)}
                      empty="No graduation years on record yet."
                      cols={[
                        { label: 'Class', get: r => r.key, strong: true },
                        { label: '', get: r => <Bar value={r.total} max={maxCohort} /> },
                        { label: 'Total', align: 'right', get: r => money(r.total), strong: true },
                        { label: 'Alumni', align: 'right', get: r => r.people },
                        { label: 'Donors', align: 'right', get: r => r.donors },
                        { label: 'Participation', align: 'right', get: r => (
                          <span className={r.participation >= 0.4 ? 'text-good font-medium' : r.participation < 0.15 ? 'text-bad font-medium' : ''}>{pctText(r.participation)}</span>
                        ) },
                        { label: 'Per alum', align: 'right', get: r => money(r.perAlum) },
                        { label: 'Avg gift', align: 'right', get: r => money(r.avg) },
                      ]}
                    />
                  </Panel>

                  {/* Campaign performance */}
                  <Panel title="Campaign performance" subtitle="Biggest total isn't the same as most effective. compare average gift (capacity reached) against donors (reach) and repeat rate (stickiness)."
                    Icon={TrendingUp}>
                    <TrendTable
                      rows={campaignPerf}
                      empty="No donations logged yet."
                      cols={[
                        { label: 'Campaign', get: r => r.key, strong: true },
                        { label: 'Raised', align: 'right', get: r => money(r.total), strong: true },
                        { label: 'Gifts', align: 'right', get: r => r.gifts },
                        { label: 'Donors', align: 'right', get: r => r.donors },
                        { label: 'Avg gift', align: 'right', get: r => money(r.avg) },
                        { label: 'Median', align: 'right', get: r => money(r.median) },
                        { label: 'Largest', align: 'right', get: r => money(r.largest) },
                        { label: 'Repeat', align: 'right', get: r => pctText(r.repeatRate) },
                        { label: 'YoY', align: 'right', get: r => (
                          <span className={r.growth == null ? 'text-ink-faint' : r.growth >= 0 ? 'text-good font-medium' : 'text-bad font-medium'}>{growthText(r.growth)}</span>
                        ) },
                      ]}
                    />
                  </Panel>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Geography */}
                    <Panel title="Where the money comes from" subtitle="Cities with at least two alumni on record. Dollars per alum is the yield metric for deciding where to hold events."
                      Icon={MapPin}>
                      <TrendTable
                        rows={cityData.slice(0, 12)}
                        empty="No locations on record yet."
                        cols={[
                          { label: 'City', get: r => r.key, strong: true },
                          { label: '', get: r => <Bar value={r.total} max={maxCity} color="#c8102e" /> },
                          { label: 'Total', align: 'right', get: r => money(r.total), strong: true },
                          { label: 'Alumni', align: 'right', get: r => r.people },
                          { label: 'Part.', align: 'right', get: r => pctText(r.participation) },
                          { label: 'Per alum', align: 'right', get: r => money(r.perAlum) },
                        ]}
                      />
                    </Panel>

                    {/* Seasonality */}
                    <Panel title="When gifts arrive" subtitle="All years combined. Peaks are where appeals already land. and troughs are open calendar space."
                      Icon={CalendarDays}>
                      <div className="flex items-end gap-1.5 h-40" role="img"
                        aria-label={`Giving by month: ${monthData.map(m => `${m.key} ${money(m.total)}`).join(', ')}`}>
                        {monthData.map(m => (
                          <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full">
                            <motion.div title={`${m.key}: ${money(m.total)} across ${m.gifts} gifts`} className="w-full bg-ink"
                              initial={{ height: 0 }} animate={{ height: `${(m.total / maxMonth) * 100}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} style={{ minHeight: 2 }} />
                            <span className="text-xs font-medium text-ink-faint mt-1.5">{m.key[0]}</span>
                          </div>
                        ))}
                      </div>
                    </Panel>

                    {/* Retention */}
                    <Panel title="New vs. returning donors" subtitle="A year carried by first-time gifts is a year that has to be re-won. Returning dollars are the durable base."
                      Icon={Repeat}>
                      {retention.length === 0 ? <p className="text-sm text-ink-faint">No donations yet.</p> : (
                        <div className="space-y-3">
                          {retention.map(r => (
                            <div key={r.key}>
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span className="text-ink-muted">{r.key}</span>
                                <span className="text-ink-faint" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {money(r.total)} · {r.retDonors} returning / {r.newDonors} new
                                </span>
                              </div>
                              <div className="h-3 bg-sunken dark:bg-white/10 overflow-hidden flex panel" style={{ width: `${(r.total / maxRet) * 100}%`, minWidth: 8 }}>
                                <div className="h-full bg-ink" style={{ width: `${r.total ? (r.retTotal / r.total) * 100 : 0}%` }} title={`Returning: ${money(r.retTotal)}`} />
                                <div className="h-full bg-[var(--series-2)]" style={{ width: `${r.total ? (r.newTotal / r.total) * 100 : 0}%` }} title={`New: ${money(r.newTotal)}`} />
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-4 text-xs font-medium text-ink-faint pt-1">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-ink" /> Returning</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[var(--series-2)]" /> New</span>
                          </div>
                        </div>
                      )}
                    </Panel>

                    {/* Career field */}
                    <Panel title="Giving by career field" subtitle="Inferred from each person's real career/position text. Students are kept separate. folding them in would drag every average down and hide which fields actually give."
                      Icon={Briefcase}>
                      <TrendTable
                        rows={industryData}
                        empty="No career information on record yet."
                        cols={[
                          { label: 'Field', get: r => r.key, strong: true },
                          { label: '', get: r => <Bar value={r.total} max={maxIndustry} color="#7c3aed" /> },
                          { label: 'Total', align: 'right', get: r => money(r.total), strong: true },
                          { label: 'People', align: 'right', get: r => r.people },
                          { label: 'Part.', align: 'right', get: r => pctText(r.participation) },
                          { label: 'Per person', align: 'right', get: r => money(r.perAlum) },
                          { label: 'Avg gift', align: 'right', get: r => money(r.avg) },
                        ]}
                      />
                    </Panel>

                    {/* College */}
                    <Panel title="Giving by undergrad college" subtitle="School names are normalised first. “UT Austin” and “University of Texas at Austin” are one cohort, not two."
                      Icon={School}>
                      <TrendTable
                        rows={collegeData.slice(0, 14)}
                        empty="No colleges on record yet."
                        cols={[
                          { label: 'College', get: r => r.key, strong: true },
                          { label: '', get: r => <Bar value={r.total} max={maxCollege} color="#d97706" /> },
                          { label: 'Total', align: 'right', get: r => money(r.total), strong: true },
                          { label: 'Alumni', align: 'right', get: r => r.people },
                          { label: 'Part.', align: 'right', get: r => pctText(r.participation) },
                          { label: 'Per alum', align: 'right', get: r => money(r.perAlum) },
                        ]}
                      />
                    </Panel>

                    {/* Methods */}
                    <Panel title="How people give" subtitle="Payment mix tracks gift size. stock and wire signal major-gift capacity worth a personal ask."
                      Icon={CreditCard}>
                      <TrendTable
                        rows={methodData}
                        empty="No donations logged yet."
                        cols={[
                          { label: 'Method', get: r => r.key, strong: true },
                          { label: '', get: r => <Bar value={r.total} max={maxMethod} color="#0891b2" /> },
                          { label: 'Total', align: 'right', get: r => money(r.total), strong: true },
                          { label: 'Gifts', align: 'right', get: r => r.gifts },
                          { label: 'Avg gift', align: 'right', get: r => money(r.avg) },
                        ]}
                      />
                    </Panel>
                  </div>
                </div>
              );
            })()}

            {/* ===================== CONTACTS ===================== */}
            {view === 'contacts' && (
              <div>
                <div className="flex flex-col md:flex-row gap-3 mb-5">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-ink-faint absolute left-4 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search any field..."
                      className="w-full pl-12 pr-4 py-3 border border-rule focus:outline-none focus:border-action bg-surface font-medium rounded-slight" />
                  </div>
                  <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                    className="px-4 py-3 border border-rule bg-surface font-medium cursor-pointer rounded-slight">
                    <option value="all">All Types</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Mentor">Mentors</option>
                  </select>
                  <button onClick={() => { setDonorOnly(v => !v); setPage(0); }}
                    className={`px-4 py-3 border font-medium cursor-pointer flex items-center gap-2 ${donorOnly ? 'bg-action text-action-ink border-action' : 'bg-surface text-ink-muted border-rule rounded-slight'}`}>
                    <HeartHandshake className="w-4 h-4" /> Donors only
                  </button>
                  <button onClick={exportContacts} className="px-4 py-3 bg-surface border border-rule-strong text-ink hover:border-ink font-medium cursor-pointer flex items-center gap-2 rounded-slight">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                </div>

                <div className="bg-surface border border-rule overflow-hidden panel">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="navy-field text-xs tracking-wide">
                        <tr>
                          {COLUMNS.map(c => (
                            <th key={c.key} onClick={() => toggleSort(c.key)} className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-white/10">
                              <span className="inline-flex items-center gap-1">{c.label}{sortKey === c.key && (sortDir === 1 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {currentRows.map(r => (
                          <tr key={r.id} onClick={() => setDrawer(r)} className="font-medium text-ink-muted hover:bg-sunken cursor-pointer panel">
                            {COLUMNS.map(c => {
                              const v = c.get(r);
                              if (c.key === 'name') return <td key={c.key} className="px-4 py-3 font-medium text-ink">{v}</td>;
                              if (c.key === 'lifetime') return <td key={c.key} className="px-4 py-3 font-medium text-good" style={{ fontVariantNumeric: 'tabular-nums' }}>{v || <span className="text-ink-faint">-</span>}</td>;
                              if (c.key === 'source') return <td key={c.key} className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 border ${r.source === 'Alumni' ? 'bg-sunken text-ink border-rule panel' : 'bg-sunken text-ink-muted border-rule panel'}`}>{r.source}</span></td>;
                              if (c.key === 'newsletter' || c.key === 'studentContact') { const col = v === 'Yes' ? 'text-good' : v === 'No' ? 'text-ink-faint' : 'text-ink-faint'; return <td key={c.key} className={`px-4 py-3 font-medium ${col}`}>{v}</td>; }
                              return <td key={c.key} className="px-4 py-3 max-w-[220px] truncate" title={String(v || '')}>{v || <span className="text-ink-faint">-</span>}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
                  <span className="text-sm font-medium text-ink-faint">Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0} className="bg-surface text-ink font-medium py-2 px-4 border border-rule text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer rounded-slight">Prev</button>
                    <span className="text-sm font-medium text-ink-faint">Page {safePage + 1} / {pageCount}</span>
                    <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1} className="bg-action text-action-ink font-medium py-2 px-4 border border-rule text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Next</button>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== DONATIONS ===================== */}
            {view === 'donations' && (
              <div>
                <div className="flex flex-col md:flex-row gap-3 mb-5">
                  <div className="bg-surface border border-rule px-5 py-3 font-medium text-ink flex items-center gap-2 panel">
                    <TrendingUp className="w-5 h-5 text-good" />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(totalRaised(filteredDonations))}</span>
                    <span className="text-ink-faint font-medium text-sm">{filteredDonations.length} gifts</span>
                  </div>
                  <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="px-4 py-3 border border-rule bg-surface font-medium cursor-pointer rounded-slight">
                    <option value="all">All Campaigns</option>
                    {CAMPAIGNS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex-1" />
                  <button onClick={exportDonations} className="px-4 py-3 bg-surface border border-rule-strong text-ink hover:border-ink font-medium cursor-pointer flex items-center gap-2 rounded-slight"><Download className="w-4 h-4" /> CSV</button>
                  <button onClick={() => setModal({})} className="px-4 py-3 bg-signal-good text-white font-medium cursor-pointer flex items-center gap-2"><Plus className="w-4 h-4" /> Log Donation</button>
                </div>

                <div className="bg-surface border border-rule overflow-hidden rounded-slight">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="navy-field text-xs tracking-wide">
                        <tr>
                          <th className="px-4 py-3 font-medium">Donor</th><th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Campaign</th>
                          <th className="px-4 py-3 font-medium">Method</th><th className="px-4 py-3 font-medium">Note</th><th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {filteredDonations.length === 0 ? (
                          <tr><td colSpan="7" className="px-4 py-10 text-center font-medium text-ink-faint">No donations yet. Click "Log Donation" to add one.</td></tr>
                        ) : filteredDonations.map(d => (
                          <tr key={d.id} className="font-medium text-ink-muted hover:bg-sunken panel">
                            <td className="px-4 py-3 font-medium text-ink">{d.contactName}</td>
                            <td className="px-4 py-3 font-medium text-good" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.amount)}</td>
                            <td className="px-4 py-3">{d.date}</td>
                            <td className="px-4 py-3">{d.campaign}</td>
                            <td className="px-4 py-3">{d.method}</td>
                            <td className="px-4 py-3 max-w-[220px] truncate" title={d.note}>{d.note || <span className="text-ink-faint">-</span>}</td>
                            <td className="px-4 py-3"><button onClick={() => { deleteDonation(d.id); changed(); }} className="text-ink-faint hover:text-action cursor-pointer"><Trash2 className="w-4 h-4" /></button></td>
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
