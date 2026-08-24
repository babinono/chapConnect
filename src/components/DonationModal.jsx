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

  const label = 'block text-sm font-medium text-ink mb-1.5 tracking-wide';
  const input = 'w-full px-4 py-2.5 border border-rule focus:outline-none focus:border-action bg-sunken font-medium panel';

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy-950/60"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface border border-rule p-6 panel"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-semibold text-ink flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-good" /> Log Donation
          </h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={label}>Donor</label>
            {fixedContact ? (
              <div className={`${input} bg-sunken`}>{fixedContact.name}</div>
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
              <select name="campaign" value={form.campaign} onChange={change} className={` font-medium`}>
                {CAMPAIGNS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Method</label>
              <select name="method" value={form.method} onChange={change} className={` font-medium`}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Note (optional)</label>
            <input name="note" value={form.note} onChange={change} className={input} placeholder="e.g. Matched by employer" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-rule font-medium text-ink-muted cursor-pointer hover:bg-sunken rounded-slight">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-signal-good text-white font-medium cursor-pointer">Save Donation</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
