// Donation trend analysis for the admin CRM.
//
// Everything here is a pure function over (donations, contacts) — no I/O, no
// component state — so the Trends tab stays a thin renderer and the numbers are
// easy to sanity-check. Donations only carry contactId/amount/date/campaign,
// so any cut by class year or city is a join back onto the contact record;
// gifts whose donor isn't in the contact list (e.g. "Anonymous") are counted in
// the totals but excluded from those cuts.

import { industryOf } from './demoDonations.js';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// "Austin, TX" -> "Austin, TX"; "Austin" -> "Austin". Blank locations are dropped.
export function cityOf(contact) {
  const loc = (contact?.location || '').trim();
  if (!loc) return null;
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  return parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
}

// 5-year class cohorts ("2001–2005"). Grad years are strings on the contact.
export function cohortOf(contact) {
  const y = num(contact?.grad_year);
  if (!y || y < 1900 || y > 2100) return null;
  const start = Math.floor(y / 5) * 5;
  return { key: `${start}–${start + 4}`, start };
}

// Shared shape for every "group of gifts" row.
function bucket() {
  return { total: 0, gifts: 0, amounts: [], donors: new Set() };
}
function close(key, b, extra = {}) {
  return {
    key,
    total: b.total,
    gifts: b.gifts,
    donors: b.donors.size,
    avg: b.gifts ? Math.round(b.total / b.gifts) : 0,
    median: median(b.amounts),
    largest: b.amounts.length ? Math.max(...b.amounts) : 0,
    ...extra,
  };
}
function push(b, d) {
  b.total += d.amount || 0;
  b.gifts += 1;
  b.amounts.push(d.amount || 0);
  if (d.contactId) b.donors.add(d.contactId);
}

/* ---------- Class-year cohorts ---------- */
// Participation rate is the metric that actually drives advancement strategy:
// a cohort can be small in dollars but nearly fully engaged (or the reverse).
export function byCohort(donations, contacts) {
  const byId = Object.fromEntries((contacts || []).map(c => [c.id, c]));
  const pop = {};   // cohort -> alumni in the database (the participation denominator)
  (contacts || []).forEach(c => {
    const co = cohortOf(c);
    if (co) (pop[co.key] = pop[co.key] || { start: co.start, people: 0 }).people += 1;
  });
  const buckets = {};
  donations.forEach(d => {
    const co = cohortOf(byId[d.contactId]);
    if (!co) return;
    push(buckets[co.key] = buckets[co.key] || bucket(), d);
  });
  return Object.entries(pop)
    .map(([key, { start, people }]) => {
      const b = buckets[key] || bucket();
      const row = close(key, b, { start, people });
      row.participation = people ? row.donors / people : 0;
      row.perAlum = people ? Math.round(row.total / people) : 0;
      return row;
    })
    .sort((a, b) => a.start - b.start);
}

/* ---------- Campaigns ---------- */
// "What worked" is not just the biggest total — a campaign that pulled a high
// average gift from few donors is a different play than one with broad reach.
export function byCampaign(donations) {
  const buckets = {};
  const seen = {};  // campaign -> { contactId: giftCount } for repeat rate
  donations.forEach(d => {
    const k = d.campaign || 'Unspecified';
    push(buckets[k] = buckets[k] || bucket(), d);
    if (d.contactId) {
      const s = seen[k] = seen[k] || {};
      s[d.contactId] = (s[d.contactId] || 0) + 1;
    }
  });
  const donorPool = new Set(donations.map(d => d.contactId).filter(Boolean)).size;
  return Object.entries(buckets).map(([k, b]) => {
    const counts = Object.values(seen[k] || {});
    const repeat = counts.filter(n => n > 1).length;
    const row = close(k, b);
    row.repeatRate = counts.length ? repeat / counts.length : 0;
    row.reach = donorPool ? row.donors / donorPool : 0;   // share of all donors this campaign touched
    row.years = yearSeries(donations.filter(d => (d.campaign || 'Unspecified') === k));
    row.growth = growthRate(row.years);
    return row;
  }).sort((a, b) => b.total - a.total);
}

