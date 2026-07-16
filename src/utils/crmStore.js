// CRM data layer for donations, notes, and tags.
//
// Source of truth is Supabase (tables: donations / crm_notes / crm_tags) so data
// persists across devices and deploys. If those tables don't exist yet (SQL not
// run), it transparently falls back to localStorage so the app still works.
//
// The public getters stay SYNCHRONOUS (they read an in-memory cache), and
// mutations update the cache immediately then persist in the background — so
// the UI code doesn't need to await anything. Call `initCRM()` once on load
// to hydrate the cache.

import { supabase } from './supabaseClient';

const K_DON = 'cc_crm_donations';
const K_NOTES = 'cc_crm_notes';
const K_TAGS = 'cc_crm_tags';
const K_SEEDED = 'cc_crm_seeded_v1';

export const CAMPAIGNS = ['Annual Fund', 'Scholarship Fund', 'Athletics', 'Fine Arts', 'Capital Campaign', 'Teacher Grants'];
export const METHODS = ['Credit Card', 'Check', 'Cash', 'Stock', 'Payroll', 'Wire'];

let _don = [];
let _notes = {};   // { contactId: [{id,text,date}] }
let _tags = {};    // { contactId: [tag] }
let _mode = 'local'; // 'supabase' | 'local'
let _loaded = false;

function lread(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch (e) { return f; } }
function lwrite(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
let _c = 0;
function uuid() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* ignore */ }
  return `id-${Date.now().toString(36)}-${(_c++).toString(36)}`;
}

export function crmMode() { return _mode; }

// Hydrate the cache. Tries Supabase; falls back to localStorage on any error.
export async function initCRM() {
  if (_loaded) return _mode;
  try {
    const d = await supabase.from('donations').select('*');
    if (d.error) throw d.error;
    _mode = 'supabase';
    _don = (d.data || []).map(r => ({
      id: r.id, contactId: r.contact_id, contactName: r.contact_name,
      amount: r.amount, date: r.date, campaign: r.campaign, method: r.method, note: r.note || '',
    }));
    const [n, t] = await Promise.all([
      supabase.from('crm_notes').select('*'),
      supabase.from('crm_tags').select('*'),
    ]);
    _notes = {};
    (n.data || []).forEach(r => { (_notes[r.contact_id] = _notes[r.contact_id] || []).push({ id: r.id, text: r.text, date: r.created_at }); });
    _tags = {};
    (t.data || []).forEach(r => { _tags[r.contact_id] = r.tags || []; });
  } catch (e) {
    console.warn('[crm] Supabase CRM tables unavailable — using localStorage. Run supabase/crm_setup.sql to persist server-side.', e?.message || e);
    _mode = 'local';
    _don = lread(K_DON, []);
    _notes = lread(K_NOTES, {});
    _tags = lread(K_TAGS, {});
  }
  _loaded = true;
  return _mode;
}

