import { useState } from 'react'
import { motion } from 'framer-motion'

interface Msg { who: 'ai' | 'me'; text: string }

const samples = ['이번 달 금전운 어때?', '그 사람이랑 다시 만날 수 있을까?', '이직해도 괜찮은 시기야?']

const greet: Msg = {
  who: 'ai',
  text: '안녕하세요, 운툰 AI예요. 사주를 바탕으로 가볍게 답해드릴게요. 무엇이 궁금한가요?',
}

export default function Ask() {
  const [msgs, setMsgs] = useState<Msg[]>([greet])
  const [text, setText] = useState('')

  const send = (t: string) => {
    const q = t.trim()
    if (!q) return
    setText('')
    setMsgs((m) => [...m, { who: 'me', text: q }])
    // 데모 응답 (실제로는 Claude API 호출)
    setTimeout(() => {
      setMsgs((m) => [...m, {
        who: 'ai',
        text: '지금 흐름으로 보면 조급함을 내려놓을수록 운이 따라와요. 더 정확한 분석은 생년월일·시간을 넣은 정식 리포트에서 확인할 수 있어요. 관련 운툰을 추천해드릴까요?',
      }])
    }, 700)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line/60 px-4 py-3">
        <h1 className="text-[16px] font-extrabold">질문하기</h1>
        <p className="text-[12px] text-mut">AI에게 가볍게 물어보세요 · 무료</p>
      </div>

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.who === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed
              ${m.who === 'me'
                ? 'rounded-br-md bg-gradient-to-r from-pink to-red text-white'
                : 'rounded-bl-md border border-white/8 bg-surface text-ink/90'}`}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {msgs.length <= 1 && (
          <div className="pt-2">
            <p className="mb-2 text-[12px] text-mut2">이렇게 물어보세요</p>
            <div className="flex flex-col gap-2">
              {samples.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left text-[13.5px] text-ink active:bg-pink/15">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-line/60 p-3">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(text)}
          placeholder="궁금한 걸 입력하세요"
          className="flex-1 rounded-full border border-line bg-surface px-4 py-3 text-[14px] text-ink placeholder:text-mut2 focus:border-pink focus:outline-none" />
        <button onClick={() => send(text)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-r from-pink to-red active:scale-95 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
