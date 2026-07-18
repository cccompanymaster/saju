import type { CSSProperties, ReactNode } from 'react'
import { posters, type PosterKey } from './data'

// ── 그라데이션 웹툰 포스터 (실제 이미지 대용) ──────────────────────────
// video prop을 주면 mp4/webm 루프 영상을 그라데이션 위에 덮어 재생한다.
// 영상이 없거나 로딩 전이면 그라데이션이 그대로 폴백으로 보인다.
export function Poster({
  poster, className = '', children, seed = 0, vivid = false, fill = false,
  video, motion = false,
}: {
  poster: PosterKey; className?: string; children?: ReactNode; seed?: number
  vivid?: boolean; fill?: boolean; video?: string; motion?: boolean
}) {
  const p = posters[poster]
  // vivid(풀스크린): 강렬한 색을 위쪽(이미지 영역)에 두고 아래로 어두워져 카피가 잘 읽힘
  const bg: CSSProperties = {
    background: vivid
      ? `linear-gradient(185deg, ${p.via} 0%, ${p.to} 22%, ${p.via} 56%, ${p.from} 100%)`
      : `linear-gradient(155deg, ${p.from} 0%, ${p.via} 52%, ${p.to} 130%)`,
  }
  // seed로 블롭 위치를 살짝 흔들어 카드마다 다르게 보이게
  const x = 18 + (seed * 23) % 60
  const y = 12 + (seed * 37) % 50
  const posCls = fill ? 'absolute inset-0' : 'relative'
  return (
    <div className={`${posCls} overflow-hidden grain ${className}`} style={bg}>
      {video && (
        <video className={`video-cover ${motion ? 'kenburns' : ''}`}
          src={video} autoPlay muted loop playsInline preload="metadata" />
      )}
      <div
        className={`absolute rounded-full ${video ? 'hidden' : ''} ${vivid ? 'blur-3xl opacity-90' : 'blur-2xl opacity-60'}`}
        style={{
          width: vivid ? '95%' : '62%', height: vivid ? '42%' : '46%',
          left: vivid ? '3%' : `${x}%`, top: vivid ? '6%' : `${y}%`,
          background: `radial-gradient(circle, ${p.blob}, transparent 70%)`,
        }}
      />
      <div
        className={`absolute rounded-full blur-3xl ${video ? 'hidden' : ''} ${vivid ? 'opacity-70' : 'opacity-30'}`}
        style={vivid ? {
          width: '70%', height: '34%', left: '20%', top: '30%',
          background: `radial-gradient(circle, ${p.to}, transparent 72%)`,
        } : {
          width: '50%', height: '40%', right: '-8%', bottom: '-6%',
          background: `radial-gradient(circle, ${p.to}, transparent 72%)`,
        }}
      />
      {!vivid && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />}
      {vivid && <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />}
      {children}
    </div>
  )
}

// ── 별점 ─────────────────────────────────────────────────────────────
export function RatingStars({ value, size = 12 }: { value: number; size?: number }) {
  const full = Math.round(value)
  return (
    <span className="inline-flex items-center gap-px align-middle" aria-label={`별점 ${value}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} on={i < full} />
      ))}
    </span>
  )
}

function Star({ on, size }: { on: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? 'var(--color-yellow)' : 'none'}
      stroke={on ? 'var(--color-yellow)' : 'var(--color-mut2)'} strokeWidth="1.6">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 18.5 6.2 20.5l1.1-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  )
}

export function Chip({ children, tone = 'mut' }: { children: ReactNode; tone?: 'pink' | 'yellow' | 'mut' }) {
  const tones: Record<string, string> = {
    pink: 'bg-pink/15 text-pink border-pink/30',
    yellow: 'bg-yellow/15 text-yellow border-yellow/30',
    mut: 'bg-white/5 text-mut border-white/10',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight ${tones[tone]}`}>
      {children}
    </span>
  )
}

// ── 아이콘 (하단 내비/탑바) ───────────────────────────────────────────
type IconP = { size?: number; active?: boolean }
const sc = (a?: boolean) => (a ? 'var(--color-pink)' : 'var(--color-mut)')

export const IconHome = ({ size = 24, active }: IconP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={sc(active)} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" />
  </svg>
)
export const IconChat = ({ size = 24, active }: IconP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={sc(active)} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16v11H9l-4 3.5V16H4z" />
  </svg>
)
export const IconSearch = ({ size = 24, active }: IconP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={sc(active)} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
  </svg>
)
export const IconBook = ({ size = 24, active }: IconP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={sc(active)} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4h10a2 2 0 012 2v14l-7-3-7 3V6a2 2 0 012-2z" />
  </svg>
)
export const IconMenu = ({ size = 22 }: IconP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)
export const IconBack = ({ size = 24 }: IconP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const IconClose = ({ size = 22 }: IconP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

// ── Framer Motion 공용 variants ──────────────────────────────────────
export const screenVariants = {
  initial: { opacity: 0, y: 14 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } }),
}
