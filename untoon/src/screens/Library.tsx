import { useState } from 'react'
import { byId, krw } from '../data'
import { Poster, RatingStars } from '../ui'

// 샘플 보관함 — 추후 사용자별 주문/보관 API로 교체
const owned = [
  { productId: 'reunion-comeback', date: '2026.06.21', status: '열람 가능' as const, kept: '12일 남음' },
  { productId: 'fun-charm', date: '2026.06.18', status: '열람 가능' as const, kept: '9일 남음' },
]
const wished = ['money-this-year', 'marriage-timing', 'overall-2026']

export default function Library({ onOpen }: { onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<'reports' | 'wish'>('reports')

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="display text-[22px]">보관함</h1>
      <div className="mt-3 flex gap-2">
        {([['reports', '내 리포트'], ['wish', '찜']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-[13.5px] font-bold transition
              ${tab === k ? 'bg-pink text-white' : 'bg-white/5 text-mut'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'reports' ? (
        <div className="mt-5 space-y-3">
          {owned.map((o) => {
            const p = byId(o.productId)
            return (
              <button key={o.productId} onClick={() => onOpen(o.productId)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-surface/70 p-3 text-left active:scale-[0.99] transition">
                <Poster poster={p.poster} seed={4} className="h-20 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <RatingStars value={p.rating} size={11} />
                  </div>
                  <h3 className="mt-1 truncate text-[15px] font-bold">{p.title}</h3>
                  <p className="mt-0.5 text-[11.5px] text-mut">결제일 {o.date}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-pink/15 px-2 py-0.5 text-[10.5px] font-bold text-pink">{o.status}</span>
                    <span className="text-[10.5px] text-mut2">재열람 {o.kept}</span>
                  </div>
                </div>
                <span className="shrink-0 text-mut">›</span>
              </button>
            )
          })}
          <p className="pt-2 text-center text-[11.5px] text-mut2">결제한 리포트는 2주간 다시 열람할 수 있어요.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {wished.map((wid, i) => {
            const p = byId(wid)
            return (
              <button key={wid} onClick={() => onOpen(wid)} className="text-left active:scale-[0.98] transition">
                <Poster poster={p.poster} seed={i + 1} className="aspect-[3/4] rounded-2xl">
                  <div className="absolute right-2.5 top-2.5 text-pink">♥</div>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <h3 className="display text-[15px] leading-tight text-white">{p.title}</h3>
                  </div>
                </Poster>
                <span className="mt-2 block px-0.5 text-[12px] font-bold text-pink">{krw(p.price)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