/* ---------- Donations ---------- */
export function getDonations() {
  return _don.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
export function donationsFor(contactId) { return getDonations().filter(d => d.contactId === contactId); }

export function addDonation(d) {
  const rec = {
    id: uuid(), contactId: d.contactId || null, contactName: d.contactName || 'Anonymous',
    amount: Math.round(Number(d.amount) || 0), date: d.date || new Date().toISOString().slice(0, 10),
    campaign: d.campaign || 'Annual Fund', method: d.method || 'Credit Card', note: d.note || '',
  };
  _don.push(rec);
  if (_mode === 'supabase') {
    supabase.from('donations').insert([{
      id: rec.id, contact_id: rec.contactId, contact_name: rec.contactName, amount: rec.amount,
      date: rec.date, campaign: rec.campaign, method: rec.method, note: rec.note,
    }]).then(({ error }) => { if (error) console.error('[crm] addDonation failed', error); });
  } else { lwrite(K_DON, _don); }
  return rec;
}
export function deleteDonation(donId) {
  _don = _don.filter(d => d.id !== donId);
  if (_mode === 'supabase') supabase.from('donations').delete().eq('id', donId).then(({ error }) => { if (error) console.error('[crm] deleteDonation failed', error); });
  else lwrite(K_DON, _don);
}

/* ---------- Notes ---------- */
export function getNotes(contactId) {
  return (_notes[contactId] || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
export function addNote(contactId, text) {
  const note = { id: uuid(), text, date: new Date().toISOString() };
  _notes[contactId] = _notes[contactId] || [];
  _notes[contactId].unshift(note);
  if (_mode === 'supabase') supabase.from('crm_notes').insert([{ id: note.id, contact_id: contactId, text, created_at: note.date }]).then(({ error }) => { if (error) console.error('[crm] addNote failed', error); });
  else lwrite(K_NOTES, _notes);
  return note;
}
export function deleteNote(contactId, noteId) {
  _notes[contactId] = (_notes[contactId] || []).filter(n => n.id !== noteId);
  if (_mode === 'supabase') supabase.from('crm_notes').delete().eq('id', noteId).then(({ error }) => { if (error) console.error('[crm] deleteNote failed', error); });
  else lwrite(K_NOTES, _notes);
}

/* ---------- Tags ---------- */
export function getTags(contactId) { return _tags[contactId] || []; }
export function setTags(contactId, tags) {
  _tags[contactId] = tags;
  if (_mode === 'supabase') supabase.from('crm_tags').upsert([{ contact_id: contactId, tags }], { onConflict: 'contact_id' }).then(({ error }) => { if (error) console.error('[crm] setTags failed', error); });
  else lwrite(K_TAGS, _tags);
}

/* ---------- Aggregations ---------- */
export function totalRaised(donations) { return donations.reduce((s, d) => s + (d.amount || 0), 0); }
export function donorIds(donations) { return new Set(donations.map(d => d.contactId).filter(Boolean)); }
export function totalsByContact(donations) {
  const m = {}; donations.forEach(d => { if (d.contactId) m[d.contactId] = (m[d.contactId] || 0) + d.amount; }); return m;
}
export function totalsByYear(donations) {
  const m = {}; donations.forEach(d => { const y = (d.date || '').slice(0, 4); if (y) m[y] = (m[y] || 0) + d.amount; }); return m;
}
export function totalsByCampaign(donations) {
  const m = {}; CAMPAIGNS.forEach(c => { m[c] = 0; }); donations.forEach(d => { m[d.campaign] = (m[d.campaign] || 0) + d.amount; }); return m;
}
export function money(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }

/* ---------- One-time demo seed (localStorage mode only) ---------- */
export function seedIfEmpty(contacts) {
  if (_mode !== 'local') return;                 // never auto-seed a real Supabase DB
  if (localStorage.getItem(K_SEEDED) || !contacts || contacts.length === 0) return;
  const pick = (arr, i) => arr[i % arr.length];
  const sample = contacts.slice(0, Math.min(contacts.length, 40));
  const amounts = [50, 100, 250, 500, 1000, 75, 2500, 150, 5000, 300, 1200, 40, 800, 600, 3500, 200];
  let n = 0;
  for (let i = 0; i < sample.length && n < 22; i += 2) {
    const c = sample[i];
    const year = 2022 + (i % 4);
    const month = ((i * 3) % 12) + 1;
    const day = ((i * 7) % 27) + 1;
    _don.push({ id: uuid(), contactId: c.id, contactName: c.name, amount: pick(amounts, i), date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, campaign: pick(CAMPAIGNS, i), method: pick(METHODS, i), note: '' });
    if (i % 6 === 0) {
      _don.push({ id: uuid(), contactId: c.id, contactName: c.name, amount: pick(amounts, i + 5), date: `${year + 1 <= 2025 ? year + 1 : 2025}-0${(i % 8) + 1}-1${i % 5}`, campaign: pick(CAMPAIGNS, i + 2), method: pick(METHODS, i + 1), note: '' });
    }
    n++;
  }
  lwrite(K_DON, _don);
  localStorage.setItem(K_SEEDED, '1');
}