/* ---------- Geography ---------- */
export function byCity(donations, contacts, minAlumni = 1) {
  const byId = Object.fromEntries((contacts || []).map(c => [c.id, c]));
  const pop = {};
  (contacts || []).forEach(c => { const city = cityOf(c); if (city) pop[city] = (pop[city] || 0) + 1; });
  const buckets = {};
  donations.forEach(d => {
    const city = cityOf(byId[d.contactId]);
    if (!city) return;
    push(buckets[city] = buckets[city] || bucket(), d);
  });
  return Object.entries(pop)
    .filter(([, people]) => people >= minAlumni)
    .map(([city, people]) => {
      const row = close(city, buckets[city] || bucket(), { people });
      row.participation = people ? row.donors / people : 0;
      row.perAlum = people ? Math.round(row.total / people) : 0;
      return row;
    })
    .sort((a, b) => b.total - a.total);
}

/* ---------- Career field ---------- */
// Industry is inferred from the free-text career / position field (see
// demoDonations.industryOf). Students are kept as their own labels rather than
// folded into the professional buckets — mixing them would drag every average
// down and hide which fields actually give.
export function byIndustry(donations, contacts, minPeople = 2) {
  const byId = Object.fromEntries((contacts || []).map(c => [c.id, c]));
  const pop = {};
  (contacts || []).forEach(c => {
    const ind = industryOf(c);
    if (ind) pop[ind.name] = (pop[ind.name] || 0) + 1;
  });
  const buckets = {};
  donations.forEach(d => {
    const ind = industryOf(byId[d.contactId]);
    if (!ind) return;
    push(buckets[ind.name] = buckets[ind.name] || bucket(), d);
  });
  return Object.entries(pop)
    .filter(([, people]) => people >= minPeople)
    .map(([name, people]) => {
      const row = close(name, buckets[name] || bucket(), { people });
      row.participation = people ? row.donors / people : 0;
      row.perAlum = people ? Math.round(row.total / people) : 0;
      return row;
    })
    .sort((a, b) => b.total - a.total);
}

/* ---------- College ---------- */
// The database holds the same school under several spellings ("UT Austin",
// "University of Texas at Austin"), which would split one cohort into three.
export function normalizeCollege(name) {
  const n = String(name || '').trim();
  if (!n) return null;
  const l = n.toLowerCase();
  const alias = [
    [/^(ut|university of texas)( at)?( austin)?$|texas at austin/, 'UT Austin'],
    [/texas a ?& ?m|^tamu$/, 'Texas A&M'],
    [/^tcu$|texas christian/, 'TCU'],
    [/^smu$|southern methodist/, 'SMU'],
    [/^byu$|brigham young/, 'BYU'],
    [/^nyu$|new york university/, 'NYU'],
    [/^usc$|southern california/, 'USC'],
    [/^ucla$|california, los angeles/, 'UCLA'],
    [/berkeley/, 'UC Berkeley'],
    [/^mit$|massachusetts institute/, 'MIT'],
    [/university of michigan|^umich$/, 'University of Michigan'],
    [/urbana|^uiuc$/, 'UIUC'],
    [/university of virginia|^uva$/, 'University of Virginia'],
    [/^penn$|university of pennsylvania/, 'UPenn'],
  ];
  for (const [re, label] of alias) if (re.test(l)) return label;
  return n;
}

export function byCollege(donations, contacts, minAlumni = 3) {
  const byId = Object.fromEntries((contacts || []).map(c => [c.id, c]));
  const pop = {};
  (contacts || []).forEach(c => {
    const col = normalizeCollege(c.college);
    if (col) pop[col] = (pop[col] || 0) + 1;
  });
  const buckets = {};
  donations.forEach(d => {
    const col = normalizeCollege(byId[d.contactId]?.college);
    if (!col) return;
    push(buckets[col] = buckets[col] || bucket(), d);
  });
  return Object.entries(pop)
    .filter(([, people]) => people >= minAlumni)
    .map(([col, people]) => {
      const row = close(col, buckets[col] || bucket(), { people });
      row.participation = people ? row.donors / people : 0;
      row.perAlum = people ? Math.round(row.total / people) : 0;
      return row;
    })
    .sort((a, b) => b.total - a.total);
}

