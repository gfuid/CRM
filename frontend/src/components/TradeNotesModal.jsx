import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Clock, Trash2, X, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TradeNotesModal({ isOpen, onClose }) {
  const { profile } = useAuth();

  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_trade_notes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 1,
        author: 'punia (Admin)',
        text: 'Buyer Al Barakah Agro requested revised proforma invoice with CIF Jebel Ali terms.',
        timestamp: 'Today, 2:30 PM',
        tag: 'Negotiation',
      },
      {
        id: 2,
        author: 'Export Desk',
        text: 'Nhava Sheva shipping line confirmed container slot for 40ft High Cube Basmati Rice dispatch.',
        timestamp: 'Yesterday, 5:15 PM',
        tag: 'Shipping',
      },
      {
        id: 3,
        author: 'punia (Admin)',
        text: 'Sample parcel dispatched via DHL to Singapore Spices. Tracking ID sent to buyer on WhatsApp.',
        timestamp: 'Sep 18, 11:20 AM',
        tag: 'Samples',
      },
    ];
  });

  const [newNote, setNewNote] = useState('');
  const [tag, setTag] = useState('Negotiation');

  useEffect(() => {
    try {
      localStorage.setItem('crm_trade_notes', JSON.stringify(notes));
    } catch {}
  }, [notes]);

  if (!isOpen) return null;

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const item = {
      id: Date.now(),
      author: profile?.name || 'punia',
      text: newNote.trim(),
      timestamp: 'Just now',
      tag,
    };

    setNotes([item, ...notes]);
    setNewNote('');
  };

  const handleDelete = (id) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/30 dark:bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Internal Trade Notes & Messages
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Shared notes on active buyers, quotations & shipments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddNote} className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="Negotiation">Negotiation</option>
              <option value="Shipping">Shipping</option>
              <option value="Samples">Samples</option>
              <option value="Payments">Payments</option>
              <option value="Quality">Quality/SGS</option>
            </select>
            <span className="text-[11px] text-slate-400">Add an operational note for your team</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="e.g. Spoke with buyer regarding L/C amendment..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!newNote.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-40"
            >
              <Send size={12} />
              <span>Post</span>
            </button>
          </div>
        </form>

        {/* Notes Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/80">
          {notes.map((note) => (
            <div key={note.id} className="pt-3 first:pt-0 group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {note.author}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {note.tag}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{note.timestamp}</span>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {note.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
