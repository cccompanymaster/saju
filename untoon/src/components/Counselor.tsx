import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Theme } from '../data'

// 가상의 브랜드 고유 상담사 캐릭터 "월아" — 달빛 아래 한복 차림의 안내자.
// 실제 이미지/캐릭터 복제 없이 순수 SVG 라인아트로 표현.
export function CounselorAvatar({ size = 200, theme = 'modern' }: { size?: number; theme?: Theme }) {
  const robe = theme === 'traditional' ? '#1b3553' : '#2a1233'
  const robe2 = theme === 'traditional' ? '#26507a' : '#4a1f55'
  const accent = theme === 'traditional' ? '#c9a23f' : '#ff2d78'
  const skin = '#f0d8c4'
  const hair = '#1a1320'
  const moon = theme === 'traditional' ? '#f4e6b5' : '#ffd9e6'

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-label="상담사 월아">
      <defs>
        <radialGradient id="moonG" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={moon} />
          <stop offset="70%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="robeG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={robe2} />
          <stop offset="100%" stopColor={robe} />
        </linearGradient>
      </defs>

      {/* 보름달 후광 */}
      <circle cx="100" cy="78" r="78" fill="url(#moonG)" />
      <circle cx="135" cy="40" r="20" fill={moon} opacity="0.9" />
      <circle cx="142" cy="36" r="20" fill={theme === 'traditional' ? '#0a1626' : '#0a0a0f'} opacity="0.55" />

      {/* 어깨/한복 저고리 */}
      <path d="M44 200 C46 150 66 130 100 130 C134 130 154 150 156 200 Z" fill="url(#robeG)" />
      {/* 깃(동정) */}
      <path d="M100 130 L80 200 L92 200 L100 150 L108 200 L120 200 Z" fill={accent} opacity="0.85" />
      <path d="M100 132 L86 168 L100 150 L114 168 Z" fill="#f7f1e6" opacity="0.9" />
      {/* 고름 */}
      <path d="M108 152 q14 6 10 30" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* 목/얼굴 */}
      <rect x="92" y="116" width="16" height="18" rx="6" fill={skin} />
      <circle cx="100" cy="98" r="26" fill={skin} />
      {/* 머리(쪽 + 가르마) */}
      <path d="M74 96 C74 70 126 70 126 96 C126 86 118 74 100 74 C82 74 74 86 74 96 Z" fill={hair} />
      <path d="M73 98 C70 84 80 72 100 72 C120 72 130 84 127 98 L120 95 C120 82 112 78 100 78 C88 78 80 82 80 95 Z" fill={hair} />
      <circle cx="100" cy="66" r="9" fill={hair} />
      <circle cx="100" cy="64" r="2.6" fill={accent} />
      {/* 비녀 */}
      <rect x="86" y="63" width="28" height="2.4" rx="1.2" fill={accent} />

      {/* 눈/미소 */}
      <path d="M88 99 q4 4 8 0" stroke="#3a2a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M104 99 q4 4 8 0" stroke="#3a2a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M94 110 q6 5 12 0" stroke="#b56" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="86" cy="107" r="3.5" fill={accent} opacity="0.25" />
      <circle cx="114" cy="107" r="3.5" fill={accent} opacity="0.25" />

      {/* 손 + 붓 */}
      <ellipse cx="128" cy="180" rx="10" ry="7" fill={skin} transform="rotate(-18 128 180)" />
      <rect x="120" y="150" width="5" height="40" rx="2.5" fill="#6b4a2a" transform="rotate(24 122 170)" />
      <path d="M132 142 l6 12 l-9 3 z" fill={hair} transform="rotate(24 132 148)" />
    </svg>
  )
}

export function SpeechBubble({
  children, theme = 'modern', delay = 0,
}: { children: ReactNode; theme?: Theme; delay?: number }) {
  const trad = theme === 'traditional'
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 22, stiffness: 260 }}
      className="relative w-full"
    >
      <div className={`relative rounded-2xl rounded-bl-md border px-4 py-3.5 text-[15px] leading-relaxed
        ${trad
          ? 'serif border-gold/30 bg-[#0e1f33]/90 text-hanji'
          : 'border-white/12 bg-surface/95 text-ink'}`}>
        {/* 말풍선 꼬리 */}
        <span className={`absolute -bottom-1.5 left-5 h-3.5 w-3.5 rotate-45 border-b border-r
          ${trad ? 'border-gold/30 bg-[#0e1f33]' : 'border-white/12 bg-surface'}`} />
        <span className="whitespace-pre-line">{children}</span>
      </div>
    </motion.div>
  )
}
