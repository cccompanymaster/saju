import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  categories, products, sections, ranking, reviews, byId, krw, videoUrl,
  type CategoryKey, type Product,
} from '../data'
import { Poster, RatingStars, Chip, fadeUp } from '../ui'
import { Aurora } from '../components/Motion'

export default function Home({ onOpen }: { onOpen: (id: string) => void }) {
  const [cat, setCat] = useState<CategoryKey>('all')

  const heroList = useMemo(
    () => products.filter((p) => p.hero && (cat === 'all' || p.category === cat)),
    [cat],
  )
  const filtered = useMemo(
    () => (cat === 'all' ? products : products.filter((p) => p.category === cat)),
    [cat],
  )

  return (
    <div className="pb-4">
      {/* 카테고리 탭 */}
      <div className="sticky top-0 z-20 glass border-b border-line/60">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
          {categories.map((c) => {
            const on = c.key === cat
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition
                  ${on
                    ? 'border-pink bg-pink text-white shadow-[0_4px_18px_-4px_rgba(255,45,120,0.7)]'
                    : 'border-white/10 bg-white/[0.03] text-mut'}`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 히어로 캐러셀 */}
      {heroList.length > 0 && <HeroCarousel list={heroList} onOpen={onOpen} />}

      {/* 카테고리 섹션 (전체 탭에서만 큐레이션 노출) */}
      {cat === 'all' ? (
        <>
          {sections.map((s) => (
            <SectionRow key={s.id} title={s.title} desc={s.desc}
              list={s.productIds.map(byId)} onOpen={onOpen} />
          ))}
          <RankingBlock onOpen={onOpen} />
          <ReviewFeed onOpen={onOpen} />
        </>
      ) : (
        <FilterGrid list={filtered} onOpen={onOpen} />
      )}
    </div>
  )
}

// ── 히어로 캐러셀 (세로 웹툰 포스터) ──────────────────────────────────
function HeroCarousel({ list, onOpen }: { list: Product[]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const w = el.clientWidth * 0.78 + 14
    setIdx(Math.round(el.scrollLeft / w))
  }

  return (
    <section className="relative pt-4">
      {/* 움직이는 오로라 배경 */}
      <Aurora className="-z-0 h-[260px]" opacity={0.28} />
      <div className="relative flex items-end justify-between px-4 pb-3">
        <h2 className="display text-[19px] leading-tight">
          지금 가장 많이 보는 <span className="text-pink glow-pink">운툰</span>
        </h2>
      </div>
      <div ref={ref} onScroll={onScroll}
        className="no-scrollbar relative flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-3">
        {list.map((p, i) => (
          <motion.button
            key={p.id}
            onClick={() => onOpen(p.id)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="relative w-[78%] shrink-0 snap-start active:scale-[0.98] transition"
          >
            <Poster poster={p.poster} seed={i + 1} video={videoUrl(p.cardVideo || p.video)} motion
              className="aspect-[3/4.1] rounded-3xl">
              <div className="absolute left-0 top-0 flex w-full items-start justify-between p-4">
                {p.badge && <Chip tone={p.badge === '재미' ? 'yellow' : 'pink'}>{p.badge}</Chip>}
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">
                  ★ {p.rating}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                <h3 className="display text-[24px] leading-[1.12] text-white drop-shadow">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] text-white/70">{p.subtitle}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-pink px-3 py-1.5 text-[12px] font-bold text-white">
                    {krw(p.price)}부터
                  </span>
                  {p.origPrice && (
                    <span className="text-[11px] text-white/45 line-through">{krw(p.origPrice)}</span>
                  )}
                </div>
              </div>
            </Poster>
          </motion.button>
        ))}
      </div>
      {/* 진행 점 */}
      <div className="flex justify-center gap-1.5 pt-1">
        {list.map((_, i) => (
          <span key={i}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-pink' : 'w-1.5 bg-white/20'}`} />
        ))}
      </div>
    </section>
  )
}

