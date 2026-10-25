// godeep.work mark: a light-green lotus with a small pink bloom at its heart. Also exported as src/app/icon.svg.
export function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="4 4 56 56" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(32 50)">
        <path d="M0 0C-9-6-11-17-6-26C-3-21 0-12 0 0Z" fill="#6fcf9f" transform="rotate(-38)" />
        <path d="M0 0C9-6 11-17 6-26C3-21 0-12 0 0Z" fill="#6fcf9f" transform="rotate(38)" />
        <path d="M0 0C-10-9-11-24-4-34C1-26 2-12 0 0Z" fill="#8fe3bb" transform="rotate(-16)" />
        <path d="M0 0C10-9 11-24 4-34C-1-26-2-12 0 0Z" fill="#8fe3bb" transform="rotate(16)" />
        <path d="M0 0C-8-10-8-28 0-38C8-28 8-10 0 0Z" fill="#b8f0d2" />
        <g transform="translate(0 -14)" fill="#f2a1b4">
          <circle cx="0" cy="-3.6" r="3.2" />
          <circle cx="3.4" cy="-1.1" r="3.2" />
          <circle cx="2.1" cy="2.9" r="3.2" />
          <circle cx="-2.1" cy="2.9" r="3.2" />
          <circle cx="-3.4" cy="-1.1" r="3.2" />
          <circle cx="0" cy="0" r="1.8" fill="#fde4ea" />
        </g>
      </g>
    </svg>
  );
}
