import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// =============================================================================
// 운툰 클라이언트 스토어 — 회원가입/로그인 · 결제(주문) · 쿠폰
// 지금은 localStorage 영속(데모). 추후 실제 인증/PG/주문 API로 교체하기 쉽게
// 모든 접근을 이 모듈의 함수로 한정한다. (아래 storage helper만 교체하면 됨)
// =============================================================================

export interface User {
  id: string
  email: string
  name: string
  provider: 'email' | 'kakao'
  createdAt: number
}

export interface Order {
  id: string
  productId: string
  title: string
  price: number       // 정가
  paid: number        // 실제 결제액
  method: string      // 'kakaopay' | 'card' | 'kakao'
  couponUsed: boolean
  createdAt: number
  expiresAt: number   // 재열람 만료(결제 + 14일)
}

const RE_ACCESS_DAYS = 14
const K = {
  users: 'untoon_users',
  session: 'untoon_session',
  orders: (uid: string) => `untoon_orders_${uid}`,
  coupon: (uid: string) => `untoon_coupon_used_${uid}`,
}

// ── storage helpers (교체 지점) ──────────────────────────────────────
const read = <T,>(key: string, fb: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fb } catch { return fb }
}
const write = (key: string, v: unknown) => localStorage.setItem(key, JSON.stringify(v))

interface StoredUser extends User { pw: string }
const toPublic = (u: StoredUser): User =>
  ({ id: u.id, email: u.email, name: u.name, provider: u.provider, createdAt: u.createdAt })
const enc = (s: string) => btoa(unescape(encodeURIComponent(s))) // 데모용 단순 인코딩(평문 저장 방지)
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${Math.floor(performance.now() * 1000) % 100000}`
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms)) // 네트워크 흉내

// ── Context ──────────────────────────────────────────────────────────
interface Store {
  user: User | null
  orders: Order[]
  couponAvailable: boolean
  signup: (email: string, password: string, name: string) => Promise<User>
  login: (email: string, password: string) => Promise<User>
  loginKakao: () => Promise<User>
  logout: () => void
  hasPurchased: (productId: string) => boolean
  orderOf: (productId: string) => Order | undefined
  purchase: (input: {
    productId: string; title: string; price: number; method: string; useCoupon: boolean; couponWon: number
  }) => Promise<Order>
}

const Ctx = createContext<Store | null>(null)
export const useStore = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used within <StoreProvider>')
  return v
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [couponUsed, setCouponUsed] = useState(false)

  // 세션 복원
  useEffect(() => {
    const sid = read<string | null>(K.session, null)
    if (!sid) return
    const u = read<StoredUser[]>(K.users, []).find((x) => x.id === sid)
    if (u) {
      const pub = toPublic(u)
      setUser(pub)
      setOrders(read<Order[]>(K.orders(u.id), []))
      setCouponUsed(read<boolean>(K.coupon(u.id), false))
    }
  }, [])

  const loadFor = (u: User) => {
    setUser(u)
    write(K.session, u.id)
    setOrders(read<Order[]>(K.orders(u.id), []))
    setCouponUsed(read<boolean>(K.coupon(u.id), false))
  }

  const signup: Store['signup'] = async (email, password, name) => {
    await wait(500)
    const e = email.trim().toLowerCase()
    const users = read<StoredUser[]>(K.users, [])
    if (users.some((u) => u.email === e)) throw new Error('이미 가입된 이메일이에요.')
    const u: StoredUser = {
      id: uid('u'), email: e, name: name.trim() || e.split('@')[0],
      provider: 'email', createdAt: Date.now(), pw: enc(password),
    }
    write(K.users, [...users, u])
    const pub = toPublic(u)
    loadFor(pub)
    return pub
  }

  const login: Store['login'] = async (email, password) => {
    await wait(500)
    const e = email.trim().toLowerCase()
    const u = read<StoredUser[]>(K.users, []).find((x) => x.email === e)
    if (!u || u.pw !== enc(password)) throw new Error('이메일 또는 비밀번호가 일치하지 않아요.')
    const pub = toPublic(u)
    loadFor(pub)
    return pub
  }

  const loginKakao: Store['loginKakao'] = async () => {
    await wait(600)
    // 데모: 고정 카카오 계정으로 간편 로그인 (추후 OAuth 교체)
    const e = 'kakao_user@kakao.com'
    const users = read<StoredUser[]>(K.users, [])
    let u = users.find((x) => x.email === e)
    if (!u) {
      u = { id: uid('k'), email: e, name: '카카오 회원', provider: 'kakao', createdAt: Date.now(), pw: enc('kakao') }
      write(K.users, [...users, u])
    }
    const pub = toPublic(u)
    loadFor(pub)
    return pub
  }

  const logout = () => {
    localStorage.removeItem(K.session)
    setUser(null); setOrders([]); setCouponUsed(false)
  }

  const hasPurchased: Store['hasPurchased'] = (pid) =>
    orders.some((o) => o.productId === pid && o.expiresAt > Date.now())
  const orderOf: Store['orderOf'] = (pid) =>
    orders.find((o) => o.productId === pid)

  const purchase: Store['purchase'] = async (input) => {
    if (!user) throw new Error('로그인이 필요해요.')
    await wait(900) // PG 승인 흉내
    const useCp = input.useCoupon && !couponUsed
    const paid = Math.max(0, input.price - (useCp ? input.couponWon : 0))
    const now = Date.now()
    const order: Order = {
      id: uid('o'), productId: input.productId, title: input.title,
      price: input.price, paid, method: input.method, couponUsed: useCp,
      createdAt: now, expiresAt: now + RE_ACCESS_DAYS * 86400000,
    }
    const next = [order, ...orders.filter((o) => o.productId !== input.productId)]
    setOrders(next); write(K.orders(user.id), next)
    if (useCp) { setCouponUsed(true); write(K.coupon(user.id), true) }
    return order
  }

  return (
    <Ctx.Provider value={{
      user, orders, couponAvailable: !!user && !couponUsed,
      signup, login, loginKakao, logout, hasPurchased, orderOf, purchase,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const reaccessDays = RE_ACCESS_DAYS
export const daysLeft = (expiresAt: number) =>
  Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000))
export const fmtDate = (ms: number) => {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}
