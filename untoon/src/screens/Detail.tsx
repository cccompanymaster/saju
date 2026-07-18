import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  byId, categories, krw, interests, loveStates, jobStates, promo, posters, videoUrl,
} from '../data'
import { Poster, IconBack, IconClose } from '../ui'
import { CounselorAvatar, SpeechBubble } from '../components/Counselor'
import { Particles, Starfield } from '../components/Motion'
import { useStore } from '../store'
import Result from './Result'

type Phase = 'intro' | 'form' | 'loading' | 'result'
type RequireAuth = (onSuccess: () => void, reason?: string) => void

export default function Detail({
  id, onClose, requireAuth,
}: { id: string; onClose: () => void; requireAuth: RequireAuth }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [form, setForm] = useState<FormData>(emptyForm)
  const [pay, setPay] = useState(false)

  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <Intro key="intro" id={id} onClose={onClose}
            onStart={() => setPhase('form')} />
        )}
        {phase === 'form' && (
          <Form key="form" id={id} value={form} onChange={setForm}
            onBack={() => setPhase('intro')} onDone={() => setPhase('loading')} />
        )}
        {phase === 'loading' && <Loading key="loading" id={id} onDone={() => setPhase('result')} />}
        {phase === 'result' && (
          <Result key="result" id={id} name={form.name} topic={form.interest || '종합운'}
            onClose={onClose} onUnlock={() => setPay(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pay && <PaymentSheet id={id} requireAuth={requireAuth} onClose={() => setPay(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── 1) 상담사 캐릭터 인트로 (웹툰 컷 / 말풍선) ────────────────────────
function Intro({
  id, onClose, onStart,
}: { id: string; onClose: () => void; onStart: () => void }) {
  const p = byId(id)
  const theme = p.theme
  const trad = theme === 'traditional'
  const [cut, setCut] = useState(0)
  const lines = p.counsel
  const last = cut >= lines.length - 1

  const next = () => { if (!last) setCut((c) => c + 1) }
  const prev = () => (cut === 0 ? onClose() : setCut((c) => c - 1))

  return (
    <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`relative h-full ${trad ? 'hanji-tex' : ''}`}>
      {!trad && (
        <>
          <Poster poster={p.poster} seed={5} vivid fill video={videoUrl(p.video)} motion />
          {/* 네온 파티클 (영상 없을 때 특히 몰입감↑) */}
          <Particles count={18} color={posters[p.poster].blob} />
        </>
      )}
      {trad && (
        <div className="absolute inset-0">
          {p.video && <video className="video-cover kenburns" src={videoUrl(p.video)} autoPlay muted loop playsInline />}
          {/* 별밤 + 보름달 */}
          <Starfield count={30} />
          <div className="float-slow absolute right-7 top-16 h-24 w-24 rounded-full"
            style={{ background: 'radial-gradient(circle at 38% 34%, #f4e6b5, #dcbf6f 60%, #c9a23f)', boxShadow: '0 0 70px 18px rgba(201,162,63,0.25)' }} />
        </div>
      )}

      {/* 상단 컨트롤 */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
        <button onClick={prev} className="rounded-full bg-black/40 p-2 backdrop-blur"><IconBack /></button>
        <button onClick={onStart} className="rounded-full bg-black/40 px-3 py-1.5 text-[12px] font-semibold text-white/80 backdrop-blur">
          건너뛰기 →
        </button>
      </div>

      {/* 캐릭터 + 말풍선 */}
      <div className="relative flex h-full flex-col justify-end p-6 pb-8" onClick={next}>
        <div className="mb-3 flex items-end gap-3">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`float-slow shrink-0 ${trad ? '' : 'drop-shadow-[0_8px_30px_rgba(255,45,120,0.35)]'}`}>
            <CounselorAvatar size={trad ? 150 : 132} theme={theme} />
          </motion.div>
        </div>

        <p className={`mb-2 text-[12px] font-semibold ${trad ? 'serif text-gold' : 'text-pink'}`}>
          상담사 월아 · {categories.find((c) => c.key === p.category)?.label}
        </p>

        <div className="min-h-[92px]">
          <AnimatePresence mode="wait">
            <SpeechBubble key={cut} theme={theme}>{lines[cut]}</SpeechBubble>
          </AnimatePresence>
        </div>

        {/* 진행 점 */}
        <div className="mt-3 flex gap-1.5">
          {lines.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all ${i <= cut ? (trad ? 'w-6 bg-gold' : 'w-6 bg-pink') : 'w-3 bg-white/20'}`} />
          ))}
        </div>

        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
          {last ? (
            <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onClick={onStart}
              className={`shimmer w-full rounded-2xl py-4 text-[16px] font-extrabold active:scale-[0.98] transition
                ${trad ? 'bg-gradient-to-r from-[#c9a23f] to-[#b23a2e] text-[#1a1206]' : 'bg-gradient-to-r from-pink to-red text-white'}`}>
              {p.introCta}
            </motion.button>
          ) : (
            <button onClick={next}
              className={`w-full rounded-2xl border py-3.5 text-[15px] font-bold backdrop-blur transition
                ${trad ? 'border-gold/40 text-hanji' : 'border-white/20 bg-white/[0.06] text-white'}`}>
              다음 ▸
            </button>
          )}
          <p className="mt-2 text-center text-[11px] text-white/40">화면을 탭하면 다음 이야기로 넘어가요</p>
        </div>
      </div>
    </motion.div>
  )
}

// ── 2) 3단계 입력/진단 ───────────────────────────────────────────────
interface FormData {
  name: string; birth: string; calendar: '양력' | '음력' | ''; time: string; gender: '여성' | '남성' | ''
  interest: string; love: string; job: string; free: string
}
const emptyForm: FormData = { name: '', birth: '', calendar: '', time: '', gender: '', interest: '', love: '', job: '', free: '' }

function Form({
  id, value, onChange, onBack, onDone,
}: { id: string; value: FormData; onChange: (f: FormData) => void; onBack: () => void; onDone: () => void }) {
  const p = byId(id)
  const theme = p.theme
  const trad = theme === 'traditional'
  const [step, setStep] = useState(0)
  const d = value
  const set = (patch: Partial<FormData>) => onChange({ ...d, ...patch })

  const accentBtn = trad
    ? 'bg-gradient-to-r from-[#c9a23f] to-[#b23a2e] text-[#1a1206]'
    : 'bg-gradient-to-r from-pink to-red text-white'
  const sel = (on: boolean) =>
    on ? (trad ? 'border-gold bg-gold text-[#1a1206]' : 'border-pink bg-pink text-white')
       : 'border-white/10 bg-surface text-mut'

  const canNext = [
    d.name.trim().length >= 1 && d.birth.length === 8 && !!d.calendar && !!d.gender,
    !!d.interest,
    true,
  ][step]
  const last = step === 2
  const go = () => (last ? onDone() : setStep((s) => s + 1))
  const back = () => (step === 0 ? onBack() : setStep((s) => s - 1))

  return (
    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`relative flex h-full flex-col ${trad ? 'hanji-tex text-hanji' : 'bg-bg'}`}>
      <div className="flex items-center justify-between p-4">
        <button onClick={back} className="rounded-full bg-white/5 p-1.5"><IconBack /></button>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((s) => (
            <span key={s} className={`h-1.5 rounded-full transition-all ${s <= step ? (trad ? 'w-6 bg-gold' : 'w-6 bg-pink') : 'w-2 bg-white/15'}`} />
          ))}
        </div>
        <span className="w-7 text-right text-[12px] text-mut">{step + 1}/3</span>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-4 pt-3">
        <p className={`text-[13px] font-bold ${trad ? 'text-gold' : 'text-pink'}`}>STEP {step + 1}</p>
        <h2 className={`mt-1 text-[21px] font-extrabold leading-snug ${trad ? 'serif' : ''}`}>{stepTitle[step]}</h2>
        <p className="mt-1.5 text-[12.5px] text-mut">{stepHint[step]}</p>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.25 }} className="mt-6 space-y-5">

            {step === 0 && (
              <>
                <Field label="이름 또는 닉네임">
                  <input value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={12}
                    placeholder="예) 민지" className={inputCls} />
                </Field>
                <Field label="생년월일">
                  <input inputMode="numeric" maxLength={8} value={d.birth}
                    onChange={(e) => set({ birth: e.target.value.replace(/\D/g, '') })}
                    placeholder="YYYYMMDD" className={`${inputCls} text-center tracking-[0.15em]`} />
                </Field>
                <Field label="양력 / 음력">
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['양력', '음력'] as const).map((o) => (
                      <button key={o} onClick={() => set({ calendar: o })}
                        className={`rounded-xl border py-3 text-[15px] font-bold transition ${sel(d.calendar === o)}`}>{o}</button>
                    ))}
                  </div>
                </Field>
                <Field label="태어난 시간">
                  <input value={d.time} onChange={(e) => set({ time: e.target.value })}
                    placeholder="예) 오후 9시 30분" className={inputCls} />
                  <button onClick={() => set({ time: '모름' })}
                    className={`mt-2 w-full rounded-xl border py-2.5 text-[13px] transition ${d.time === '모름' ? sel(true) : 'border-white/10 text-mut'}`}>
                    태어난 시간을 몰라요
                  </button>
                </Field>
                <Field label="성별">
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['여성', '남성'] as const).map((o) => (
                      <button key={o} onClick={() => set({ gender: o })}
                        className={`rounded-xl border py-3 text-[15px] font-bold transition ${sel(d.gender === o)}`}>{o}</button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="가장 궁금한 주제 (1개)">
                  <div className="flex flex-wrap gap-2">
                    {interests.map((t) => (
                      <button key={t} onClick={() => set({ interest: t })}
                        className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${sel(d.interest === t)}`}>{t}</button>
                    ))}
                  </div>
                </Field>
                <Field label="현재 연애 상태">
                  <div className="flex flex-wrap gap-2">
                    {loveStates.map((t) => (
                      <button key={t} onClick={() => set({ love: t })}
                        className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${sel(d.love === t)}`}>{t}</button>
                    ))}
                  </div>
                </Field>
                <Field label="현재 직업 상태">
                  <div className="flex flex-wrap gap-2">
                    {jobStates.map((t) => (
                      <button key={t} onClick={() => set({ job: t })}
                        className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${sel(d.job === t)}`}>{t}</button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {step === 2 && (
              <Field label="지금 가장 궁금한 점 (선택)">
                <textarea value={d.free} onChange={(e) => set({ free: e.target.value.slice(0, 200) })}
                  rows={5} placeholder="고민을 자유롭게 적어주세요. 적지 않아도 진행돼요."
                  className={`${inputCls} resize-none leading-relaxed`} />
                <p className="mt-1.5 text-right text-[11px] text-mut2">{d.free.length}/200</p>
                <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-mut">
                  입력하신 정보는 리포트 생성에만 이용되며, 결과는 오락·참고용으로 제공돼요.
                </div>
              </Field>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-5">
        <button onClick={go} disabled={!canNext}
          className={`w-full rounded-2xl py-4 text-[16px] font-extrabold transition
            ${canNext ? `${accentBtn} active:scale-[0.98]` : 'bg-white/8 text-mut2'}`}>
          {last ? 'AI 리포트 생성하기' : '다음'}
        </button>
      </div>
    </motion.div>
  )
}

const inputCls = 'w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-[16px] font-semibold text-ink placeholder:text-mut2 placeholder:font-normal focus:border-pink focus:outline-none'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-bold text-mut">{label}</label>
      {children}
    </div>
  )
}
const stepTitle = ['기본 사주 정보를\n알려주세요', '무엇이 가장 궁금한가요?', '마지막으로,\n하고 싶은 질문이 있나요?']
const stepHint = [
  '명식을 세우는 데 꼭 필요한 정보예요.',
  '관심사에 맞춰 리포트가 구성돼요.',
  '자유롭게 적으면 더 깊은 해석을 받아요. (선택)',
]

// ── 3) 생성 로딩 ─────────────────────────────────────────────────────
function Loading({ id, onDone }: { id: string; onDone: () => void }) {
  const p = byId(id)
  const trad = p.theme === 'traditional'
  useState(() => { setTimeout(onDone, 1900); return 0 })
  return (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`flex h-full flex-col items-center justify-center px-8 text-center ${trad ? 'hanji-tex text-hanji' : 'bg-bg'}`}>
      <div className={trad ? '' : 'drop-shadow-[0_8px_30px_rgba(255,45,120,0.4)]'}>
        <CounselorAvatar size={120} theme={p.theme} />
      </div>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.3, ease: 'linear' }}
        className={`mt-7 h-9 w-9 rounded-full border-[3px] ${trad ? 'border-gold/25 border-t-gold' : 'border-pink/25 border-t-pink'}`} />
      <p className={`mt-5 text-[16px] font-bold ${trad ? 'serif' : ''}`}>월아가 당신의 명식을 세우는 중…</p>
      <p className="mt-2 text-[13px] text-mut">오행과 대운의 흐름을 읽고 있어요.</p>
    </motion.div>
  )
}

