import { supabase } from './supabaseClient.js';

const K_MESSAGES = 'cc_relay_messages_v1';
let _messages = [];
let _loaded = false;
let _mode = 'local';

function lread(k, f) {
  try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; }
}
function lwrite(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

function genId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch { /* ignore */ }
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Obscures an email address for privacy.
 * e.g. "sarah.chen@google.com" -> "s•••n@g••••e.com"
 */
export function obscureEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return 'c•••••t@alumni.whs.org';
  }
  const [local, domain] = email.trim().toLowerCase().split('@');
  const maskString = (str) => {
    if (str.length <= 2) return `${str[0]}•`;
    return `${str[0]}${'•'.repeat(Math.min(5, Math.max(3, str.length - 2)))}${str[str.length - 1]}`;
  };

  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? `${maskString(domainParts[0])}.${domainParts.slice(1).join('.')}`
    : maskString(domain);

  return `${maskString(local)}@${maskedDomain}`;
}

export async function initMessageRelay() {
  if (_loaded) return _mode;
  try {
    const { data, error } = await supabase.from('relay_messages').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    _mode = 'supabase';
    _messages = (data || []).map(r => ({
      id: r.id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      senderEmail: r.sender_email,
      recipientId: r.recipient_id,
      recipientName: r.recipient_name,
      recipientEmail: r.recipient_email,
      obscuredEmail: r.obscured_email || obscureEmail(r.recipient_email),
      subject: r.subject,
      body: r.body,
      status: r.status || 'delivered',
      replyStatus: r.reply_status || 'pending',
      replyText: r.reply_text || '',
      repliedAt: r.replied_at || null,
      createdAt: r.created_at,
    }));
  } catch {
    _mode = 'local';
    _messages = lread(K_MESSAGES, []);
  }
  _loaded = true;
  return _mode;
}

export function getAllMessages() {
  if (!_loaded) {
    _messages = lread(K_MESSAGES, []);
  }
  return _messages.slice();
}

export function getMessagesForUser(userId) {
  const all = getAllMessages();
  return all.filter(m => m.senderId === userId || m.recipientId === userId);
}

export function getMessagesBetween(userId, contactId) {
  const all = getAllMessages();
  return all.filter(m => 
    (m.senderId === userId && String(m.recipientId) === String(contactId)) ||
    (String(m.senderId) === String(contactId) && m.recipientId === userId)
  );
}

/**
 * Checks whether full contact access has been unlocked.
 * A contact is unlocked if the recipient has replied to an outreach message.
 */
export function isContactUnlocked(userId, contactId) {
  const msgs = getMessagesBetween(userId, contactId);
  return msgs.some(m => m.replyStatus === 'replied');
}

/**
 * Sends a message through the email relay.
 * The recipient's email is obscured in the UI.
 */
export function sendRelayMessage({
  senderId,
  senderName,
  senderEmail,
  recipientId,
  recipientName,
  recipientEmail,
  subject,
  body,
}) {
  const id = genId();
  const obscured = obscureEmail(recipientEmail);
  const now = new Date().toISOString();

  const record = {
    id,
    senderId,
    senderName: senderName || 'A fellow Chap',
    senderEmail: senderEmail || 'chap@chapconnect.org',
    recipientId: String(recipientId),
    recipientName: recipientName || 'Alumni Contact',
    recipientEmail: recipientEmail || '',
    obscuredEmail: obscured,
    subject: subject || 'Connecting via Chap Connect',
    body: body || '',
    status: 'delivered',
    replyStatus: 'pending',
    replyText: '',
    repliedAt: null,
    createdAt: now,
  };

  _messages.unshift(record);

  if (_mode === 'supabase') {
    supabase.from('relay_messages').insert([{
      id: record.id,
      sender_id: record.senderId,
      sender_name: record.senderName,
      sender_email: record.senderEmail,
      recipient_id: record.recipientId,
      recipient_name: record.recipientName,
      recipient_email: record.recipientEmail,
      obscured_email: record.obscuredEmail,
      subject: record.subject,
      body: record.body,
      status: record.status,
      reply_status: record.replyStatus,
      created_at: record.createdAt,
    }]).then(({ error }) => {
      if (error) console.error('[relay] Failed to persist message to Supabase:', error);
    });
  } else {
    lwrite(K_MESSAGES, _messages);
  }

  return record;
}

/**
 * Marks a message as replied (simulating an email response or handling a webhook).
 * This permanently unlocks direct contact exchange between the two users.
 */
export function recordReply(messageId, replyText = "Hi! Great to connect. Looking forward to chatting!") {
  const msg = _messages.find(m => m.id === messageId);
  if (!msg) return null;

  msg.replyStatus = 'replied';
  msg.replyText = replyText;
  msg.repliedAt = new Date().toISOString();

  if (_mode === 'supabase') {
    supabase.from('relay_messages').update({
      reply_status: 'replied',
      reply_text: replyText,
      replied_at: msg.repliedAt,
    }).eq('id', messageId).then(({ error }) => {
      if (error) console.error('[relay] Failed to record reply in Supabase:', error);
    });
  } else {
    lwrite(K_MESSAGES, _messages);
  }

  return msg;
}