/* ---------- Time ---------- */
export function yearSeries(donations) {
  const m = {};
  donations.forEach(d => { const y = (d.date || '').slice(0, 4); if (y) m[y] = (m[y] || 0) + (d.amount || 0); });
  return Object.keys(m).sort().map(y => ({ key: y, total: m[y] }));
}

// Totals per calendar month across all years — surfaces when appeals land.
export function monthSeries(donations) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = names.map((key, i) => ({ key, month: i + 1, total: 0, gifts: 0 }));
  donations.forEach(d => {
    const mm = num((d.date || '').slice(5, 7));
    if (mm >= 1 && mm <= 12) { m[mm - 1].total += d.amount || 0; m[mm - 1].gifts += 1; }
  });
  return m;
}

export function byMethod(donations) {
  const buckets = {};
  donations.forEach(d => push(buckets[d.method || 'Unspecified'] = buckets[d.method || 'Unspecified'] || bucket(), d));
  return Object.entries(buckets).map(([k, b]) => close(k, b)).sort((a, b) => b.total - a.total);
}

// Compound annual change across a year series, as a fraction (0.25 = +25%/yr).
// The span comes from the calendar years themselves, not the number of entries:
// a campaign with gifts in 2021 and 2024 grew over three years, not one, and
// yearSeries omits the silent years in between.
// Returns null when there's too little history to say anything.
export function growthRate(years) {
  if (years.length < 2) return null;
  const first = years[0], last = years[years.length - 1];
  if (first.total <= 0) return null;
  const span = Number(last.key) - Number(first.key);
  if (!span || span < 1) return null;
  return Math.pow(last.total / first.total, 1 / span) - 1;
}

// Calendar years covered by a series, for phrasing growth claims honestly.
export function yearSpan(years) {
  if (years.length < 2) return years.length;
  return Number(years[years.length - 1].key) - Number(years[0].key) + 1;
}

/* ---------- Donor behaviour ---------- */
// New vs. returning dollars per year: retention is the number a development
// office lives on, and it's derivable from gift dates alone.
export function retentionByYear(donations) {
  const years = [...new Set(donations.map(d => (d.date || '').slice(0, 4)).filter(Boolean))].sort();
  const seen = new Set();
  return years.map(y => {
    const gifts = donations.filter(d => (d.date || '').startsWith(y) && d.contactId);
    const ids = new Set(gifts.map(d => d.contactId));
    let newTotal = 0, retTotal = 0, newDonors = 0, retDonors = 0;
    ids.forEach(id => {
      const amt = gifts.filter(g => g.contactId === id).reduce((s, g) => s + (g.amount || 0), 0);
      if (seen.has(id)) { retTotal += amt; retDonors += 1; } else { newTotal += amt; newDonors += 1; }
    });
    ids.forEach(id => seen.add(id));
    return { key: y, newTotal, retTotal, newDonors, retDonors, total: newTotal + retTotal };
  });
}

