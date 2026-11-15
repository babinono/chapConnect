// The groups you already belong to: your class, your college, your city, your
// field. Each opens the Directory narrowed to that group. `breakdown` comes
// from scoreAlumniPair, where the top score in a category means an exact match.
export const CIRCLES = [
  { key: 'cohort', top: 5, label: (c, me) => `Class of ${me.gradYear || c.gradYear}`, note: 'Your classmates' },
  { key: 'college', top: 35, label: (c) => c.primarySchool, note: 'Went where you went' },
  { key: 'location', top: 10, label: (c) => c.location, note: 'Live where you live' },
  { key: 'field', top: 30, label: () => 'Your field', note: 'Do what you do' },
];

export const inCircle = (m, key) => {
  const circle = CIRCLES.find(c => c.key === key);
  return !!circle && m.breakdown?.[key] === circle.top;
};

export const circleLabel = (key, matches, me = {}) => {
  const circle = CIRCLES.find(c => c.key === key);
  const first = matches.find(m => inCircle(m, key));
  return circle && first ? circle.label(first.candidate, me) : '';
};

