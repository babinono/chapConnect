import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Lock, CheckCircle2, Mail, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { sendRelayMessage, obscureEmail, isContactUnlocked } from '../utils/messageRelayStore';

export default function SendMessageModal({
  isOpen,
  onClose,
  recipient,
  currentUser,
  defaultSubject = '',
  defaultBody = '',
  onSent,
}) {
  const [subject, setSubject] = useState(defaultSubject || `Connecting via Chap Connect — Westlake Alumni`);
  const [body, setBody] = useState(defaultBody || '');
  const [isSent, setIsSent] = useState(false);
  const [lastSentMsg, setLastSentMsg] = useState(null);

  React.useEffect(() => {
    if (isOpen) {
      setSubject(defaultSubject || `Connecting via Chap Connect — Westlake Alumni`);
      setBody(defaultBody || '');
      setIsSent(false);
    }
  }, [isOpen, recipient, defaultSubject, defaultBody]);

  if (!isOpen || !recipient) return null;

  const recipientId = recipient.id || recipient.sourceId || recipient.key || 'contact';
  const recipientName = recipient.name || 'Alumni Contact';
  const recipientRole = recipient.career || recipient.current_position || recipient.role || recipient.primaryCareer || 'Westlake Alum';
  const recipientEmail = recipient.email || recipient.contactInfo || '';
  const isUnlocked = currentUser?.user?.id ? isContactUnlocked(currentUser.user.id, recipientId) : false;
  const displayEmail = isUnlocked
    ? (recipientEmail || 'Unlocked Direct Contact')
    : (recipientEmail ? (recipient.obscuredEmail || obscureEmail(recipientEmail)) : 'chap-relay@chapconnect.org (Protected)');

  const senderName = currentUser?.user?.user_metadata?.full_name || currentUser?.name || 'A fellow Chap';
  const senderEmail = currentUser?.user?.email || currentUser?.email || 'chap@chapconnect.org';

  const handleSend = (e) => {
    e.preventDefault();
    if (!body.trim()) return;

    const senderId = currentUser?.user?.id || 'local_user';

    const sent = sendRelayMessage({
      senderId,
      senderName,
      senderEmail,
      recipientId,
      recipientName,
      recipientEmail,
      subject,
      body,
    });

    setLastSentMsg(sent);
    setIsSent(true);
    if (onSent) onSent(sent);
  };

  const handleResetAndClose = () => {
    setIsSent(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface border border-rule w-full max-w-lg p-6 sm:p-8 panel shadow-2xl relative max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-rule">
            <div>
              <span className="text-xs font-semibold tracking-wider text-action uppercase">Direct Email Relay</span>
              <h2 className="text-2xl font-semibold text-ink tracking-tight mt-0.5">
                Message {recipientName}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">{recipientRole}</p>
            </div>
            <button
              onClick={handleResetAndClose}
              className="p-1 text-ink-faint hover:text-ink transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSent ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6 text-center space-y-4"
            >
              <div className="w-14 h-14 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-ink">Delivered to Their Email Inbox!</h3>
              <p className="text-sm text-ink-muted max-w-sm mx-auto leading-relaxed">
                Your message was sent to <strong className="text-ink">{displayEmail}</strong> with your email attached as the Reply-To address.
              </p>

              {/* Email Relay Receipt */}
              <div className="bg-sunken border border-rule p-4 text-xs text-left panel space-y-2 text-ink">
                <div className="font-semibold text-action flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Dispatch Receipt</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-ink-muted">
                  <div><strong>To:</strong> {recipientName} &lt;{displayEmail}&gt;</div>
                  <div><strong>Reply-To:</strong> {senderName} &lt;{senderEmail}&gt;</div>
                  <div><strong>Subject:</strong> {subject}</div>
                </div>
                <div className="pt-2 border-t border-rule text-xs text-ink-muted font-sans leading-relaxed">
                  When <strong>{recipientName}</strong> opens the email and hits <strong>Reply</strong>, their response goes directly to your email (<strong className="text-ink">{senderEmail}</strong>). Their reply also unlocks their full profile contact details on Chap Connect!
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleResetAndClose}
                  className="w-full py-3 px-4 bg-action text-action-ink font-medium rounded-slight hover:bg-action-hover transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4 pt-4">
              {/* Privacy Notice Box with Sender Reply-To */}
              <div className="bg-sunken border border-rule p-3.5 flex items-start gap-3 panel">
                <Lock className="w-4 h-4 text-action shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-ink-muted">
                  <div className="font-semibold text-ink flex items-center gap-2">
                    <span>Recipient Email Obscured:</span>
                    <span className="font-mono bg-surface border border-rule px-1.5 py-0.5 text-ink-faint rounded-xs">
                      {displayEmail}
                    </span>
                  </div>
                  <p className="mt-1">
                    This message delivers directly to their personal inbox. Your email (<strong className="text-ink font-mono">{senderEmail}</strong>) is attached as the <strong>Reply-To</strong> address so they can simply hit reply from their email account to message you back!
                  </p>
                </div>
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject of your message..."
                  className="w-full px-3.5 py-2.5 text-sm bg-sunken border border-rule text-ink focus:outline-none focus:border-action panel rounded-slight"
                />
              </div>

              {/* Message Body Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-faint mb-1.5">
                  Your Message
                </label>
                <textarea
                  required
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Introduce yourself and share what you'd love to connect about..."
                  className="w-full px-3.5 py-2.5 text-sm bg-sunken border border-rule text-ink focus:outline-none focus:border-action panel rounded-slight leading-relaxed"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium bg-action text-action-ink hover:bg-action-hover transition-colors flex items-center gap-2 rounded-slight cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send via Relay</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
