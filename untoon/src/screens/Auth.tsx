import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { IconClose } from '../ui'

type Mode = 'login' | 'signup'

export default function AuthModal({
  onClose, onSuccess, reason,
}: { onClose: () => void; onSuccess?: () => void; reason?: string }) {
  const { login, signup, loginKakao } = useStore()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const done = () => { onClose(); onSuccess?.() }

  const submit = async () => {
    setErr('')
    if (!/.+@.+\..+/.test(email)) return setErr('올바른 이메일을 입력해주세요.')
    if (pw.length < 4) return setErr('비밀번호는 4자 이상이에요.')
    if (mode === 'signup' && !agree) return setErr('약관 및 개인정보 수집에 동의해주세요.')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, pw)
      else await signup(email, pw, name)
      done()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '문제가 발생했어요.')
    } finally { setBusy(false) }
  }

  const kakao = async () => {
    setErr(''); setBusy(true)
    try { await loginKakao(); done() }
    catch { setErr('카카오 로그인에 실패했어요.') }
    finally { setBusy(false) }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="absolute inset-x-0 bottom-0 z-50 max-h-[92%] overflow-y-auto no-scrollbar rounded-t-3xl border-t border-white/10 bg-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-between">
          <h2 className="display text-[22px]">{mode === 'login' ? '로그인' : '회원가입'}</h2>
          <button onClick={onClose} className="text-mut active:text-ink"><IconClose /></button>
        </div>
        <p className="mt-1 text-[13px] text-mut">
          {reason || '운툰 리포트를 결제하고 보관함에 보관하려면 로그인이 필요해요.'}
        </p>

        {/* 카카오 간편 로그인 */}
        <button onClick={kakao} disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow py-3.5 text-[15px] font-extrabold text-[#3c1e1e] active:scale-[0.98] transition disabled:opacity-60">
          <KakaoIcon /> 카카오로 3초 만에 시작
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] text-mut2">
          <span className="h-px flex-1 bg-white/10" /> 또는 이메일로 <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-2.5">
          {mode === 'signup' && (
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12}
              placeholder="닉네임" className={inp} />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email"
            placeholder="이메일" className={inp} />
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="비밀번호 (4자 이상)" className={inp} />
        </div>

        {mode === 'signup' && (
          <button onClick={() => setAgree((a) => !a)}
            className="mt-3 flex w-full items-start gap-2 text-left">
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${agree ? 'border-pink bg-pink' : 'border-white/20'}`}>
              {agree && <CheckIcon />}
            </span>
            <span className="text-[12px] leading-relaxed text-mut">
              <b className="text-ink">[필수]</b> 만 14세 이상이며, 서비스 이용약관과{' '}
              <span className="text-pink underline">개인정보 수집·이용</span>에 동의합니다.
            </span>
          </button>
        )}

        {err && <p className="mt-3 text-[12.5px] text-red">{err}</p>}

        <button onClick={submit} disabled={busy}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink to-red py-4 text-[16px] font-extrabold text-white active:scale-[0.98] transition disabled:opacity-60">
          {busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하고 시작하기'}
        </button>

        <p className="mt-3 text-center text-[13px] text-mut">
          {mode === 'login' ? '아직 회원이 아니신가요? ' : '이미 계정이 있으신가요? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr('') }}
            className="font-bold text-pink">{mode === 'login' ? '회원가입' : '로그인'}</button>
        </p>
      </motion.div>
    </>
  )
}

const inp = 'w-full rounded-xl border border-line bg-bg2 px-4 py-3.5 text-[15px] text-ink placeholder:text-mut2 focus:border-pink focus:outline-none'

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#3c1e1e"><path d="M12 3C6.9 3 3 6.3 3 10.3c0 2.6 1.7 4.9 4.3 6.2-.2.6-.7 2.4-.8 2.8 0 .2.1.4.3.2.3-.2 2.6-1.8 3.6-2.5.5.1 1 .1 1.6.1 5.1 0 9-3.3 9-7.3S17.1 3 12 3z" /></svg>
  )
}
function CheckIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg>
}
