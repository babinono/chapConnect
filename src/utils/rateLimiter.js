const MATCHES_KEY = 'chap_connect_matches';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export function getActiveMatches() {
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    const timestamps = raw ? JSON.parse(raw) : [];
    
    // Filter out matches older than 2 weeks
    const now = Date.now();
    const active = timestamps.filter(t => (now - t) < TWO_WEEKS_MS);
    
    // Update local storage if any were removed
    if (active.length !== timestamps.length) {
      localStorage.setItem(MATCHES_KEY, JSON.stringify(active));
    }
    
    return active.sort((a, b) => a - b);
  } catch (e) {
    console.error("Error reading rate limits", e);
    return [];
  }
}

export function checkLimit() {
  // Rate limiting is temporarily disabled for developer testing
  return {
    allowed: true,
    nextAvailableDate: null
  };
}

export function recordMatch() {
  try {
    const active = getActiveMatches();
    active.push(Date.now());
    localStorage.setItem(MATCHES_KEY, JSON.stringify(active));
  } catch (e) {
    console.error("Error recording match timestamp", e);
  }
}