/* ---------- LYBUNT / SYBUNT ---------- */
// The report a development office actually works from. LYBUNT = "Last Year But
// Unfortunately Not This year": gave in the prior year, nothing yet this year.
// SYBUNT widens that to anyone who has ever given but hasn't this year.
// Re-securing a lapsed donor is far cheaper than finding a new one, so this is
// a call list ranked by what's at stake, not a description of the past.
//
// `currentYear` defaults to the latest year with any gift, so the report stays
// meaningful on a fixed demo dataset instead of going blank every January.
export function lapsedDonors(donations, contacts, currentYear) {
  const yearOf = (d) => Number(String(d.date || '').slice(0, 4)) || 0;
  const years = donations.map(yearOf).filter(Boolean);
  if (!years.length) return { current: null, lybunt: [], sybunt: [], atRisk: 0 };

  const current = Number(currentYear) || Math.max(...years);
  const prior = current - 1;
  const byId = Object.fromEntries((contacts || []).map(c => [c.id, c]));

  const gaveCurrent = new Set();
  const priorTotal = {};        // id -> given in the prior year
  const lifetime = {};          // id -> given before this year
  const lastGift = {};          // id -> most recent prior gift { date, amount, campaign }

  donations.forEach(d => {
    if (!d.contactId) return;   // anonymous gifts can't be called back
    const y = yearOf(d);
    if (y === current) { gaveCurrent.add(d.contactId); return; }
    if (y > current) return;
    lifetime[d.contactId] = (lifetime[d.contactId] || 0) + (d.amount || 0);
    if (y === prior) priorTotal[d.contactId] = (priorTotal[d.contactId] || 0) + (d.amount || 0);
    const prev = lastGift[d.contactId];
    if (!prev || String(d.date) > String(prev.date)) lastGift[d.contactId] = d;
  });

  const row = (id, lapsedAmount) => {
    const c = byId[id];
    const last = lastGift[id];
    return {
      id,
      key: id,
      name: c?.name || last?.contactName || 'Unknown',
      lapsedAmount,                       // what they gave in the reference year
      lifetime: lifetime[id] || 0,
      lastGiftDate: last?.date || '',
      lastCampaign: last?.campaign || '',
      gradYear: c?.grad_year || '',
      location: c?.location || '',
      contact: c || null,
    };
  };

  const lybunt = Object.keys(priorTotal)
    .filter(id => !gaveCurrent.has(id))
    .map(id => row(id, priorTotal[id]))
    .sort((a, b) => b.lapsedAmount - a.lapsedAmount);

  // SYBUNT excludes the LYBUNT set so the two lists don't double-count.
  const sybunt = Object.keys(lifetime)
    .filter(id => !gaveCurrent.has(id) && !priorTotal[id])
    .map(id => row(id, lifetime[id]))
    .sort((a, b) => b.lapsedAmount - a.lapsedAmount);

  return {
    current,
    prior,
    lybunt,
    sybunt,
    atRisk: lybunt.reduce((s, r) => s + r.lapsedAmount, 0),
    sybuntValue: sybunt.reduce((s, r) => s + r.lifetime, 0),
  };
}

/* ---------- Derived headline insights ---------- */
// Plain-language takeaways, computed rather than written, so they stay true as
// the data changes. Each returns null when its slice is too thin to claim.
const pct = (v) => `${Math.round(v * 100)}%`;
const usd = (v) => '$' + Math.round(v || 0).toLocaleString('en-US');

