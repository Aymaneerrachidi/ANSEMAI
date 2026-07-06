export function BullLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Black Bull logo"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="bullPlate" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1c3323" />
          <stop offset="100%" stopColor="#050a06" />
        </linearGradient>
        <linearGradient id="bullHorn" x1="12" y1="14" x2="36" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#74ffb8" />
          <stop offset="100%" stopColor="#12b862" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#bullPlate)" stroke="#2c5138" strokeWidth="1" />
      <path
        d="M12 14c3.2 1.2 6.1 2.9 8.4 5.2h7.2c2.3-2.3 5.2-4 8.4-5.2-1.1 3.6-3 6.5-5.5 8.8.7 1.3 1.1 2.8 1.1 4.4 0 5.1-3.6 8.8-7.6 8.8s-7.6-3.7-7.6-8.8c0-1.6.4-3.1 1.1-4.4C15 20.5 13.1 17.6 12 14Z"
        fill="url(#bullHorn)"
      />
      <path d="M20.2 28.2h2.4v2.2h-2.4zM25.4 28.2h2.4v2.2h-2.4z" fill="#050a06" />
      <path d="M21.5 34.1h5" stroke="#050a06" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
