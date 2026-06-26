import { useState } from 'react'
import { byId, krw } from '../data'
import { Poster, RatingStars } from '../ui'
import { useStore, daysLeft, fmtDate } from '../store'

const wished = ['money-this-year', 'marriage-timing', 'overall-2026']
type RequireAuth = (onSuccess: () => void, reason?: string) => void

export default function Library({
  onOpen, requireAuth,
}: { onOpen: (id: string) => void; requireAuth: RequireAuth }) {
  const { user, orders } = useStore()
  const [tab, setTab] = useState<'reports' | 'wish'>('reports')

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="display text-[22px]">보관함</h1>

      {/* 계정 요약 */}
      {user ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink to-red text-[16px] font-black text-white">
            {user.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{user.name} 님</p>
            <p className="truncate text-[11.5px] text-mut">{user.email}</p>
          </div>
        </div>
      ) : (
        <button onClick={() => requireAuth(() => {}, '보관함을 보려면 로그인이 필요해요.')}
          className="mt-3 w-full rounded-2xl border border-pink/30 bg-pink/10 p-4 text-left active:scale-[0.99] transition">
          <p className="text-[14px] font-bold text-pink">로그인하고 내 리포트 보관하기</p>
          <p className="mt-0.5 text-[12px] text-mut">결제한 리포트를 2주간 다시 볼 수 있어요.</p>
        </button>
      )}

      <div className="mt-4 flex gap-2">
        {([['reports', '내 리포트'], ['wish', '찜']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-[13.5px] font-bold transition
              ${tab === k ? 'bg-pink text-white' : 'bg-white/5 text-mut'}`}>
            {label}{k === 'reports' && user ? ` ${orders.length}` : ''}
          </button>
        ))}
      </div>

      {tab === 'reports' ? (
        <div className="mt-5 space-y-3">
          {!user ? (
            <Empty text="로그인하면 결제한 리포트가 여기에 보관돼요." />
          ) : orders.length === 0 ? (
            <Empty text="아직 결제한 리포트가 없어요. 마음에 드는 운툰을 열어보세요." />
          ) : (
            <>
              {orders.map((o) => {
                const p = byId(o.productId)
                const left = daysLeft(o.expiresAt)
                const live = left > 0
                return (
                  <button key={o.id} onClick={() => onOpen(o.productId)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-surface/70 p-3 text-left active:scale-[0.99] transition">
                    <Poster poster={p.poster} seed={4} className="h-20 w-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <RatingStars value={p.rating} size={11} />
                      <h3 className="mt-1 truncate text-[15px] font-bold">{p.title}</h3>
                      <p className="mt-0.5 text-[11.5px] text-mut">
                        결제일 {fmtDate(o.createdAt)} · {krw(o.paid)} 결제
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${live ? 'bg-pink/15 text-pink' : 'bg-white/5 text-mut2'}`}>
                          {live ? '열람 가능' : '재열람 만료'}
                        </span>
                        {live && <span className="text-[10.5px] text-mut2">재열람 {left}일 남음</span>}
                      </div>
                    </div>
                    <span className="shrink-0 text-mut">›</span>
                  </button>
                )
              })}
              <p className="pt-2 text-center text-[11.5px] text-mut2">결제한 리포트는 2주간 다시 열람할 수 있어요.</p>
            </>
          )}
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

function Empty({ text }: { text: string }) {
  return <p className="py-14 text-center text-[13.5px] leading-relaxed text-mut">{text}</p>
}
