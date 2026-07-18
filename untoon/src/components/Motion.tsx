import { useMemo } from 'react'

// 코드 기반 시네마틱 배경 모션 — 외부 소재 불필요.
// prefers-reduced-motion에서는 CSS가 자동으로 애니메이션을 끈다.

// ── 움직이는 오로라(빛 번짐) 배경 ────────────────────────────────────
export function Aurora({
  colors = ['#ff2d78', '#ffd43b', '#8b4dff'], className = '', opacity = 0.5,
}: { colors?: string[]; className?: string; opacity?: number }) {
  const [a, b, c] = colors
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden style={{ opacity }}>
      <div className="aurora-layer aurora-a"
        style={{ background: `radial-gradient(40% 40% at 30% 30%, ${a}, transparent 70%), radial-gradient(35% 35% at 70% 40%, ${c}, transparent 70%)` }} />
      <div className="aurora-layer aurora-b"
        style={{ background: `radial-gradient(38% 38% at 60% 65%, ${b}, transparent 70%), radial-gradient(30% 30% at 25% 75%, ${a}, transparent 70%)` }} />
    </div>
  )
}

// ── 상승 네온 파티클 ─────────────────────────────────────────────────
export function Particles({
  count = 16, color = '#ff2d78', className = '',
}: { count?: number; color?: string; className?: string }) {
  // 결정적 배치(렌더마다 안 튀게) — index 기반 의사난수
  const items = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
    const size = 3 + Math.round(r(1) * 6)
    return {
      left: `${Math.round(r(2) * 100)}%`,
      bottom: `${-10 - Math.round(r(3) * 20)}%`,
      size,
      dur: `${6 + Math.round(r(4) * 8)}s`,
      delay: `${-Math.round(r(5) * 10)}s`,
      op: 0.3 + r(6) * 0.5,
    }
  }), [count])
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {items.map((it, i) => (
        <span key={i} className="particle"
          style={{
            left: it.left, bottom: it.bottom, width: it.size, height: it.size,
            background: color, boxShadow: `0 0 ${it.size * 2}px ${color}`,
            opacity: it.op, animationDuration: it.dur, animationDelay: it.delay,
          }} />
      ))}
    </div>
  )
}

// ── 별밤(정통 인트로) — 반짝이는 별 ─────────────────────────────────
export function Starfield({ count = 26, className = '' }: { count?: number; className?: string }) {
  const stars = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const r = (n: number) => ((Math.sin(i * 91.7 + n * 47.1) * 12543.77) % 1 + 1) % 1
    return {
      left: `${Math.round(r(1) * 100)}%`, top: `${Math.round(r(2) * 70)}%`,
      size: 1 + Math.round(r(3) * 2), dur: `${2 + Math.round(r(4) * 4)}s`,
      delay: `${-Math.round(r(5) * 5)}s`,
    }
  }), [count])
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {stars.map((s, i) => (
        <span key={i} className="twinkle absolute rounded-full bg-[#f4e6b5]"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDuration: s.dur, animationDelay: s.delay }} />
      ))}
    </div>
  )
}