// ── 가로 스크롤 섹션 ─────────────────────────────────────────────────
function SectionRow({
  title, desc, list, onOpen,
}: { title: string; desc: string; list: Product[]; onOpen: (id: string) => void }) {
  return (
    <section className="pt-7">
      <div className="px-4">
        <div className="flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-pink to-yellow" />
          <h2 className="text-[16px] font-extrabold">{title} 분야</h2>
        </div>
        <p className="mt-1 pl-3 text-[13px] text-mut">{desc}</p>
      </div>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
        {list.map((p, i) => (
          <button key={p.id + i} onClick={() => onOpen(p.id)}
            className="w-[44%] shrink-0 text-left active:scale-[0.98] transition">
            <Poster poster={p.poster} seed={i + 3} className="aspect-[3/4] rounded-2xl">
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="display text-[15px] leading-tight text-white">{p.title}</h3>
              </div>
              {p.badge && <div className="absolute left-2.5 top-2.5"><Chip tone={p.badge === '재미' ? 'yellow' : 'pink'}>{p.badge}</Chip></div>}
            </Poster>
            <div className="mt-2 flex items-center justify-between px-0.5">
              <span className="text-[12px] font-bold text-pink">{krw(p.price)}</span>
              <span className="text-[11px] text-mut">★ {p.rating}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

// ── 필터 탭 결과 그리드 (2열) ────────────────────────────────────────
function FilterGrid({ list, onOpen }: { list: Product[]; onOpen: (id: string) => void }) {
  if (list.length === 0) {
    return <p className="px-4 py-16 text-center text-sm text-mut">준비 중인 콘텐츠예요.</p>
  }
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-5">
      {list.map((p, i) => (
        <motion.button key={p.id} custom={i} variants={fadeUp} initial="hidden" animate="show"
          onClick={() => onOpen(p.id)} className="text-left active:scale-[0.98] transition">
          <Poster poster={p.poster} seed={i + 2} className="aspect-[3/4] rounded-2xl">
            <div className="absolute inset-x-0 bottom-0 p-3">
              <h3 className="display text-[15px] leading-tight text-white">{p.title}</h3>
              <p className="mt-1 text-[11px] text-white/60 line-clamp-1">{p.subtitle}</p>
            </div>
            {p.badge && <div className="absolute left-2.5 top-2.5"><Chip tone={p.badge === '재미' ? 'yellow' : 'pink'}>{p.badge}</Chip></div>}
          </Poster>
          <div className="mt-2 flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-pink">{krw(p.price)}</span>
            <span className="text-[11px] text-mut">★ {p.rating} · {p.reviews.toLocaleString()}</span>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

// ── 가볍게 보는 3분 운세 랭킹 ────────────────────────────────────────
function RankingBlock({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="mt-8 px-4">
      <div className="rounded-3xl border border-white/8 bg-gradient-to-b from-surface to-bg2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-[18px]">⚡</span>
          <h2 className="text-[16px] font-extrabold">가볍게 보는 3분 운세</h2>
        </div>
        <p className="mt-1 text-[12.5px] text-mut">커피 한 잔보다 싸게, 오늘의 기운만 쏙</p>
        <div className="mt-3 divide-y divide-white/6">
          {ranking.map((r) => {
            const p = byId(r.productId)
            return (
              <button key={r.rank} onClick={() => onOpen(p.id)}
                className="flex w-full items-center gap-3 py-3 text-left active:opacity-70">
                <span className={`display w-7 text-center text-[22px] ${r.rank === 1 ? 'text-yellow' : r.rank === 2 ? 'text-pink' : 'text-mut'}`}>
                  {r.rank}
                </span>
                <Poster poster={p.poster} seed={r.rank + 6} className="h-12 w-12 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{p.title}</span>
                  <span className="block truncate text-[11.5px] text-mut">{r.oneLine}</span>
                </span>
                <span className="shrink-0 text-[13px] font-extrabold text-pink">{krw(p.price)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── 리얼 리뷰 피드 ───────────────────────────────────────────────────
function ReviewFeed({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="mt-8 px-4">
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-yellow to-pink" />
        <h2 className="text-[16px] font-extrabold">방금 올라온 리얼 후기</h2>
      </div>
      <div className="mt-3 space-y-3">
        {reviews.map((rv) => {
          const p = byId(rv.productId)
          return (
            <div key={rv.id} className="rounded-2xl border border-white/8 bg-surface/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RatingStars value={rv.rating} />
                  <span className="text-[12.5px] font-semibold">{rv.nickname}</span>
                </div>
                <span className="text-[11px] text-mut2">{rv.when}</span>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink/90">{rv.text}</p>
              <button onClick={() => onOpen(p.id)}
                className="mt-3 flex w-full items-center gap-2.5 rounded-xl bg-white/[0.03] p-2 text-left active:opacity-70">
                <Poster poster={p.poster} seed={9} className="h-10 w-10 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-bold">{p.title}</span>
                  <span className="text-[10.5px] text-mut">구매 {rv.sales.toLocaleString()} · 후기 보러가기 →</span>
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
