/** Простые контурные иконки (без внешних библиотек). */
type P = { size?: number }
const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconMenu = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)
export const IconSearch = ({ size }: P) => (
  <svg {...base(size)} strokeWidth={2.4}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
export const IconUser = ({ size = 24 }: P) => (
  <svg {...base(size)} strokeWidth={1.8}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
)
export const IconOrders = ({ size = 24 }: P) => (
  <svg {...base(size)} strokeWidth={1.8}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
)
export const IconCart = ({ size = 24 }: P) => (
  <svg {...base(size)} strokeWidth={1.8}>
    <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
    <circle cx="10" cy="20" r="1.3" />
    <circle cx="17" cy="20" r="1.3" />
  </svg>
)
export const IconPin = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)
export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)} strokeWidth={2.6}>
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
)
export const IconInfo = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.5" />
  </svg>
)
export const IconCalendar = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)
export const IconTag = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M20 12 12 20l-8-8V4h8z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </svg>
)
export const IconTruck = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
)
