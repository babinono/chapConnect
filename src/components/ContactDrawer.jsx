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
    <motion.div className="fixed inset-0 z-[150] flex justify-end bg-slate-900/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside
        onClick={(e) => e.stopPropagation()}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="w-full max-w-md h-full overflow-y-auto bg-white dark:bg-[#0c1324] border-l border-slate-200 dark:border-white/10 p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{contact.name}</h3>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {contact.grad_year ? `Class of ${contact.grad_year}` : contact.source}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"><X className="w-6 h-6" /></button>
        </div>

        {/* Lifetime giving */}
        <div className="rounded-xl gradient-brand text-white p-4 mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white/70 tracking-wide">Lifetime Giving</div>
            <div className="text-3xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(total)}</div>
            <div className="text-xs font-bold text-white/70">{donations.length} gift{donations.length === 1 ? '' : 's'}</div>
          </div>
          <button onClick={() => onAddDonation(contact)} className="bg-white/15 hover:bg-white/25 border border-white/25 rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Gift
          </button>
        </div>

        {/* Profile fields */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
          {FIELDS.map(([label, key]) => (
            <div key={key}>
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wide">{label}</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200 break-words">{contact[key] || '—'}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wide"><TagIcon className="w-3.5 h-3.5" /> TAGS</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.length === 0 && <span className="text-sm text-slate-400">No tags yet</span>}
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-bold px-2 py-1 rounded-full">
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <form onSubmit={addTag} className="flex gap-2">
            <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Add tag (e.g. Major Donor)"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111a30] font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20" />
            <button className="px-3 rounded-lg bg-slate-900 dark:bg-white/10 text-white font-bold text-sm cursor-pointer">Add</button>
          </form>
        </div>

        {/* Donation history */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wide"><DollarSign className="w-3.5 h-3.5" /> DONATION HISTORY</div>
          {donations.length === 0 ? (
            <p className="text-sm text-slate-400">No donations recorded.</p>
          ) : (
            <div className="space-y-2">
              {donations.map(d => (
                <div key={d.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(d.amount)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">{d.date} · {d.campaign} · {d.method}</div>
                  </div>
                  <button onClick={() => removeDonation(d.id)} className="text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wide"><StickyNote className="w-3.5 h-3.5" /> NOTES</div>
          <form onSubmit={submitNote} className="flex gap-2 mb-3">
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Log an interaction..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111a30] font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20" />
            <button className="px-3 rounded-lg bg-blue-600 text-white font-bold text-sm cursor-pointer">Save</button>
          </form>
          <div className="space-y-2">
            {notes.map(n => (
              <div key={n.id} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{n.text}</div>
                  <div className="text-[11px] text-slate-400 font-bold">{new Date(n.date).toLocaleString()}</div>
                </div>
                <button onClick={() => { deleteNote(contact.id, n.id); onChanged && onChanged(); }} className="text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        {onDelete && (
          <div className="mt-8 pt-5 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={() => onDelete(contact)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold cursor-pointer hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete Record
            </button>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}
