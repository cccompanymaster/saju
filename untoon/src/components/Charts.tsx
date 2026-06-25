import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  elementColor, type Element, type Pillar, type DaeunStep, type FlowPoint, type Theme,
} from '../data'

const accentOf = (t: Theme) => (t === 'traditional' ? 'var(--color-gold)' : 'var(--color-pink)')

// ── 사주 명식표 (4기둥) ──────────────────────────────────────────────
export function MyeongsikTable({ pillars, theme }: { pillars: Pillar[]; theme: Theme }) {
  const trad = theme === 'traditional'
  return (
    <div className={`grid grid-cols-4 overflow-hidden rounded-2xl border ${trad ? 'border-gold/25' : 'border-white/10'}`}>
      {pillars.map((p, i) => (
        <div key={i} className={`flex flex-col items-center ${i < 3 ? (trad ? 'border-r border-gold/15' : 'border-r border-white/8') : ''}`}>
          <span className={`w-full py-1.5 text-center text-[11px] font-semibold ${trad ? 'serif bg-gold/10 text-gold' : 'bg-white/5 text-mut'}`}>
            {p.label}
          </span>
          <Cell ch={p.stem} el={p.stemEl} trad={trad} />
          <Cell ch={p.branch} el={p.branchEl} trad={trad} />
        </div>
      ))}
    </div>
  )
}
function Cell({ ch, el, trad }: { ch: string; el: Element; trad: boolean }) {
  return (
    <div className="flex w-full flex-col items-center gap-0.5 py-3">
      <span className={`grid h-11 w-11 place-items-center rounded-xl text-[22px] font-bold ${trad ? 'serif' : ''}`}
        style={{ color: elementColor[el], background: elementColor[el] + '1f', border: `1px solid ${elementColor[el]}55` }}>
        {ch}
      </span>
      <span className="text-[10px] text-mut2">{el}</span>
    </div>
  )
}

// ── 오행 분포 그래프 ─────────────────────────────────────────────────
export function OhaengBars({ data, theme }: { data: { el: Element; value: number }[]; theme: Theme }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.el} className="flex items-center gap-3">
          <span className="w-5 text-center text-[13px] font-bold" style={{ color: elementColor[d.el] }}>{d.el}</span>
          <div className={`relative h-5 flex-1 overflow-hidden rounded-full ${theme === 'traditional' ? 'bg-white/8' : 'bg-white/6'}`}>
            <motion.div initial={{ width: 0 }} whileInView={{ width: `${(d.value / max) * 100}%` }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full" style={{ background: elementColor[d.el] }} />
          </div>
          <span className="w-9 text-right text-[12px] font-semibold text-mut">{d.value}%</span>
        </div>
      ))}
    </div>
  )
}