export function insights(donations, contacts) {
  const out = [];
  if (donations.length < 5) return out;

  const camps = byCampaign(donations);
  const cohorts = byCohort(donations, contacts).filter(c => c.people >= 2);
  const cities = byCity(donations, contacts, 3);

  if (camps.length) {
    const topDollar = camps[0];
    const topAvg = [...camps].sort((a, b) => b.avg - a.avg)[0];
    const topReach = [...camps].sort((a, b) => b.donors - a.donors)[0];
    out.push({ label: 'Biggest campaign', value: topDollar.key, detail: `${usd(topDollar.total)} across ${topDollar.gifts} gifts` });
    if (topAvg.key !== topDollar.key) {
      out.push({ label: 'Highest average gift', value: topAvg.key, detail: `${usd(topAvg.avg)} per gift — a major-gift play, not a broad appeal` });
    }
    if (topReach.key !== topDollar.key) {
      out.push({ label: 'Widest reach', value: topReach.key, detail: `${topReach.donors} distinct donors (${pct(topReach.reach)} of all donors)` });
    }
    const growing = camps.filter(c => c.growth != null).sort((a, b) => b.growth - a.growth)[0];
    if (growing && growing.growth > 0.05) {
      out.push({ label: 'Fastest growing', value: growing.key, detail: `${pct(growing.growth)} per year over ${yearSpan(growing.years)} years` });
    }
    const shrinking = camps.filter(c => c.growth != null).sort((a, b) => a.growth - b.growth)[0];
    if (shrinking && shrinking.growth < -0.05 && shrinking.key !== growing?.key) {
      out.push({ label: 'Losing ground', value: shrinking.key, detail: `${pct(shrinking.growth)} per year — worth re-pitching or retiring` });
    }
    const loyal = [...camps].sort((a, b) => b.repeatRate - a.repeatRate)[0];
    if (loyal && loyal.repeatRate > 0) {
      out.push({ label: 'Best repeat giving', value: loyal.key, detail: `${pct(loyal.repeatRate)} of its donors gave more than once` });
    }
  }

  if (cohorts.length) {
    const byPart = [...cohorts].sort((a, b) => b.participation - a.participation)[0];
    const byDollar = [...cohorts].sort((a, b) => b.total - a.total)[0];
    out.push({ label: 'Most engaged classes', value: byPart.key, detail: `${pct(byPart.participation)} of ${byPart.people} alumni gave` });
    if (byDollar.key !== byPart.key) {
      out.push({ label: 'Largest cohort by dollars', value: byDollar.key, detail: `${usd(byDollar.total)} total, ${usd(byDollar.perAlum)} per alum on record` });
    }
    const untapped = [...cohorts].filter(c => c.people >= 5).sort((a, b) => a.participation - b.participation)[0];
    if (untapped && untapped.participation < 0.25) {
      out.push({ label: 'Most untapped', value: untapped.key, detail: `only ${pct(untapped.participation)} of ${untapped.people} alumni have given` });
    }
  }

  if (cities.length) {
    const topCity = cities[0];
    const bestPer = [...cities].sort((a, b) => b.perAlum - a.perAlum)[0];
    out.push({ label: 'Top city by dollars', value: topCity.key, detail: `${usd(topCity.total)} from ${topCity.donors} donors` });
    if (bestPer.key !== topCity.key) {
      out.push({ label: 'Best dollars per alum', value: bestPer.key, detail: `${usd(bestPer.perAlum)} per alum on record — highest yield per contact` });
    }
  }

  const inds = byIndustry(donations, contacts, 4).filter(i => !/student/i.test(i.key));
  if (inds.length) {
    const topInd = inds[0];
    const bestInd = [...inds].sort((a, b) => b.perAlum - a.perAlum)[0];
    out.push({ label: 'Top career field', value: topInd.key, detail: `${usd(topInd.total)} from ${topInd.donors} donors across ${topInd.people} alumni` });
    if (bestInd.key !== topInd.key) {
      out.push({ label: 'Highest-yield field', value: bestInd.key, detail: `${usd(bestInd.perAlum)} per alum — the field worth prospecting` });
    }
  }

  const colleges = byCollege(donations, contacts, 5);
  if (colleges.length) {
    const topCol = colleges[0];
    const bestCol = [...colleges].sort((a, b) => b.perAlum - a.perAlum)[0];
    out.push({ label: 'Top undergrad pipeline', value: topCol.key, detail: `${usd(topCol.total)} from ${topCol.people} alumni on record` });
    if (bestCol.key !== topCol.key) {
      out.push({ label: 'Best per-alum college', value: bestCol.key, detail: `${usd(bestCol.perAlum)} per alum from ${bestCol.people} alumni` });
    }
  }

  const months = monthSeries(donations).filter(m => m.gifts > 0);
  if (months.length >= 3) {
    const peak = [...months].sort((a, b) => b.total - a.total)[0];
    out.push({ label: 'Peak giving month', value: peak.key, detail: `${usd(peak.total)} across ${peak.gifts} gifts — time appeals to land here` });
  }

  const lapsed = lapsedDonors(donations, contacts);
  if (lapsed.lybunt.length) {
    out.push({
      label: `Lapsed since ${lapsed.prior} (LYBUNT)`,
      value: usd(lapsed.atRisk),
      detail: `${lapsed.lybunt.length} donors gave in ${lapsed.prior} but not ${lapsed.current} — the cheapest money to win back`,
    });
  }

  const ret = retentionByYear(donations);
  const lastYear = ret[ret.length - 1];
  if (lastYear && lastYear.total > 0) {
    const share = lastYear.retTotal / lastYear.total;
    out.push({
      label: `Retention (${lastYear.key})`,
      value: pct(share),
      detail: `${usd(lastYear.retTotal)} of ${usd(lastYear.total)} came from donors who had given before`,
    });
  }

  return out;
}
