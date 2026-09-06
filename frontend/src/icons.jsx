/* Small stroke icons, sized to sit on a 15px text baseline. */

const base = {
  width: 19,
  height: 19,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const HomeIcon = () => (
  <svg {...base}>
    <path d="M3 10.2 12 3.5l9 6.7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

export const BookIcon = () => (
  <svg {...base}>
    <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" />
    <path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />
  </svg>
);

export const ChatIcon = () => (
  <svg {...base}>
    <path d="M21 12a8 8 0 0 1-8 8H8l-4 3v-4.6A8 8 0 0 1 13 4a8 8 0 0 1 8 8z" />
  </svg>
);

export const MemoryIcon = () => (
  <svg {...base}>
    <path d="M12 5.5a3 3 0 0 0-5.7 1.3A2.8 2.8 0 0 0 5 12a2.8 2.8 0 0 0 1.6 5 3 3 0 0 0 5.4 1.6" />
    <path d="M12 5.5A3 3 0 0 1 17.7 6.8 2.8 2.8 0 0 1 19 12a2.8 2.8 0 0 1-1.6 5A3 3 0 0 1 12 18.6z" />
    <path d="M12 5.5v13.1" />
  </svg>
);

export const LeafIcon = ({ size = 19 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M11 20c-4 0-7-2.5-7-6.5C4 8 9 4.5 19 4c.6 6.5-1.5 14-8 16z" />
    <path d="M11 20c0-4 1.5-7.5 4.5-10.5" />
  </svg>
);

export const PencilIcon = () => (
  <svg {...base}>
    <path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4z" />
    <path d="M14.5 6.5l3 3" />
  </svg>
);

export const SunIcon = () => (
  <svg {...base} width="15" height="15">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3" />
  </svg>
);

export const SignOutIcon = () => (
  <svg {...base} width="16" height="16">
    <path d="M15 17l5-5-5-5" />
    <path d="M20 12H9" />
    <path d="M11 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6" />
  </svg>
);

export const SmileIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <path d="M8.5 14.5a4.2 4.2 0 0 0 7 0" />
  </svg>
);

export const ImageIcon = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.3" fill="currentColor" stroke="none" />
    <path d="M4 17l4.5-4.5a1.5 1.5 0 0 1 2 0L15 17" />
    <path d="M14 14.5l1.7-1.7a1.5 1.5 0 0 1 2.1 0L20 15" />
  </svg>
);

export const ArrowIcon = () => (
  <svg {...base} width="16" height="16">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

export const SendIcon = () => (
  <svg {...base} width="19" height="19">
    <path d="M4.5 12 20 4.5 12.5 20l-2-6z" />
    <path d="M10.5 14 20 4.5" />
  </svg>
);

export const LockIcon = () => (
  <svg {...base} width="18" height="18">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);

export const LockOpenIcon = () => (
  <svg {...base} width="18" height="18">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 7.5-1.9" />
  </svg>
);

export const RefreshIcon = () => (
  <svg {...base} width="15" height="15">
    <path d="M20 11a8 8 0 0 0-13.7-4.6L4 8.5" />
    <path d="M4 4v4.5h4.5" />
    <path d="M4 13a8 8 0 0 0 13.7 4.6L20 15.5" />
    <path d="M20 20v-4.5h-4.5" />
  </svg>
);

export const SparkleIcon = () => (
  <svg {...base}>
    <path d="M12 3l1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6z" />
    <path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9z" />
  </svg>
);

export const PersonIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
  </svg>
);

export const ShieldIcon = () => (
  <svg {...base}>
    <path d="M12 3.5l7 2.8v5.2c0 4.6-3 7.9-7 9-4-1.1-7-4.4-7-9V6.3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const PlantBoxIcon = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
    <path d="M16 34h40l-4 26H20z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M16 34l4-9h32l4 9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M36 34V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M36 20c-1-4-4-6-8-6 0 4.5 3 7 8 6z" fill="currentColor" opacity="0.5" />
    <path d="M36 20c1-4 4-6 8-6 0 4.5-3 7-8 6z" fill="currentColor" opacity="0.5" />
    <path d="M31 43l2.4 2.4L38 41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...base} width="16" height="16">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const OpenBookIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path
      d="M32 16c-4-3-11-4-17-3v30c6-1 13 0 17 3z"
      fill="var(--surface)"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M32 16c4-3 11-4 17-3v30c-6-1-13 0-17 3z"
      fill="var(--surface)"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M32 16v30" stroke="currentColor" strokeWidth="2" />
  </svg>
);