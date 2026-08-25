/**
 * The app's logo mark — the same camera glyph over the brand gradient that
 * `src/app/icon.svg` uses for the browser tab. Kept here as a component so
 * the sidebar, the auth screens and the favicon can't drift apart.
 *
 * The gradient `id` is a fixed string. Two marks on one page technically
 * repeat that id, but both define the identical gradient, so the browser
 * picks the first and either one renders correctly.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Instagramm"
      className={className}
    >
      <defs>
        <linearGradient id="instagramm-brand-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9ce34" />
          <stop offset="45%" stopColor="#ee2a7b" />
          <stop offset="100%" stopColor="#6228d7" />
        </linearGradient>
      </defs>

      {/* Gradient tile. Filled rather than outlined, so it stays legible when
          it shrinks to a nav icon. */}
      <rect width="48" height="48" rx="12" fill="url(#instagramm-brand-mark)" />

      {/* Camera glyph in white: body, lens, flash dot. */}
      <g fill="none" stroke="#ffffff" strokeWidth="3">
        <rect x="11.5" y="11.5" width="25" height="25" rx="7.5" />
        <circle cx="24" cy="24" r="6.5" />
      </g>
      <circle cx="32.6" cy="15.4" r="2" fill="#ffffff" />
    </svg>
  );
}
