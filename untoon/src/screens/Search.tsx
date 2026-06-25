import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { products, krw } from '../data'
import { Poster } from '../ui'

const hot = ['전 애인', '돈복', '결혼 타이밍', '매력살', '궁합', '오늘 운세']

export default function Search({ onOpen }: { onOpen: (id: string) => void }) {
  const [q, setQ] = useState('')
  const res = useMemo(() => {
    const k = q.trim()
    if (!k) return []
    return products.filter(
      (p) => p.title.includes(k) || p.subtitle.includes(k) || p.introCta.includes(k),
    )
  }, [q])

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-mut)" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="어떤 운세가 궁금하세요?"
          className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-mut2 focus:outline-none" />
        {q && <button onClick={() => setQ('')} className="text-mut2">✕</button>}
      </div>

      {!q && (
        <div className="mt-6">
          <h3 className="text-[13px] font-bold text-mut">지금 많이 찾는</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {hot.map((h) => (
              <button key={h} onClick={() => setQ(h)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] text-ink active:bg-pink/20">
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {q && (
        <p className="mt-5 mb-3 text-[13px] text-mut">
          ‘<span className="font-bold text-ink">{q}</span>’ 검색 결과 {res.length}건
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {res.map((p, i) => (
          <motion.button key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }} onClick={() => onOpen(p.id)}
            className="text-left active:scale-[0.98] transition">
            <Poster poster={p.poster} seed={i + 1} className="aspect-[3/4] rounded-2xl">
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="display text-[15px] leading-tight text-white">{p.title}</h3>
              </div>
            </Poster>
            <div className="mt-2 flex items-center justify-between px-0.5">
              <span className="text-[12px] font-bold text-pink">{krw(p.price)}</span>
              <span className="text-[11px] text-mut">★ {p.rating}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {q && res.length === 0 && (
        <p className="py-16 text-center text-[14px] text-mut">검색 결과가 없어요. 다른 키워드로 찾아보세요.</p>
      )}
    </div>
  )
}
