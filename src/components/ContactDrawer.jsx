import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign, Plus, Trash2, Tag as TagIcon, StickyNote } from 'lucide-react';
import { donationsFor, totalRaised, getNotes, addNote, deleteNote, getTags, setTags, deleteDonation, money } from '../utils/crmStore';

const FIELDS = [
  ['Type', 'source'], ['Class', 'grad_year'], ['Status', 'status'], ['Email', 'email'],
  ['Undergrad', 'college'], ['Major', 'major'], ['Further Education', 'education'],
  ['Company', 'company'], ['Position', 'career'], ['Location', 'location'],
  ['Preferred Contact', 'contact'], ['Newsletter', 'newsletter'], ['Student Contact', 'studentContact'], ['Joined', 'joined'],
];

export default function ContactDrawer({ contact, onClose, onAddDonation, refreshKey, onChanged, onDelete }) {
  const [noteText, setNoteText] = useState('');
  const [tagText, setTagText] = useState('');
  if (!contact) return null;

  const donations = donationsFor(contact.id);
  const total = totalRaised(donations);
  const notes = getNotes(contact.id);
  const tags = getTags(contact.id);

  const submitNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addNote(contact.id, noteText.trim());
    setNoteText('');
    onChanged && onChanged();
  };
  const addTag = (e) => {
    e.preventDefault();
    const t = tagText.trim();
    if (!t || tags.includes(t)) { setTagText(''); return; }
    setTags(contact.id, [...tags, t]);
    setTagText('');
    onChanged && onChanged();
  };
  const removeTag = (t) => { setTags(contact.id, tags.filter(x => x !== t)); onChanged && onChanged(); };
  const removeDonation = (id) => { deleteDonation(id); onChanged && onChanged(); };

  return (
    <motion.div className="fixed inset-0 z-[150] flex justify-end bg-navy-950/60"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside
        onClick={(e) => e.stopPropagation()}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md h-full overflow-y-auto bg-surface border-l border-rule p-6 panel"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold text-ink">{contact.name}</h3>
            <span className="text-sm font-medium text-ink-faint">
              {contact.grad_year ? `Class of ${contact.grad_year}` : contact.source}
            </span>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink cursor-pointer"><X className="w-6 h-6" /></button>
        </div>

        {/* Lifetime giving */}
        <div className="gradient-brand text-white p-4 mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-white/70 tracking-wide">Lifetime Giving</div>
            <div className="text-3xl font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(total)}</div>
            <div className="text-xs font-medium text-white/70">{donations.length} gift{donations.length === 1 ? '' : 's'}</div>
          </div>
          <button onClick={() => onAddDonation(contact)} className="bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-2 text-sm font-medium flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Gift
          </button>
        </div>

        {/* Profile fields */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
          {FIELDS.map(([label, key]) => (
            <div key={key}>
              <div className="text-xs font-medium text-ink-faint tracking-wide">{label}</div>
              <div className="text-sm font-medium text-ink break-words">{contact[key] || '-'}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-faint mb-2 tracking-wide"><TagIcon className="w-3.5 h-3.5" /> TAGS</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.length === 0 && <span className="text-sm text-ink-faint">No tags yet</span>}
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 bg-sunken text-ink-muted border border-rule text-xs font-medium px-2 py-1 panel">
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-action cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <form onSubmit={addTag} className="flex gap-2">
            <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Add tag (e.g. Major Donor)"
              className="flex-1 px-3 py-2 text-sm border border-rule bg-sunken font-medium focus:outline-none focus:border-action rounded-slight" />
            <button className="px-3 bg-surface border border-rule-strong text-ink hover:border-ink font-medium text-sm cursor-pointer rounded-slight">Add</button>
          </form>
        </div>

        {/* Donation history */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-faint mb-2 tracking-wide"><DollarSign className="w-3.5 h-3.5" /> DONATION HISTORY</div>
          {donations.length === 0 ? (
            <p className="text-sm text-ink-faint">No donations recorded.</p>
          ) : (
            <div className="space-y-2">
              {donations.map(d => (
                <div key={d.id} className="flex items-center justify-between bg-sunken border border-rule px-3 py-2 panel">
                  <div>
                    <div className="font-medium text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.amount)}</div>
                    <div className="text-xs text-ink-faint font-medium">{d.date} · {d.campaign}</div>
              <div className="text-xs text-ink-faint">{d.method}</div>
                  </div>
                  <button onClick={() => removeDonation(d.id)} className="text-ink-faint hover:text-action cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-faint mb-2 tracking-wide"><StickyNote className="w-3.5 h-3.5" /> NOTES</div>
          <form onSubmit={submitNote} className="flex gap-2 mb-3">
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Log an interaction..."
              className="flex-1 px-3 py-2 text-sm border border-rule bg-sunken font-medium focus:outline-none focus:border-action rounded-slight" />
            <button className="px-3 bg-action text-action-ink font-medium text-sm cursor-pointer">Save</button>
          </form>
          <div className="space-y-2">
            {notes.map(n => (
              <div key={n.id} className="bg-sunken border border-rule px-3 py-2 flex items-start justify-between gap-2 panel">
                <div>
                  <div className="text-sm font-medium text-ink">{n.text}</div>
                  <div className="text-xs text-ink-faint font-medium">{new Date(n.date).toLocaleString()}</div>
                </div>
                <button onClick={() => { deleteNote(contact.id, n.id); onChanged && onChanged(); }} className="text-ink-faint hover:text-action cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        {onDelete && (
          <div className="mt-8 pt-5 border-t border-rule">
            <button
              onClick={() => onDelete(contact)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-bad/40 text-bad font-medium cursor-pointer hover:border-bad hover:bg-sunken transition-colors rounded-slight"
            >
              <Trash2 className="w-4 h-4" /> Delete Record
            </button>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}
