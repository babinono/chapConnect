import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign } from 'lucide-react';
import { CAMPAIGNS, METHODS } from '../utils/crmStore';

// Add-a-donation modal. `contacts` is the full list for the searchable picker.
// `fixedContact` pre-selects & locks a contact (used from the detail drawer).
export default function DonationModal({ contacts = [], fixedContact = null, onClose, onSave }) {
  const [form, setForm] = useState({
    contactName: fixedContact?.name || '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    campaign: CAMPAIGNS[0],
    method: METHODS[0],
    note: '',
  });

  const change = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    let contactId = fixedContact?.id || null;
    let contactName = fixedContact?.name || form.contactName.trim();
    if (!contactId && contactName) {
      const match = contacts.find(c => c.name.toLowerCase() === contactName.toLowerCase());
      if (match) { contactId = match.id; contactName = match.name; }
    }
    if (!form.amount || Number(form.amount) <= 0) return;
    onSave({ ...form, contactId, contactName: contactName || 'Anonymous' });
  };

  const label = 'block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5 tracking-wide';
  const input = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-slate-50 dark:bg-[#0c1324] font-medium';

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#111a30] border border-slate-200 dark:border-white/10 rounded-2xl brutal-shadow p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" /> Log Donation
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={label}>Donor</label>
            {fixedContact ? (
              <div className={`${input} bg-slate-100 dark:bg-white/5`}>{fixedContact.name}</div>
            ) : (
              <>
                <input list="crm-contacts" name="contactName" value={form.contactName} onChange={change} className={input} placeholder="Search a name (or leave for Anonymous)" />
                <datalist id="crm-contacts">
                  {contacts.slice(0, 1000).map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Amount ($)</label>
              <input name="amount" type="number" min="1" required value={form.amount} onChange={change} className={input} placeholder="250" />
            </div>
            <div>
              <label className={label}>Date</label>
              <input name="date" type="date" value={form.date} onChange={change} className={input} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Campaign</label>
              <select name="campaign" value={form.campaign} onChange={change} className={`${input} font-bold`}>
                {CAMPAIGNS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Method</label>
              <select name="method" value={form.method} onChange={change} className={`${input} font-bold`}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Note (optional)</label>
            <input name="note" value={form.note} onChange={change} className={input} placeholder="e.g. Matched by employer" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold brutal-shadow cursor-pointer hover:translate-y-[1px]">Save Donation</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
