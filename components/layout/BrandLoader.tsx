/**
 * Branded loading screen — shown while the app shell chunk boots and
 * during route transitions. Pure CSS animation (no JS): the logo
 * "breathes" with a soft glow ring, the wordmark shimmers, and three
 * dots wave underneath.
 */
export default function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        minHeight: '100vh',
        background: 'var(--bg, #0a0c14)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 18,
      }}
    >
      {/* Breathing logo with glow ring */}
      <div style={{ position: 'relative', width: 84, height: 84 }}>
        <div className="brand-loader-ring" />
        <img
          src="/logo.png"
          alt=""
          width={84}
          height={84}
          className="brand-loader-logo"
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 20,
            boxShadow: '0 8px 32px rgba(59,130,246,0.35)',
          }}
        />
      </div>

      {/* Shimmering wordmark */}
      <div className="brand-loader-word">BOW</div>

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
