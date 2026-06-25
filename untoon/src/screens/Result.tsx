import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { byId, buildReport, krw, promo, categories, type Theme } from '../data'
import { MyeongsikTable, OhaengBars, DaeunTable, FlowGraph, LockedCard, Panel } from '../components/Charts'
import { CounselorAvatar } from '../components/Counselor'
import { IconBack } from '../ui'

export default function Result({
  id, name, topic, onClose, onUnlock,
}: { id: string; name: string; topic: string; onClose: () => void; onUnlock: () => void }) {
  const p = byId(id)
  const theme: Theme = p.theme
  const trad = theme === 'traditional'
  const r = buildReport(name, topic)
  const accentText = trad ? 'text-gold' : 'text-pink'

  // 남은 혜택 시간 카운트다운
  const [sec, setSec] = useState(promo.benefitMinutes * 60)
  useEffect(() => {
    const t = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')

  return (
    <div className={`relative flex h-full flex-col ${trad ? 'hanji-tex text-hanji' : 'bg-bg text-ink'}`}>
      {/* 상단 바 */}
      <div className={`z-20 flex items-center justify-between px-4 py-3 ${trad ? 'bg-[#0a1626]/85' : 'glass'} border-b ${trad ? 'border-gold/15' : 'border-line/60'}`}>
        <button onClick={onClose} className="rounded-full p-1.5 active:bg-white/10"><IconBack /></button>
        <span className={`text-[13px] font-bold ${trad ? 'serif' : ''}`}>{p.title} · 미리보기</span>
        <span className="w-7" />
      </div>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4 pb-6 pt-5">
        {/* 상담사 마무리 인사 */}
        <div className="flex items-center gap-3">
          <div className="shrink-0"><CounselorAvatar size={68} theme={theme} /></div>
          <div>
            <p className={`text-[12px] ${accentText}`}>상담사 월아</p>
            <p className={`mt-0.5 text-[14px] leading-snug ${trad ? 'serif' : ''}`}>
              {r.name} 님, 명식을 펼쳐봤어요.<br />아래는 무료로 보여드리는 미리보기예요.
            </p>
          </div>
        </div>

        {/* 신뢰 배지 */}
        <div className="flex flex-wrap gap-1.5">
          {['무료 미리보기 제공', '입력 정보 기반 개인화', '명식·오행·대운 분석'].map((t) => (
            <span key={t} className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold
              ${trad ? 'border-gold/30 text-gold' : 'border-white/12 text-mut'}`}>✓ {t}</span>
          ))}
        </div>

        {/* 한 줄 성향 해석 */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-5 text-center ${trad ? 'border-gold/25 bg-[#0e1f33]/60' : 'border-white/10 bg-gradient-to-b from-surface to-bg2'}`}>
          <p className="text-[12px] text-mut">한 줄 성향 풀이</p>
          <p className={`mt-1.5 text-[20px] font-extrabold leading-snug ${trad ? 'serif text-hanji' : 'text-ink'}`}>
            “{r.oneLine}”
          </p>
        </motion.div>

        {/* 사주 명식표 */}
        <Panel title="사주 명식표" sub="태어난 순간의 네 기둥" theme={theme}>
          <MyeongsikTable pillars={r.pillars} theme={theme} />
          <p className="mt-3 text-[12.5px] leading-relaxed text-mut">
            일주(나 자신)는 <b className={accentText}>{r.pillars[2].stem}{r.pillars[2].branch}</b>. 위 명식이 당신의 타고난 기운의 설계도예요.
          </p>
        </Panel>

        {/* 오행 분포 */}
        <Panel title="오행 분포" sub="기운의 균형" theme={theme}>
          <OhaengBars data={r.ohaeng} theme={theme} />
          <p className="mt-3 text-[12.5px] leading-relaxed text-mut">
            가장 강한 기운은 <b style={{ color: 'var(--color-ink)' }}>{r.dominant}</b>, 약한 기운은 <b style={{ color: 'var(--color-ink)' }}>{r.weak}</b>.
            {r.weak}을(를) 보완하면 흐름이 매끄러워집니다.
          </p>
        </Panel>

        {/* 미리보기 텍스트 1 */}
        <PreviewText section={r.preview[0]} theme={theme} />
        <PreviewText section={r.preview[1]} theme={theme} />

        {/* 대운표 */}
        <Panel title="대운 흐름" sub="10년 단위의 큰 흐름" theme={theme}>
          <DaeunTable data={r.daeun} theme={theme} />
          <p className="mt-3 text-[12.5px] leading-relaxed text-mut">
            지금은 ‘{r.daeun[2].mood}’의 대운. 다가오는 {r.daeun[3].age}세 전후 ‘{r.daeun[3].mood}’의 문이 열립니다.
          </p>
        </Panel>

        {/* 첫 잠금 카드 */}
        <LockedCard {...r.locked[0]} theme={theme} onUnlock={onUnlock} />

        {/* 흐름 그래프 */}
        <Panel title="시기별 재물·연애 흐름" sub="올해 12개월" theme={theme}>
          <FlowGraph data={r.flow} theme={theme} />
        </Panel>

        <PreviewText section={r.preview[2]} theme={theme} />
        <PreviewText section={r.preview[3]} theme={theme} />

        {/* 나머지 잠금 카드 */}
        <div className="space-y-3">
          <p className={`pt-1 text-[13px] font-bold ${accentText}`}>🔒 전체 리포트에서 풀리는 깊은 해석</p>
          {r.locked.slice(1).map((l) => (
            <LockedCard key={l.title} {...l} theme={theme} onUnlock={onUnlock} />
          ))}
        </div>

        {/* 안내 문구 / 개인정보 */}
        <div className="space-y-2 pt-2 text-[11px] leading-relaxed text-mut2">
          <p>· 본 리포트는 오락 및 참고용으로 제공되며, 결과를 의학·법률·재무적 판단의 근거로 사용하지 마세요.</p>
          <p>· 입력하신 정보는 리포트 생성에만 이용됩니다. 자세한 내용은{' '}
            <button className={`underline ${accentText}`}>개인정보 처리방침</button>에서 확인할 수 있어요.</p>
        </div>
      </div>

      {/* 결제 후크 (프레임 하단 고정) */}
      <div className={`z-30 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3
        ${trad ? 'border-gold/20 bg-[#0a1626]/92' : 'glass border-white/10'}`}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${trad ? 'bg-gold/20 text-gold' : 'bg-pink/20 text-pink'}`}>
              쿠폰 -{krw(promo.couponWon)}
            </span>
            <span className="text-[11px] text-mut">남은 혜택 <b className={accentText}>{mm}:{ss}</b></span>
          </div>
          <div className="text-right">
            {p.origPrice && <span className="mr-1.5 text-[11px] text-mut2 line-through">{krw(p.origPrice)}</span>}
            <span className={`text-[16px] font-extrabold ${trad ? 'serif text-hanji' : 'text-ink'}`}>{krw(Math.max(0, p.price - promo.couponWon))}</span>
          </div>
        </div>
        <button onClick={onUnlock}
          className={`w-full rounded-2xl py-4 text-[16px] font-extrabold text-white shadow-lg active:scale-[0.98] transition
            ${trad ? 'bg-gradient-to-r from-[#c9a23f] to-[#b23a2e] text-[#1a1206]' : 'bg-gradient-to-r from-pink to-red'}`}>
          전체 리포트 열기 →
        </button>
        <p className="mt-1.5 text-center text-[10.5px] text-mut2">
          결제 시 <button className="underline">개인정보 수집·이용</button>에 동의하게 됩니다 · {categories.find((c) => c.key === p.category)?.label} 리포트
        </p>
      </div>
    </div>
  )
}

function PreviewText({ section, theme }: { section: { title: string; body: string }; theme: Theme }) {
  const trad = theme === 'traditional'
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`rounded-2xl border p-4 ${trad ? 'border-gold/15 bg-[#0c1c2e]/50' : 'border-white/8 bg-surface/40'}`}>
      <h4 className={`mb-1.5 text-[14px] font-extrabold ${trad ? 'serif text-hanji' : 'text-ink'}`}>{section.title}</h4>
      <p className="text-[13.5px] leading-relaxed text-ink/85">{section.body}</p>
    </motion.div>
  )
}
