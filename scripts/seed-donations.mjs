// Seed the Supabase `donations` table with the deterministic demo giving
// history, derived from the real people already in the database.
//
//   node scripts/seed-donations.mjs           # upsert (safe to re-run)
//   node scripts/seed-donations.mjs --replace # wipe donations first
//   node scripts/seed-donations.mjs --dry     # print a summary, write nothing
//
// Requires supabase/crm_setup.sql to have been run once (it creates the table).
// Re-running is idempotent: gift ids are hashed from the contact, so the same
// person always maps to the same rows.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { generateDonations } from '../src/utils/demoDonations.js';

// Read .env.local directly — this runs outside Vite, so import.meta.env is empty.
function loadEnv(file = '.env.local') {
  const env = {};
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* fall through to process.env */ }
  return { ...env, ...process.env };
}

const args = new Set(process.argv.slice(2));
const dry = args.has('--dry');
const replace = args.has('--replace');

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (checked .env.local and the environment).');
  process.exit(1);
}
const sb = createClient(url, key);

// Build the same contact list the admin CRM builds, so ids line up exactly.
// Paged: a plain select() stops at 1000 rows without saying so, and mentors
// is already past that — the missing people would just never get gifts.
async function selectAll(table, columns, refine) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb.from(table).select(columns).range(from, from + PAGE - 1);
    if (refine) q = refine(q);
    const { data, error } = await q;
    if (error) return { data: out, error };
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { data: out, error: null };
}

const [alumniRes, mentorsRes] = await Promise.all([
  selectAll(
    'user_profiles',
    'id, name, grad_year, email, college, major, career, company, location, post_grad_program',
    q => q.eq('post_grad_school', 'ALUMNI_METADATA'),
  ),
  selectAll('mentors', 'id, name, grad_year, college, education, current_position, location, role'),
]);
if (alumniRes.error) throw alumniRes.error;
if (mentorsRes.error) throw mentorsRes.error;

const contacts = [
  ...(alumniRes.data || []).map(r => ({
    id: `a-${r.id}`, name: r.name || '', grad_year: r.grad_year || '', college: r.college || '',
    major: r.major || '', career: r.career || '', company: r.company || '', location: r.location || '',
  })),
  ...(mentorsRes.data || []).map(r => ({
    id: `m-${r.id}`, name: r.name || '', grad_year: r.grad_year || '', college: r.college || '',
    major: '', career: r.current_position || '', company: '', location: r.location || '',
  })),
];

const rows = generateDonations(contacts);
const total = rows.reduce((s, r) => s + r.amount, 0);
const donors = new Set(rows.map(r => r.contactId)).size;
console.log(`${contacts.length} contacts → ${rows.length} gifts, ${donors} donors, $${total.toLocaleString('en-US')} total`);

if (dry) {
  console.log('--dry: nothing written.');
  console.log(rows.slice(0, 5));
  process.exit(0);
}

// Verify the table exists before touching anything, so the failure message is
// actionable instead of a schema-cache error buried in a loop.
const probe = await sb.from('donations').select('id').limit(1);
if (probe.error) {
  console.error(`\nCannot reach public.donations: ${probe.error.message}`);
  console.error('Run supabase/crm_setup.sql once in the Supabase SQL editor, then retry.');
  process.exit(1);
}

if (replace) {
  const { error } = await sb.from('donations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
  console.log('Cleared existing donations.');
}

for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200).map(r => ({
    id: r.id, contact_id: r.contactId, contact_name: r.contactName, amount: r.amount,
    date: r.date, campaign: r.campaign, method: r.method, note: r.note,
  }));
  const { error } = await sb.from('donations').upsert(chunk, { onConflict: 'id' });
  if (error) throw error;
  process.stdout.write(`\rUpserted ${Math.min(i + 200, rows.length)}/${rows.length}`);
}
console.log('\nDone.');