// ── 대운표 ───────────────────────────────────────────────────────────
export function DaeunTable({ data, theme }: { data: DaeunStep[]; theme: Theme }) {
  const trad = theme === 'traditional'
  const accent = accentOf(theme)
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {data.map((d, i) => {
        const now = i === 2 // 현재 대운(데모)
        return (
          <div key={i}
            className={`flex w-[64px] shrink-0 flex-col items-center rounded-xl border py-2.5 ${trad ? 'border-gold/20' : 'border-white/10'}`}
            style={now ? { background: accent + '1f', borderColor: accent } : undefined}>
            <span className="text-[11px] text-mut">{d.age}세</span>
            <span className={`my-1 text-[17px] font-bold ${trad ? 'serif text-hanji' : 'text-ink'}`}>{d.gz}</span>
            <span className="text-[10.5px] font-semibold" style={{ color: now ? accent : 'var(--color-mut)' }}>{d.mood}</span>
            {now && <span className="mt-1 rounded-full px-1.5 text-[9px] font-bold text-black" style={{ background: accent }}>현재</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── 시기별 재물/연애 흐름 그래프 (SVG 영역+라인) ─────────────────────
export function FlowGraph({ data, theme }: { data: FlowPoint[]; theme: Theme }) {
  const W = 320, H = 120, pad = 8
  const accent = theme === 'traditional' ? '#c9a23f' : '#ff2d78'
  const love = theme === 'traditional' ? '#7fb0e0' : '#ffd43b'
  const xs = (i: number) => pad + (i * (W - pad * 2)) / (data.length - 1)
  const ys = (v: number) => H - pad - (v / 100) * (H - pad * 2)
  const line = (key: 'money' | 'love') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(d[key]).toFixed(1)}`).join(' ')
  const area = `${line('money')} L${xs(data.length - 1)},${H - pad} L${xs(0)},${H - pad} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flowA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={pad} x2={W - pad} y1={H * g} y2={H * g} stroke="white" strokeOpacity="0.06" />
        ))}
        <path d={area} fill="url(#flowA)" />
        <motion.path d={line('money')} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1 }} />
        <motion.path d={line('love')} fill="none" stroke={love} strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, delay: 0.2 }} />
      </svg>
      <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-mut">
        <span className="flex items-center gap-1"><i className="inline-block h-1.5 w-3 rounded-full" style={{ background: accent }} /> 재물</span>
        <span className="flex items-center gap-1"><i className="inline-block h-1.5 w-3 rounded-full" style={{ background: love }} /> 연애</span>
        <span>{data[0].label} ~ {data[data.length - 1].label}</span>
      </div>
    </div>
  )
}

// ── 잠금(블러) 카드 ──────────────────────────────────────────────────
export function LockedCard({
  title, teaser, theme, onUnlock,
}: { title: string; teaser: string; theme: Theme; onUnlock: () => void }) {
  const trad = theme === 'traditional'
  return (
    <button onClick={onUnlock}
      className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left transition active:scale-[0.99]
        ${trad ? 'border-gold/25 bg-[#0e1f33]/70' : 'border-white/10 bg-surface/70'}`}>
      <div className="flex items-center gap-2">
        <LockIcon theme={theme} />
        <h4 className={`text-[14px] font-bold ${trad ? 'serif text-hanji' : 'text-ink'}`}>{title}</h4>
      </div>
      <div className="relative mt-2">
        <p className="select-none text-[12.5px] leading-relaxed text-mut blur-[4px]">{teaser}</p>
        {/* 흐릿한 그래프 자리 */}
        <div className="mt-2 flex items-end gap-1 opacity-40 blur-[3px]">
          {[40, 70, 50, 85, 60, 75].map((h, i) => (
            <span key={i} className="flex-1 rounded-t" style={{ height: h * 0.35, background: trad ? 'var(--color-gold)' : 'var(--color-pink)' }} />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur
            ${trad ? 'bg-gold/20 text-gold' : 'bg-pink/20 text-pink'}`}>
            프리미엄 해석 보기
          </span>
        </div>
      </div>
    </button>
  )
}
function LockIcon({ theme }: { theme: Theme }) {
  const c = theme === 'traditional' ? 'var(--color-gold)' : 'var(--color-pink)'
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}

// 섹션 래퍼
export function Panel({ title, sub, theme, children }: { title: string; sub?: string; theme: Theme; children: ReactNode }) {
  const trad = theme === 'traditional'
  return (
    <section className={`rounded-2xl border p-4 ${trad ? 'border-gold/15 bg-[#0c1c2e]/60' : 'border-white/8 bg-surface/50'}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3.5 w-1 rounded-full" style={{ background: trad ? 'var(--color-gold)' : 'linear-gradient(var(--color-pink),var(--color-yellow))' }} />
        <h3 className={`text-[15px] font-extrabold ${trad ? 'serif text-hanji' : 'text-ink'}`}>{title}</h3>
        {sub && <span className="text-[11px] text-mut">{sub}</span>}
      </div>
      {children}
    </section>
  )
}
