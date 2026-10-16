import { supabase } from './supabaseClient.js';

const K_BOARD = 'cc_message_board_posts_v1';
let _posts = [];
let _loaded = false;
let _mode = 'local';

const SEED_POSTS = [
  {
    id: 'post-mag-fall-26',
    title: 'The Chaparral Review — Fall Alumni Magazine Issue',
    category: 'Alumni Magazine',
    summary: 'Celebrating 50 years of Westlake excellence, campus improvements, and alumni pioneers across tech, medicine, and the arts.',
    content: `Welcome to the Fall issue of The Chaparral Review! In this issue, we highlight Westlake alumni who are making waves nationwide, look back at the origins of Chaparral Stadium, and explore the new state-of-the-art STEM facilities opened on campus this semester.\n\nKey features in this issue:\n• 50 Years of Westlake Chaps: Looking back at the early graduating classes.\n• Alumni in Medicine: How WHS alumni at UT Dell Med and Baylor are revolutionizing patient care.\n• Foundation Highlights: Over $2.5M in educator grants distributed for classroom innovation.\n\nPick up a print copy at the EEF Alumni Center or read online.`,
    author: 'Eanes Alumni Office',
    date: 'Oct 12, 2026',
    linkUrl: 'https://eaneseducationfoundation.org/alumni/',
    imageUrl: '',
    pinned: true,
  },
  {
    id: 'post-spotlight-sarah',
    title: "Alumni Spotlight: Sarah Chen ('08) on Scaling AI Teams",
    category: 'Spotlight',
    summary: 'Google engineering director and Westlake alumna Sarah Chen reflects on how Robotics Club and AP Calculus laid the foundation for leading distributed AI teams.',
    content: `"When I was tinkering with sensors in the robotics lab at Westlake, I had no idea that same problem-solving rhythm would define my career," says Sarah Chen ('08).\n\nAfter graduating from WHS, Sarah attended UT Austin for Computer Science before moving to Silicon Valley. Today, she leads a machine learning infrastructure team at Google. Her advice for young Chaps? "Stay intensely curious and don't be afraid to reach out to people who walked the path before you."`,
    author: 'Alumni Feature Desk',
    date: 'Sep 28, 2026',
    linkUrl: '',
    imageUrl: '',
    pinned: false,
  },
  {
    id: 'post-event-homecoming',
    title: 'Homecoming Tailgate & Chaps Under the Lights',
    category: 'Events',
    summary: 'Join alumni of all classes for the annual pre-game tailgate, live music, and Friday Night Lights at Chaparral Stadium.',
    content: `Dust off your red and blue! The annual Westlake Homecoming game is just around the corner. The Alumni Association is hosting a community tent featuring local Austin food trucks, gear giveaways, and special recognition for the milestone reunion classes (Classes of 1976, 1986, 1996, 2006, and 2016).\n\nDate: Friday, November 6th\nTime: 5:00 PM Tailgate, 7:30 PM Kickoff\nLocation: Chaparral Stadium Alumni Pavilion`,
    author: 'WHS Alumni Association',
    date: 'Sep 15, 2026',
    linkUrl: 'https://www.eanesisd.net/',
    imageUrl: '',
    pinned: false,
  },
  {
    id: 'post-milestone-mentors',
    title: 'Chap Connect Mentorship Network Surpasses 1,000 Connections',
    category: 'Campus News',
    summary: 'High school seniors and college graduates across the country have logged over 1,000 mentorship coffee chats and career exchanges.',
    content: `Since launching our digital networking initiative, over 1,000 student-to-alumni and alumni-to-alumni connections have taken place through Chap Connect.\n\nFrom guiding seniors through college decision season to helping recent grads break into competitive industries, the Chap network continues to be one of the strongest public school communities in Texas. Thank you to every mentor giving back!`,
    author: 'Eanes Education Foundation',
    date: 'Aug 20, 2026',
    linkUrl: '',
    imageUrl: '',
    pinned: false,
  },
];

function lread(k, f) {
  try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; }
}
function lwrite(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

function genId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch { /* ignore */ }
  return `board-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function initMessageBoard() {
  if (_loaded) return _mode;
  try {
    const { data, error } = await supabase.from('board_posts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    _mode = 'supabase';
    _posts = (data && data.length > 0)
      ? data.map(r => ({
          id: r.id,
          title: r.title,
          category: r.category || 'Alumni Magazine',
          summary: r.summary || '',
          content: r.content || '',
          author: r.author || 'Admin',
          date: r.date || new Date(r.created_at).toLocaleDateString(),
          linkUrl: r.link_url || '',
          imageUrl: r.image_url || '',
          pinned: !!r.pinned,
          createdAt: r.created_at,
        }))
      : SEED_POSTS.slice();
  } catch {
    _mode = 'local';
    const saved = lread(K_BOARD, null);
    if (!saved || saved.length === 0) {
      _posts = SEED_POSTS.slice();
      lwrite(K_BOARD, _posts);
    } else {
      _posts = saved;
    }
  }
  _loaded = true;
  return _mode;
}

export function getBoardPosts() {
  if (!_loaded) {
    const saved = lread(K_BOARD, null);
    _posts = (saved && saved.length > 0) ? saved : SEED_POSTS.slice();
  }
  return _posts.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
}

export function addBoardPost(post) {
  const id = genId();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const record = {
    id,
    title: post.title || 'Alumni Update',
    category: post.category || 'Alumni Magazine',
    summary: post.summary || '',
    content: post.content || '',
    author: post.author || 'Admin',
    date: dateStr,
    linkUrl: post.linkUrl || '',
    imageUrl: post.imageUrl || '',
    pinned: !!post.pinned,
    createdAt: now.toISOString(),
  };

  _posts.unshift(record);

  if (_mode === 'supabase') {
    supabase.from('board_posts').insert([{
      id: record.id,
      title: record.title,
      category: record.category,
      summary: record.summary,
      content: record.content,
      author: record.author,
      date: record.date,
      link_url: record.linkUrl,
      image_url: record.imageUrl,
      pinned: record.pinned,
    }]).then(({ error }) => {
      if (error) console.error('[board] Failed to persist post to Supabase:', error);
    });
  } else {
    lwrite(K_BOARD, _posts);
  }

  return record;
}

export function updateBoardPost(id, updates) {
  const index = _posts.findIndex(p => p.id === id);
  if (index === -1) return null;

  _posts[index] = { ..._posts[index], ...updates };

  if (_mode === 'supabase') {
    supabase.from('board_posts').update({
      title: _posts[index].title,
      category: _posts[index].category,
      summary: _posts[index].summary,
      content: _posts[index].content,
      author: _posts[index].author,
      link_url: _posts[index].linkUrl,
      pinned: _posts[index].pinned,
    }).eq('id', id).then(({ error }) => {
      if (error) console.error('[board] Failed to update post in Supabase:', error);
    });
  } else {
    lwrite(K_BOARD, _posts);
  }

  return _posts[index];
}

export function deleteBoardPost(id) {
  _posts = _posts.filter(p => p.id !== id);
  if (_mode === 'supabase') {
    supabase.from('board_posts').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[board] Failed to delete post in Supabase:', error);
    });
  } else {
    lwrite(K_BOARD, _posts);
  }
}
