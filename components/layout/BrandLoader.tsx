/**
 * Branded loading screen — shown while the app shell chunk boots and
 * during route transitions. Pure CSS animation (no JS): the logo
 * "breathes" with a soft glow ring, the wordmark shimmers, and three
 * dots wave underneath.
 *
 * `compact` renders a smaller in-content version (for tab views that
 * are still hydrating) instead of the full-screen boot layout.
 */
export default function BrandLoader({
  label = 'Loading',
  compact = false,
}: {
  label?: string
  compact?: boolean
}) {
  const logoSize = compact ? 52 : 84
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        minHeight: compact ? 240 : '100vh',
        padding: compact ? '32px 0' : 0,
        background: compact ? 'transparent' : 'var(--bg, #0a0c14)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: compact ? 12 : 18,
      }}
    >
      {/* Breathing logo with glow ring */}
      <div style={{ position: 'relative', width: logoSize, height: logoSize }}>
        <div
          className="brand-loader-ring"
          style={{ borderRadius: compact ? 14 : 26 }}
        />
        <img
          src="/logo.png"
          alt=""
          width={logoSize}
          height={logoSize}
          className="brand-loader-logo"
          style={{
            position: 'absolute', inset: 0,
            borderRadius: compact ? 12 : 20,
            boxShadow: '0 8px 32px rgba(59,130,246,0.35)',
          }}
        />
      </div>

      {/* Shimmering wordmark */}
      <div
        className="brand-loader-word"
        style={{ fontSize: compact ? 13 : 21 }}
      >
        BOW
      </div>

      {/* Waving dots */}
      <div style={{ display: 'flex', gap: 7 }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="brand-loader-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  )
}
