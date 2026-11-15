// What an alum is happy to hear from another Chap about. Saved as a list of
// ids in the profile meta (`openTo`) and shown on their card.
export const OPEN_TO = [
  { id: 'coffee', label: 'Coffee in my city' },
  { id: 'career', label: 'Career questions' },
  { id: 'intros', label: 'Intros and referrals' },
  { id: 'moving', label: 'Tips on moving to my city' },
  { id: 'meetups', label: 'Class meetups' },
];

export const openToLabels = (ids = []) =>
  OPEN_TO.filter(o => ids.includes(o.id)).map(o => o.label);
