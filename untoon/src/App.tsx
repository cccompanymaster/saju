import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconHome, IconChat, IconSearch, IconBook, IconMenu, IconClose, screenVariants,
} from './ui'
import Home from './screens/Home'
import Detail from './screens/Detail'
import Search from './screens/Search'
import Library from './screens/Library'
import Ask from './screens/Ask'
import AuthModal from './screens/Auth'
import { useStore } from './store'

type Tab = 'home' | 'ask' | 'search' | 'library'

const COUPON_KEY = 'untoon_coupon_hide_until'

interface AuthReq { onSuccess?: () => void; reason?: string }

export default function App() {
  const { user } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coupon, setCoupon] = useState(false)
  const [auth, setAuth] = useState<AuthReq | null>(null)

  // 로그인 필요 동작을 감싸는 게이트
  const requireAuth = (onSuccess: () => void, reason?: string) => {
    if (user) onSuccess()
    else setAuth({ onSuccess, reason })
  }

  // 첫 방문 쿠폰 팝업 (24시간 보지 않기 지원)
  useEffect(() => {
    const until = Number(localStorage.getItem(COUPON_KEY) || 0)
    if (Date.now() > until) {
      const t = setTimeout(() => setCoupon(true), 900)
      return () => clearTimeout(t)
    }
  }, [])

  const openDetail = (id: string) => { setDetailId(id); setMenuOpen(false) }
  const go = (t: Tab) => { setDetailId(null); setTab(t) }

  return (
    <div className="stage-bg flex min-h-dvh items-center justify-center sm:py-6">
      {/* 모바일 앱 프레임 */}
      <div className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-bg sm:h-[860px] sm:max-h-[92dvh] sm:rounded-[2.2rem] sm:border sm:border-white/10 sm:shadow-[0_40px_120px_-30px_rgba(255,45,120,0.35)]">

        {/* 탑바 — 몰입형 디테일에서는 숨김 */}
        {!detailId && (
        <header className="z-30 flex items-center justify-between px-4 py-3.5">
          <button onClick={() => go('home')} className="flex items-center gap-1.5 active:opacity-70">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-pink to-red text-[15px] font-black text-white">運</span>
            <span className="display text-[19px] tracking-tight">운툰<span className="text-pink">.</span></span>
          </button>
          <button onClick={() => setMenuOpen(true)} className="rounded-full p-1.5 active:bg-white/10">
            <IconMenu />
          </button>
        </header>
        )}

        {/* 본문 */}
        <main className="no-scrollbar relative flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {detailId ? (
              <motion.div key="detail" variants={screenVariants} initial="initial" animate="enter" exit="exit"
                className="absolute inset-0 overflow-hidden">
                <Detail id={detailId} onClose={() => setDetailId(null)} requireAuth={requireAuth} />
              </motion.div>
            ) : (
              <motion.div key={tab} variants={screenVariants} initial="initial" animate="enter" exit="exit"
                className="min-h-full">
                {tab === 'home' && <Home onOpen={openDetail} />}
                {tab === 'ask' && <Ask />}
                {tab === 'search' && <Search onOpen={openDetail} />}
                {tab === 'library' && <Library onOpen={openDetail} requireAuth={requireAuth} />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 하단 글래스 내비 — 디테일 화면에서는 숨김 */}
        {!detailId && (
          <nav className="glass z-30 border-t border-white/8">
            <div className="flex items-stretch justify-around px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
              <NavBtn label="홈" active={tab === 'home'} onClick={() => go('home')} icon={IconHome} />
              <NavBtn label="질문하기" active={tab === 'ask'} onClick={() => go('ask')} icon={IconChat} />
              <NavBtn label="검색" active={tab === 'search'} onClick={() => go('search')} icon={IconSearch} />
              <NavBtn label="보관함" active={tab === 'library'} onClick={() => go('library')} icon={IconBook} />
            </div>
          </nav>
        )}

        {/* 사이드 메뉴 */}
        <AnimatePresence>
          {menuOpen && (
            <SideMenu onClose={() => setMenuOpen(false)} onNav={go}
              onLogin={() => { setMenuOpen(false); setAuth({ reason: '운툰에 로그인하고 리포트를 보관하세요.' }) }} />
          )}
        </AnimatePresence>

        {/* 쿠폰 팝업 */}
        <AnimatePresence>
          {coupon && <CouponModal onClose={() => setCoupon(false)} />}
        </AnimatePresence>

        {/* 로그인/회원가입 */}
        <AnimatePresence>
          {auth && (
            <AuthModal reason={auth.reason} onClose={() => setAuth(null)}
              onSuccess={auth.onSuccess} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function NavBtn({
  label, active, onClick, icon: Icon,
}: { label: string; active: boolean; onClick: () => void; icon: typeof IconHome }) {
  return (
    <button onClick={onClick} className="flex flex-1 flex-col items-center gap-1 py-1 active:opacity-60">
      <Icon size={23} active={active} />
      <span className={`text-[10.5px] font-semibold ${active ? 'text-pink' : 'text-mut'}`}>{label}</span>
    </button>
  )
}

// ── 사이드 메뉴 ──────────────────────────────────────────────────────
function SideMenu({ onClose, onNav, onLogin }: { onClose: () => void; onNav: (t: Tab) => void; onLogin: () => void }) {
  const { user, orders, logout } = useStore()
  const items: [Tab, string][] = [['home', '홈'], ['ask', '질문하기'], ['search', '검색'], ['library', '보관함']]
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 z-40 bg-black/60" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="absolute right-0 top-0 z-50 flex h-full w-[74%] max-w-[300px] flex-col bg-surface p-5">
        <div className="flex items-center justify-between">
          <span className="display text-[20px]">메뉴</span>
          <button onClick={onClose} className="text-mut active:text-ink"><IconClose /></button>
        </div>

        {/* 계정 영역 */}
        {user ? (
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink to-red text-[16px] font-black text-white">
                {user.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold">{user.name} 님</p>
                <p className="truncate text-[11.5px] text-mut">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <span className="text-mut">보유 리포트 <b className="text-ink">{orders.length}</b>개</span>
              <button onClick={() => { logout(); onClose() }} className="font-semibold text-mut active:text-ink">로그아웃</button>
            </div>
          </div>
        ) : (
          <button onClick={onLogin}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink to-red py-3.5 text-[15px] font-extrabold text-white active:scale-[0.98] transition">
            로그인 / 회원가입
          </button>
        )}

        <nav className="mt-5 space-y-1">
          {items.map(([k, label]) => (
            <button key={k} onClick={() => { onNav(k); onClose() }}
              className="block w-full rounded-xl px-3 py-3 text-left text-[16px] font-semibold active:bg-white/5">
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-pink/20 to-yellow/10 p-4">
          <p className="text-[13px] font-bold text-pink">카카오 채널 친구 추가</p>
          <p className="mt-1 text-[12px] text-mut">신상 운툰 소식과 한정 쿠폰을 가장 먼저 받아요.</p>
          <button className="mt-3 w-full rounded-xl bg-yellow py-2.5 text-[13.5px] font-extrabold text-black active:scale-95 transition">
            채널 추가하고 쿠폰 받기
          </button>
        </div>
      </motion.aside>
    </>
  )
}

// ── 쿠폰 팝업 (첫 방문 / 24시간 보지 않기) ───────────────────────────
function CouponModal({ onClose }: { onClose: () => void }) {
  const hide24 = () => {
    localStorage.setItem(COUPON_KEY, String(Date.now() + 24 * 60 * 60 * 1000))
    onClose()
  }
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="absolute left-1/2 top-1/2 z-50 w-[86%] max-w-[330px] -translate-x-1/2 -translate-y-1/2">
        <div className="grain relative overflow-hidden rounded-3xl border border-pink/30 bg-gradient-to-b from-[#23050f] to-bg p-6 text-center">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink/30 blur-3xl" />
          <span className="relative inline-flex rounded-full border border-yellow/40 bg-yellow/10 px-3 py-1 text-[11px] font-bold text-yellow">
            첫 방문 한정
          </span>
          <h2 className="display relative mt-3 text-[27px] leading-tight">
            첫 리포트 <span className="text-pink glow-pink">3,000원</span><br />할인 쿠폰
          </h2>
          <p className="relative mt-2 text-[13px] text-mut">
            지금 받고, 오늘 궁금한 운세 하나 가볍게 열어보세요.
          </p>
          <button onClick={onClose}
            className="relative mt-5 w-full rounded-2xl bg-yellow py-4 text-[16px] font-extrabold text-black shadow-[0_10px_30px_-8px_rgba(255,212,59,0.6)] active:scale-[0.98] transition">
            쿠폰 받고 시작하기
          </button>
          <button onClick={hide24} className="relative mt-3 text-[12.5px] text-mut2 active:text-mut">
            24시간 동안 보지 않기
          </button>
        </div>
      </motion.div>
    </>
  )
}
