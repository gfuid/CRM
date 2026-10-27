import React, { useState } from 'react';
import { Bot, X, ChevronLeft } from 'lucide-react';
import { AssistantChat, NewTicketForm, openTicket } from './SupportParts';

/** Floating "Ask AI" button on every page. Hidden on the Help & Support page (it has the full chat). */
export default function AssistantWidget({ activeTab, setActiveTab }) {
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState(null);

  if (activeTab === 'support') return null;

  const goToTicket = (t) => {
    setOpen(false);
    setTicket(null);
    openTicket(t?.id);
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Help assistant"
          className="fixed z-50 right-3 left-3 sm:left-auto bottom-36 md:bottom-24 sm:w-96 h-[65vh] max-h-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-100">
              {ticket ? (
                <button type="button" onClick={() => setTicket(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer" aria-label="Back to chat"><ChevronLeft size={14} /></button>
              ) : <Bot size={15} className="text-emerald-600" />}
              {ticket ? 'Raise a support ticket' : 'Help Assistant'}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer" aria-label="Close"><X size={15} /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {ticket ? (
              <div className="p-3">
                <NewTicketForm initialSubject={ticket.subject} transcript={ticket.transcript} onCancel={() => setTicket(null)} onCreated={goToTicket} />
              </div>
            ) : (
              <AssistantChat compact onRaiseTicket={(transcript, q) => setTicket({ transcript, subject: q })} />
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed z-50 right-4 bottom-20 md:bottom-6 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center cursor-pointer"
        title="Ask the AI assistant"
        aria-label={open ? 'Close help assistant' : 'Open help assistant'}
      >
        {open ? <X size={20} /> : <Bot size={22} />}
      </button>
    </>
  );
}
