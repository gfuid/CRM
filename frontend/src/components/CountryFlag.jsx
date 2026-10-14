import React, { useState } from 'react';

/**
 * Universally renders actual country flags on all operating systems (Windows, Mac, Linux, iOS, Android).
 * Windows browsers do not render unicode regional indicator emoji flags natively, showing plain letters instead (e.g. 'LK').
 * This component delivers crisp national flag images with seamless fallback.
 */
export default function CountryFlag({
  code = '',
  name = '',
  className = 'w-5 h-3.5',
  fallbackText = '',
}) {
  const [hasError, setHasError] = useState(false);
  const cleanCode = (code || '').toLowerCase().trim();

  if (cleanCode && cleanCode.length === 2 && !hasError) {
    return (
      <img
        src={`https://flagcdn.com/w40/${cleanCode}.png`}
        srcSet={`https://flagcdn.com/w80/${cleanCode}.png 2x`}
        width="20"
        height="14"
        alt={name || code || 'Country Flag'}
        loading="lazy"
        className={`inline-block object-cover rounded-[2px] shadow-2xs border border-slate-200/70 dark:border-slate-700/70 shrink-0 align-middle ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <span className="inline-flex items-center justify-center font-bold font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase leading-none border border-slate-200 dark:border-slate-700 shrink-0">
      {code ? code.toUpperCase() : fallbackText || '🏳️'}
    </span>
  );
}
