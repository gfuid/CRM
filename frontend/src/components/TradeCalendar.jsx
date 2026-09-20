import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Ship,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  ArrowRight
} from 'lucide-react';

export default function TradeCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 20)); // Sep 2026
  const [selectedDay, setSelectedDay] = useState(20);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Scheduled Export Consignments & Trade Milestones
  const scheduleData = {
    '2026-09-18': [
      {
        id: 'ev_1',
        type: 'shipment',
        title: 'Mundra Port Loading: 120 MT Rice DDGS',
        destination: 'CIF Rotterdam, Netherlands 🇳🇱',
        buyer: 'Continental Feeds BV',
        status: 'Customs Cleared',
        tag: 'Vessel MSC Rosa',
        color: 'emerald',
      },
    ],
    '2026-09-19': [
      {
        id: 'ev_2',
        type: 'inspection',
        title: 'SGS Moisture Lab Test: 36 MT Teja Red Chilli',
        destination: 'VietSpices Co, Vietnam 🇻🇳',
        buyer: 'Nguyen Van Minh',
        status: 'Passed (11.2% Moisture)',
        tag: 'Lab Phytosanitary',
        color: 'blue',
      },
      {
        id: 'ev_3',
        type: 'followup',
        title: 'Draft LC Review & Proforma Negotiation',
        destination: 'Al-Barakah Agro, Dubai 🇦🇪',
        buyer: 'Tariq Mansoor',
        status: 'Confirmed 11:00 AM',
        tag: 'WhatsApp Call',
        color: 'purple',
      },
    ],
    '2026-09-20': [
      {
        id: 'ev_4',
        type: 'shipment',
        title: 'Dispatch: 50 MT Curcumin 3.5% Turmeric Fingers',
        destination: 'CIF Jebel Ali Port, Dubai 🇦🇪',
        buyer: 'Al-Barakah Global Agro Foods',
        status: 'Containers Sealed',
        tag: 'CAD on BL copy',
        color: 'emerald',
      },
      {
        id: 'ev_5',
        type: 'task',
        title: 'Petrapole Border Rail Consignment: 85 MT Maize',
        destination: 'Dhaka Agro Feeds, Bangladesh 🇧🇩',
        buyer: 'Kamal Hossain',
        status: 'Rake Loaded',
        tag: 'High Priority',
        color: 'amber',
      },
    ],
    '2026-09-21': [
      {
        id: 'ev_6',
        type: 'inspection',
        title: 'Reefer Container Pre-Cooling (+12°C)',
        destination: 'Colombo Port, Sri Lanka 🇱🇰',
        buyer: 'Ceylon Tropical Goods PLC',
        status: 'Tuticorin Port Dock',
        tag: 'Tender Coconut',
        color: 'blue',
      },
    ],
    '2026-09-23': [
      {
        id: 'ev_7',
        type: 'payment',
        title: 'Irrevocable LC 90 Days Maturity Verification',
        destination: 'State Bank Trade Finance',
        buyer: 'Dhaka Agro Feeds Ltd',
        status: 'Pending Bank Advice',
        tag: 'LC #BD-8812',
        color: 'purple',
      },
    ],
    '2026-09-26': [
      {
        id: 'ev_8',
        type: 'shipment',
        title: 'Vessel Departure: Red Chilli Teja Stemless',
        destination: 'Hai Phong Port, Vietnam 🇻🇳',
        buyer: 'VietSpices Import & Distribution',
        status: 'Bill of Lading Drafted',
        tag: '2x40ft Containers',
        color: 'emerald',
      },
    ],
    '2026-09-28': [
      {
        id: 'ev_9',
        type: 'followup',
        title: 'Q4 Contract Advance Sourcing Meeting',
        destination: 'Gulfood Trade Partner Network',
        buyer: 'Multi-buyer Procurement Desk',
        status: 'Virtual Conference',
        tag: 'Annual Contracts',
        color: 'amber',
      },
    ],
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 8, 20));
    setSelectedDay(20);
  };

  const selectedDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedEvents = scheduleData[selectedDateKey] || [];

  return (
    <div className="space-y-4">
      {/* Calendar Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CalendarIcon size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{monthNames[month]} {year}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                Trade Logistics & Schedule
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Vessel departures, port customs, sample dispatches, and LC verification dates
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 text-center py-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Date Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 text-xs">
          {/* Blank cells for offset */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`blank-${idx}`} className="h-16 sm:h-20 bg-slate-50/40 p-1" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
            const dayNum = dayIdx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const events = scheduleData[dateStr] || [];
            const isSelected = selectedDay === dayNum;
            const isToday = dayNum === 20 && month === 8 && year === 2026;

            return (
              <div
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`h-16 sm:h-20 p-1 sm:p-1.5 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-50/80 ring-2 ring-emerald-500 ring-inset'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                      isToday
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isSelected
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {events.length > 0 && (
                    <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>

                {/* Event Tags */}
                <div className="space-y-0.5 overflow-hidden">
                  {events.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[9px] sm:text-[10px] truncate px-1 py-0.2 rounded font-bold ${
                        ev.color === 'emerald'
                          ? 'bg-emerald-100 text-emerald-900'
                          : ev.color === 'blue'
                          ? 'bg-blue-100 text-blue-900'
                          : ev.color === 'purple'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <div className="text-[9px] text-slate-400 font-bold text-right">
                      +{events.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Milestones Inspector */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-black text-slate-900">
              Schedule for {selectedDay} {monthNames[month]} {year}:
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {selectedEvents.length} Active {selectedEvents.length === 1 ? 'Milestone' : 'Milestones'}
          </span>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            No shipping cargo dispatches or client check-ins scheduled for this day. Click dates with highlights to inspect trade actions.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-start justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                        ev.color === 'emerald'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ev.color === 'blue'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {ev.tag}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {ev.status}
                    </span>
                  </div>
                  <div className="font-extrabold text-xs text-slate-900 mt-1">{ev.title}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <span>{ev.buyer}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-700 font-semibold">{ev.destination}</span>
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400">
                  {ev.type === 'shipment' ? (
                    <Ship size={16} className="text-emerald-600" />
                  ) : ev.type === 'followup' ? (
                    <Phone size={16} className="text-purple-600" />
                  ) : (
                    <FileText size={16} className="text-blue-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
