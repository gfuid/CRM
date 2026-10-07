import React from 'react';

export default function BrandLogo({ size = 28, className = '', useImage = false }) {
  if (useImage) {
    return (
      <img
        src="/logo.png"
        alt="Logo"
        width={size}
        height={size}
        className={`rounded-lg object-contain shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      aria-label="Brand Logo"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm shrink-0"
      >
        {/* Top Row: 3 rounded squares */}
        <rect x="6" y="20" width="26" height="26" rx="7" fill="#F88F61" />
        <rect x="37" y="20" width="26" height="26" rx="7" fill="#FDC64A" />
        <rect x="68" y="20" width="26" height="26" rx="7" fill="#EB4E55" />

        {/* Bottom Row: 1 rounded square directly under center */}
        <rect x="37" y="52" width="26" height="26" rx="7" fill="#58BA84" />
      </svg>
    </div>
  );
}
