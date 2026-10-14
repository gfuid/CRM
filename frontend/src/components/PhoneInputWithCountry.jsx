import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import CountryFlag from './CountryFlag';
import {
  COUNTRY_CODES,
  findCountry,
  parsePhoneNumber,
  formatFullPhoneNumber,
} from '../data/countryCodes';

export default function PhoneInputWithCountry({
  value = '',
  countryCode = '',
  defaultCountry = '',
  onChange,
  placeholder = 'e.g. 11 268 8960',
  id = '',
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const numberInputRef = useRef(null);

  // Parse initial or incoming value
  const parsed = useMemo(() => {
    return parsePhoneNumber(value, countryCode || defaultCountry);
  }, [value, countryCode, defaultCountry]);

  const [selectedCountry, setSelectedCountry] = useState(parsed.country);
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);

  // Keep internal state synchronized with external prop updates
  useEffect(() => {
    const currentParsed = parsePhoneNumber(value, countryCode || defaultCountry);
    setSelectedCountry(currentParsed.country);
    setLocalNumber(currentParsed.localNumber);
  }, [value, countryCode, defaultCountry]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Click outside and escape key handling
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filter countries by search query
  const { priorityList, otherList } = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return {
        priorityList: COUNTRY_CODES.filter((c) => c.priority),
        otherList: COUNTRY_CODES.filter((c) => !c.priority).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      };
    }

    const filtered = COUNTRY_CODES.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      const matchDial = c.dial_code.replace('+', '').includes(q.replace('+', ''));
      return matchName || matchCode || matchDial;
    });

    return {
      priorityList: filtered.filter((c) => c.priority),
      otherList: filtered.filter((c) => !c.priority),
    };
  }, [search]);

  // Handle country selection
  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    const full = formatFullPhoneNumber(country.dial_code, localNumber);
    if (onChange) {
      onChange(full, country.dial_code, localNumber);
    }
    setTimeout(() => {
      numberInputRef.current?.focus();
    }, 50);
  };

  // Handle local phone number text change
  const handleNumberChange = (e) => {
    const val = e.target.value;

    // If user pasted or typed full international number starting with '+'
    if (val.startsWith('+')) {
      const reParsed = parsePhoneNumber(val, selectedCountry.code);
      setSelectedCountry(reParsed.country);
      setLocalNumber(reParsed.localNumber);
      const full = formatFullPhoneNumber(reParsed.dialCode, reParsed.localNumber);
      if (onChange) {
        onChange(full, reParsed.dialCode, reParsed.localNumber);
      }
      return;
    }

    setLocalNumber(val);
    const full = formatFullPhoneNumber(selectedCountry.dial_code, val);
    if (onChange) {
      onChange(full, selectedCountry.dial_code, val);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Group Container */}
      <div className="flex items-stretch rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-emerald-500/25 focus-within:border-emerald-500 transition-all shadow-2xs">
        {/* Country Code Dropdown Trigger */}
        <button
          type="button"
          id={id ? `${id}-country-btn` : undefined}
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-l-xl border-r border-slate-200 dark:border-slate-700/80 text-xs font-bold cursor-pointer select-none transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Country Code: ${selectedCountry.name} (${selectedCountry.dial_code}) — Click to change`}
        >
          <CountryFlag code={selectedCountry.code} name={selectedCountry.name} />
          <span className="font-mono text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
            {selectedCountry.dial_code}
          </span>
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </button>

        {/* Local Number Input */}
        <input
          ref={numberInputRef}
          type="tel"
          id={id || undefined}
          required={required}
          disabled={disabled}
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          autoComplete="tel-national"
          className={`flex-1 min-w-0 px-3 py-2 text-xs bg-transparent border-0 focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium ${inputClassName}`}
        />
      </div>

      {/* Country Code Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1.5 w-76 max-w-[92vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // If 1 result matches, select it
                    const allMatches = [...priorityList, ...otherList];
                    if (allMatches.length > 0) {
                      handleSelectCountry(allMatches[0]);
                    }
                  }
                }}
                placeholder="Search country or code (+94, Sri Lanka)..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Countries List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100/70 dark:divide-slate-800/40 text-xs">
            {priorityList.length === 0 && otherList.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching country or dial code found
              </div>
            ) : (
              <>
                {/* Priority Countries Section (Only when not actively filtering by strict name) */}
                {priorityList.length > 0 && !search && (
                  <div>
                    <div className="px-3 py-1 bg-slate-50/80 dark:bg-slate-850 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Popular Trade Hubs
                    </div>
                    {priorityList.map((c) => {
                      const isSelected = selectedCountry.code === c.code;
                      return (
                        <button
                          type="button"
                          key={`p-${c.code}-${c.dial_code}`}
                          onClick={() => handleSelectCountry(c)}
                          className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <CountryFlag code={c.code} name={c.name} />
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {c.dial_code}
                            </span>
                            {isSelected && (
                              <Check size={13} className="text-emerald-600 shrink-0" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* All Countries Section */}
                <div>
                  {!search && priorityList.length > 0 && (
                    <div className="px-3 py-1 bg-slate-50/80 dark:bg-slate-850 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      All Countries (A - Z)
                    </div>
                  )}
                  {otherList.map((c) => {
                    const isSelected = selectedCountry.code === c.code;
                    return (
                      <button
                        type="button"
                        key={`${c.code}-${c.dial_code}`}
                        onClick={() => handleSelectCountry(c)}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <CountryFlag code={c.code} name={c.name} />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {c.dial_code}
                          </span>
                          {isSelected && (
                            <Check size={13} className="text-emerald-600 shrink-0" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