// ── 결제 시트 ────────────────────────────────────────────────────────
function PaymentSheet({
  id, onClose, requireAuth,
}: { id: string; onClose: () => void; requireAuth: RequireAuth }) {
  const p = byId(id)
  const trad = p.theme === 'traditional'
  const { user, couponAvailable, purchase, hasPurchased } = useStore()
  const useCoupon = couponAvailable
  const final = Math.max(0, p.price - (useCoupon ? promo.couponWon : 0))

  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(hasPurchased(id))
  const [err, setErr] = useState('')

  const pay = (method: string) => {
    setErr('')
    requireAuth(async () => {
      setBusy(true)
      try {
        await purchase({ productId: id, title: p.title, price: p.price, method, useCoupon, couponWon: promo.couponWon })
        setDone(true)
      } catch (e) {
        setErr(e instanceof Error ? e.message : '결제에 실패했어요.')
      } finally { setBusy(false) }
    }, '결제를 위해 로그인이 필요해요.')
  }

  const accentBtn = trad ? 'bg-[#b23a2e]' : 'bg-pink'

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={busy ? undefined : onClose} className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className={`absolute inset-x-0 bottom-0 z-50 rounded-t-3xl border-t p-5 pb-[max(20px,env(safe-area-inset-bottom))]
          ${trad ? 'border-gold/25 bg-[#0a1626] text-hanji' : 'border-white/10 bg-surface'}`}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        {done ? (
          // ── 결제 완료 ──
          <div className="py-2 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 14 }}
              className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${trad ? 'bg-gold/20' : 'bg-pink/20'}`}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={trad ? 'var(--color-gold)' : 'var(--color-pink)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
            </motion.div>
            <h3 className={`mt-4 text-[19px] font-extrabold ${trad ? 'serif' : ''}`}>결제가 완료됐어요</h3>
            <p className="mt-1.5 text-[13px] text-mut">
              {p.title} 전체 리포트가 잠금 해제되었어요.<br />보관함에서 2주간 다시 볼 수 있어요.
            </p>
            <button onClick={onClose}
              className={`mt-5 w-full rounded-2xl py-4 text-[16px] font-extrabold text-white active:scale-[0.98] transition ${trad ? 'bg-gradient-to-r from-[#c9a23f] to-[#b23a2e] text-[#1a1206]' : 'bg-gradient-to-r from-pink to-red'}`}>
              전체 리포트 보기
            </button>
          </div>
        ) : (
          // ── 결제 진행 ──
          <>
            <div className="flex items-center justify-between">
              <h3 className={`text-[17px] font-extrabold ${trad ? 'serif' : ''}`}>전체 리포트 결제</h3>
              <button onClick={onClose} className="text-mut active:text-ink"><IconClose /></button>
            </div>
            <p className="mt-1 text-[13px] text-mut">{p.title} · 프리미엄 해석 전체 열람</p>
            {user && <p className="mt-0.5 text-[12px] text-mut2">{user.name} 님으로 결제</p>}

            <div className="mt-4 space-y-1.5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-[13.5px]">
              <Row k="상품 금액" v={krw(p.price)} />
              {useCoupon
                ? <Row k="첫 방문 쿠폰" v={`-${krw(promo.couponWon)}`} accent={trad ? 'gold' : 'pink'} />
                : <Row k="쿠폰" v="사용 가능한 쿠폰 없음" />}
              <div className="my-2 h-px bg-white/8" />
              <Row k="결제 금액" v={krw(final)} big />
            </div>

            {err && <p className="mt-3 text-center text-[12.5px] text-red">{err}</p>}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button onClick={() => pay('kakaopay')} disabled={busy}
                className="rounded-xl bg-yellow py-3.5 text-[14px] font-extrabold text-[#3c1e1e] active:scale-95 transition disabled:opacity-60">
                {busy ? '결제 중…' : '카카오페이'}
              </button>
              <button onClick={() => pay('card')} disabled={busy}
                className={`rounded-xl py-3.5 text-[14px] font-extrabold text-white active:scale-95 transition disabled:opacity-60 ${accentBtn}`}>
                {busy ? '결제 중…' : '카드 결제'}
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-mut2">
              결제 시 <button className="underline">개인정보 수집·이용</button> 및 <button className="underline">결제 약관</button>에 동의합니다.<br />
              결과는 오락·참고용이며, 결제 후 보관함에서 2주간 다시 볼 수 있어요.
            </p>
          </>
        )}
      </motion.div>
    </>
  )
}
function Row({ k, v, accent, big }: { k: string; v: string; accent?: 'pink' | 'gold'; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-mut">{k}</span>
      <span className={`font-bold ${big ? 'text-[17px] text-ink' : ''} ${accent === 'pink' ? 'text-pink' : accent === 'gold' ? 'text-gold' : 'text-ink'}`}>{v}</span>
    </div>
  )
}
