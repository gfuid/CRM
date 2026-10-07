/** Travel-Trade CRM mark (four rounded squares), same as the CRM app. */
export default function BrandLogo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect x="6" y="20" width="26" height="26" rx="7" fill="#F88F61" />
      <rect x="37" y="20" width="26" height="26" rx="7" fill="#FDC64A" />
      <rect x="68" y="20" width="26" height="26" rx="7" fill="#EB4E55" />
      <rect x="37" y="52" width="26" height="26" rx="7" fill="#58BA84" />
    </svg>
  );
}
