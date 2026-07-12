export function BullLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--primary)"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Black Bull logo"
      className="shrink-0"
    >
      <path d="M4 6c1.8.6 3.4 1.6 4.6 3h6.8c1.2-1.4 2.8-2.4 4.6-3" />
      <path d="M8.6 9c-.9 1.1-1.4 2.5-1.4 4 0 3 2.1 5.5 4.8 5.5s4.8-2.5 4.8-5.5c0-1.5-.5-2.9-1.4-4" />
      <circle cx="10.3" cy="12.6" r="0.6" fill="var(--primary)" stroke="none" />
      <circle cx="13.7" cy="12.6" r="0.6" fill="var(--primary)" stroke="none" />
      <path d="M11 16.2h2" />
    </svg>
  );
}
