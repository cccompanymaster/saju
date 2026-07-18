// =============================================================================
// 운툰(UNTOON) 샘플 데이터
// 모든 콘텐츠는 배열/팩토리로 분리 — 추후 실제 API·결제·리포트 생성으로 교체 용이.
// 실제 이미지 없이 CSS 그라데이션 "웹툰 포스터" + SVG 캐릭터로 비주얼을 구성한다.
// 브랜드/캐릭터/문구는 모두 가상의 신규 창작물.
// =============================================================================

export type CategoryKey =
  | 'all' | 'love' | 'reunion' | 'match' | 'money'
  | 'career' | 'marriage' | 'overall' | 'fun'

export interface Category { key: CategoryKey; label: string }

export const categories: Category[] = [
  { key: 'all', label: '전체' },
  { key: 'love', label: '연애' },
  { key: 'reunion', label: '재회' },
  { key: 'match', label: '궁합' },
  { key: 'money', label: '재물' },
  { key: 'career', label: '커리어' },
  { key: 'marriage', label: '결혼' },
  { key: 'overall', label: '종합' },
  { key: 'fun', label: '재미운세' },
]

// 포스터 그라데이션 프리셋 (실제 이미지 대용)
export type PosterKey =
  | 'crimson' | 'magenta' | 'ember' | 'gold' | 'violet'
  | 'midnight' | 'rose' | 'noir' | 'sunset' | 'ice' | 'hanji'

export const posters: Record<PosterKey, { from: string; via: string; to: string; blob: string }> = {
  crimson:  { from: '#2a0410', via: '#7a0f33', to: '#ff2d78', blob: '#ff5e9c' },
  magenta:  { from: '#1a0420', via: '#5e1170', to: '#ff2d78', blob: '#ffd43b' },
  ember:    { from: '#240606', via: '#7a1410', to: '#ff5722', blob: '#ffd43b' },
  gold:     { from: '#1c1604', via: '#6b4e0c', to: '#ffd43b', blob: '#ff8a3b' },
  violet:   { from: '#120428', via: '#3b1280', to: '#8b4dff', blob: '#ff2d78' },
  midnight: { from: '#04060f', via: '#0e2a52', to: '#2d6cff', blob: '#37e0ff' },
  rose:     { from: '#220410', via: '#8a1f4a', to: '#ff6f91', blob: '#ffd0dd' },
  noir:     { from: '#06060a', via: '#1a1a26', to: '#3a3a4f', blob: '#ff2d78' },
  sunset:   { from: '#1e0518', via: '#9a1f4a', to: '#ff9a3b', blob: '#ffd43b' },
  ice:      { from: '#04111a', via: '#0e4a5e', to: '#37e0ff', blob: '#aef6ff' },
  hanji:    { from: '#0a1626', via: '#13314f', to: '#2a567f', blob: '#c9a23f' }, // 정통: 네이비·달빛
}

export type Theme = 'modern' | 'traditional'

export interface Product {
  id: string
  title: string
  subtitle: string
  category: Exclude<CategoryKey, 'all'>
  poster: PosterKey
  theme: Theme            // traditional = 네이비·한지·달빛 신뢰형
  badge?: string
  price: number
  origPrice?: number
  minutes: number
  rating: number
  reviews: number
  sales: number
  hero?: boolean
  introCta: string
  counsel: string[]       // 상담사 캐릭터 말풍선(웹툰 컷) 스크립트
  video?: string          // (선택) 히어로/인트로 배경 루프 영상. public/videos/ 에 넣고 파일명만 지정
  cardVideo?: string      // (선택) 카드 프리뷰 루프 영상
}

// public 자산 경로 헬퍼 (base 경로 대응). 힉스필드 mp4는 public/videos/ 에 배치.
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, '')
export const videoUrl = (file?: string) => (file ? asset('videos/' + file) : undefined)

// 상담사 캐릭터 — 가상의 브랜드 고유 인물
export const counselor = {
  name: '월아',
  title: '운툰 사주 상담사',
  desc: '달빛 아래 붓을 들고, 당신의 흐름을 천천히 읽어주는 안내자',
}

export const products: Product[] = [
  {
    id: 'overall-classic',
    title: '정통 종합사주',
    subtitle: '명식·오행·대운으로 읽는 인생의 큰 줄기',
    category: 'overall',
    poster: 'hanji',
    theme: 'traditional',
    badge: '대표',
    price: 9900, origPrice: 19000, minutes: 7, rating: 4.9, reviews: 4120, sales: 26800, hero: true,
    introCta: '당신의 사주명식을 펼쳐볼까요?',
    counsel: [
      '어서 오세요. 먼 길 오셨습니다.',
      '저는 당신의 흐름을 읽어드릴 상담사 월아예요.',
      '오늘은 태어난 순간에 정해진 당신의 사주명식을\n천천히 함께 펼쳐볼게요.',
      '편하게 앉으시고, 몇 가지만 알려주세요.',
    ],
  },
  {
    id: 'reunion-comeback',
    title: '전 애인 재회운',
    subtitle: '끝났다고 믿었던 인연의 재회 가능성',
    category: 'reunion',
    poster: 'violet',
    theme: 'modern',
    badge: 'HOT',
    price: 5900, origPrice: 12000, minutes: 4, rating: 4.9, reviews: 3380, sales: 21050, hero: true,
    introCta: '다시 이어질 인연인지, 지금 확인할까요?',
    counsel: [
      '아직… 그 사람을 지우지 못했군요.',
      '괜찮아요. 끝난 듯 보여도\n인연에는 다시 겹치는 결이 있답니다.',
      '두 사람의 운이 어디서 다시 맞닿는지\n제가 같이 봐드릴게요.',
    ],
  },
  {
    id: 'love-hidden-heart',
    title: '내 연인의 속마음',
    subtitle: '말하지 않은 진심, 사주로 들춘다',
    category: 'love',
    poster: 'crimson',
    theme: 'modern',
    badge: 'HOT',
    price: 4900, origPrice: 9900, minutes: 3, rating: 4.9, reviews: 2841, sales: 18420, hero: true,
    introCta: '그 사람의 진심, 펼쳐볼 준비 됐나요?',
    counsel: [
      '읽씹 당한 그 메시지, 마음에 걸리죠.',
      '사람은 말하지 못한 감정을\n사주의 결에 남겨둔답니다.',
      '그 사람의 마음이 지금 어디로 기울어 있는지\n조용히 들여다볼게요.',
    ],
  },
  {
    id: 'money-this-year',
    title: '올해 재물운',
    subtitle: '2026, 돈이 들어오는 길목을 짚다',
    category: 'money',
    poster: 'gold',
    theme: 'modern',
    badge: 'NEW',
    price: 5900, origPrice: 11000, minutes: 4, rating: 4.8, reviews: 1620, sales: 9930, hero: true,
    introCta: '올해 당신의 재물문을 열어볼까요?',
    counsel: [
      '돈은 아무 때나 들어오지 않아요.',
      '들어오는 ‘때’와 ‘문’이 따로 있지요.',
      '올해 당신의 재성이 어느 계절에 움직이는지\n같이 짚어드릴게요.',
    ],
  },
  {
    id: 'marriage-timing',
    title: '결혼 타이밍',
    subtitle: '나는 언제, 어떤 사람과 맺어질까',
    category: 'marriage',
    poster: 'rose',
    theme: 'modern',
    price: 6900, origPrice: 13000, minutes: 5, rating: 4.7, reviews: 980, sales: 6120, hero: true,
    introCta: '당신의 결혼운을 펼쳐볼까요?',
    counsel: [
      '결혼은 사랑만으로 정해지지 않아요.',
      '인연이 무르익는 ‘때’가 따로 있답니다.',
      '당신의 배우자성이 어느 해에 들어오는지\n함께 살펴봐요.',
    ],
  },
  {
    id: 'love-charm',
    title: '나의 매력과 연애 성향',
    subtitle: '사람을 끌어당기는 나만의 무기',
    category: 'love',
    poster: 'magenta',
    theme: 'modern',
    badge: 'HOT',
    price: 3900, origPrice: 7900, minutes: 3, rating: 4.8, reviews: 4210, sales: 30120, hero: true,
    introCta: '내 안의 매력살, 깨워볼까요?',
    counsel: [
      '당신에겐 분명, 사람을 끌어당기는 살이 있어요.',
      '도화·홍염·천을… 결마다 매력이 다르지요.',
      '당신의 매력이 어떤 빛을 내는지\n제가 읽어드릴게요.',
    ],
  },
  {
    id: 'match-couple',
    title: '우리 궁합',
    subtitle: '두 사람의 인연을 깊이 들여다보다',
    category: 'match',
    poster: 'sunset',
    theme: 'modern',
    price: 6900, origPrice: 13900, minutes: 5, rating: 4.8, reviews: 1740, sales: 11200,
    introCta: '두 사람의 궁합을 겹쳐볼까요?',
    counsel: [
      '좋아하는 마음은 알겠는데, 잘 맞을지 불안하죠.',
      '두 사주의 오행이 어떻게 섞이는지 보면\n많은 게 보인답니다.',
      '두 사람의 인연을 천천히 풀어드릴게요.',
    ],
  },
  {
    id: 'career-path',
    title: '나는 뭘로 돈을 벌까',
    subtitle: '타고난 적성과 직업운의 방향',
    category: 'career',
    poster: 'ice',
    theme: 'modern',
    price: 5900, origPrice: 11900, minutes: 4, rating: 4.7, reviews: 860, sales: 5400,
    introCta: '당신의 직업 그릇을 확인할까요?',
    counsel: [
      '남들 다 가는 길이, 내 길은 아닐 수 있어요.',
      '식상과 관성은 당신만의 무대를 가리킨답니다.',
      '타고난 재능이 어디로 향하는지 같이 찾아봐요.',
    ],
  },
  {
    id: 'overall-2026',
    title: '2026 종합 운세',
    subtitle: '한 해의 큰 흐름을 한눈에',
    category: 'overall',
    poster: 'midnight',
    theme: 'modern',
    badge: 'NEW',
    price: 7900, origPrice: 15900, minutes: 6, rating: 4.9, reviews: 2010, sales: 14300,
    introCta: '2026년 전체 흐름을 열어볼까요?',
    counsel: [
      '새해가 밝았네요. 올해는 좀 다를까, 궁금하시죠.',
      '재물·애정·건강·관계, 어느 문이 열릴지\n흐름을 읽어드릴게요.',
      '당신의 한 해 지도를 같이 펼쳐봐요.',
    ],
  },
  {
    id: 'love-some',
    title: '썸, 연애로 이어질까',
    subtitle: '아슬아슬한 그 관계의 결말',
    category: 'love',
    poster: 'ember',
    theme: 'modern',
    price: 3900, origPrice: 7900, minutes: 3, rating: 4.8, reviews: 1990, sales: 12600,
    introCta: '이 썸의 끝을 미리 볼까요?',
    counsel: [
      '친구도 연인도 아닌, 그 애매한 거리.',
      '두 사람의 기운이 가까워지는 때가 있어요.',
      '이 썸이 어디로 흐를지 함께 봐드릴게요.',
    ],
  },
  {
    id: 'fun-today',
    title: '오늘의 한 줄 운세',
    subtitle: '딱 3분, 오늘 하루의 기운',
    category: 'fun',
    poster: 'noir',
    theme: 'modern',
    badge: '1위',
    price: 900, minutes: 1, rating: 4.7, reviews: 8800, sales: 52000,
    introCta: '오늘의 운세를 뽑아볼까요?',
    counsel: [
      '오늘 하루, 어떤 기운으로 시작할까요?',
      '아침의 한 줄이 하루의 결을 바꾼답니다.',
      '오늘의 기운을 가볍게 받아가세요.',
    ],
  },
  {
    id: 'reunion-closure',
    title: '이 인연, 정리해야 할까',
    subtitle: '붙잡을지 놓을지 망설이는 당신에게',
    category: 'reunion',
    poster: 'noir',
    theme: 'modern',
    price: 4900, origPrice: 9900, minutes: 3, rating: 4.8, reviews: 1120, sales: 7400,
    introCta: '이 인연의 답을 들어볼까요?',
    counsel: [
      '붙잡는 것도, 놓는 것도 용기가 필요하죠.',
      '두 사람의 인연선이 아직 이어져 있는지\n끊겼는지 살펴볼게요.',
      '당신의 마음이 가벼워지도록 도와드릴게요.',
    ],
  },
]

// ── 카테고리 섹션 (홈) ────────────────────────────────────────────────
export interface Section { id: string; title: string; desc: string; productIds: string[] }

export const sections: Section[] = [
  { id: 'sec-love', title: '연애·썸', desc: '헷갈리는 마음을 확인하고 싶다면',
    productIds: ['love-hidden-heart', 'love-some', 'match-couple', 'love-charm'] },
  { id: 'sec-money', title: '재물·커리어', desc: '나는 뭘로 돈을 벌까',
    productIds: ['money-this-year', 'career-path', 'overall-classic', 'overall-2026'] },
  { id: 'sec-reunion', title: '재회', desc: '잊을 수 없는 사람이 있다면',
    productIds: ['reunion-comeback', 'reunion-closure', 'love-hidden-heart', 'match-couple'] },
]

// ── 가볍게 보는 3분 운세 랭킹 ────────────────────────────────────────
export interface RankItem { rank: number; productId: string; oneLine: string }
export const ranking: RankItem[] = [
  { rank: 1, productId: 'fun-today', oneLine: '딱 3분, 오늘 하루의 기운을 한 줄로' },
  { rank: 2, productId: 'love-charm', oneLine: '사람을 끌어당기는 나만의 매력살' },
  { rank: 3, productId: 'love-some', oneLine: '이 썸, 연애로 이어질 확률은?' },
]

// ── 리얼 후기 피드 ───────────────────────────────────────────────────
export interface Review {
  id: string; productId: string; nickname: string; rating: number
  sales: number; when: string; text: string
}
export const reviews: Review[] = [
  { id: 'r1', productId: 'reunion-comeback', nickname: '달밤의산책', rating: 5, sales: 21050, when: '2시간 전',
    text: '소름… 헤어진 달이랑 다시 연락 온 시기가 거의 맞았어요. 마음이 좀 정리됐습니다.' },
  { id: 'r2', productId: 'love-hidden-heart', nickname: '민트초코노', rating: 5, sales: 18420, when: '5시간 전',
    text: '읽씹 당하고 멘붕이었는데 ㅋㅋ 그 사람 성향 설명이 너무 정확해서 위로받고 갑니다.' },
  { id: 'r3', productId: 'overall-classic', nickname: '서래마을J', rating: 5, sales: 26800, when: '오늘',
    text: '명식이랑 대운 설명이 진짜 정통이라 신뢰감 들었어요. 미리보기만으로도 분량이 꽤 됨.' },
  { id: 'r4', productId: 'money-this-year', nickname: '통장요정', rating: 4, sales: 9930, when: '어제',
    text: '돈 들어오는 달 짚어준 게 신기함. 반신반의했는데 이번 달 보너스 진짜 들어옴 ㄷㄷ' },
  { id: 'r5', productId: 'love-charm', nickname: 'ㅇㅇ', rating: 5, sales: 30120, when: '어제',
    text: '재미로 봤는데 친구들이랑 돌려보면서 빵 터짐. 매력살 해석이 은근 정확해요.' },
  { id: 'r6', productId: 'marriage-timing', nickname: '봄날의곰', rating: 5, sales: 6120, when: '2일 전',
    text: '결혼 압박 받던 와중에 봤는데 시기 설명이 구체적이라 마음이 한결 편해졌어요.' },
]

// =============================================================================
// 무료 미리보기 리포트 — 입력값 기반 개인화 (추후 리포트 생성 API로 교체)
// =============================================================================
export type Element = '목' | '화' | '토' | '금' | '수'
export const elementColor: Record<Element, string> = {
  목: '#3fb27f', 화: '#ff5a5a', 토: '#e0a83c', 금: '#cdd2de', 수: '#4aa3ff',
}

export interface Pillar { label: string; stem: string; branch: string; stemEl: Element; branchEl: Element }
export interface DaeunStep { age: number; gz: string; mood: string; score: number }
export interface PreviewSection { title: string; body: string }
export interface LockedSection { title: string; teaser: string; full: string }
export interface FlowPoint { label: string; money: number; love: number }

export interface Report {
  name: string
  topic: string
  pillars: Pillar[]
  ohaeng: { el: Element; value: number }[]
  daeun: DaeunStep[]
  flow: FlowPoint[]
  oneLine: string
  dominant: Element
  weak: Element
  preview: PreviewSection[]
  locked: LockedSection[]
}

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const STEM_EL: Element[] = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수']
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const BRANCH_EL: Element[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수']
const ANIMAL = ['쥐', '소', '범', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const pillar = (i: number, label: string): Pillar => {
  const s = i % 10, b = i % 12
  return { label, stem: STEMS[s], branch: BRANCHES[b], stemEl: STEM_EL[s], branchEl: BRANCH_EL[b] }
}

export function buildReport(name: string, topic: string): Report {
  const safeName = name.trim() || '그대'
  const h = hash(safeName + topic)
  const yi = h % 60, mi = (h >> 3) % 60, di = (h >> 6) % 60, ti = (h >> 9) % 60

  const pillars = [pillar(yi, '년주'), pillar(mi, '월주'), pillar(di, '일주'), pillar(ti, '시주')]

  // 오행 분포 — 명식에서 집계 후 약간의 변주
  const base: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  pillars.forEach((p) => { base[p.stemEl] += 1; base[p.branchEl] += 1 })
  ;(['목', '화', '토', '금', '수'] as Element[]).forEach((e, k) => { base[e] += (h >> (k + 2)) % 2 })
  const total = Object.values(base).reduce((a, b) => a + b, 0) || 1
  const ohaeng = (['목', '화', '토', '금', '수'] as Element[]).map((el) => ({
    el, value: Math.round((base[el] / total) * 100),
  }))
  const sorted = [...ohaeng].sort((a, b) => b.value - a.value)
  const dominant = sorted[0].el, weak = sorted[sorted.length - 1].el

  const daeunMoods = ['도약', '안정', '시련', '확장', '결실', '전환', '회복', '비상']
  const daeun: DaeunStep[] = Array.from({ length: 7 }).map((_, i) => ({
    age: 8 + i * 10,
    gz: STEMS[(di + i) % 10] + BRANCHES[(di + i) % 12],
    mood: daeunMoods[(h >> i) % daeunMoods.length],
    score: 45 + ((h >> (i + 1)) % 50),
  }))

  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const flow: FlowPoint[] = months.map((label, i) => ({
    label,
    money: 35 + Math.round(40 * Math.abs(Math.sin((i + (h % 6)) / 1.9))),
    love: 30 + Math.round(45 * Math.abs(Math.cos((i + (h % 5)) / 2.1))),
  }))

  const dayAnimal = ANIMAL[di % 12]
  const dayStemEl = pillars[2].stemEl
  const elTrait: Record<Element, string> = {
    목: '곧게 뻗어 나가려는 성장의 기운',
    화: '주변을 밝히는 뜨겁고 빠른 기운',
    토: '쉽게 흔들리지 않는 단단한 기운',
    금: '맺고 끊음이 분명한 단단한 기운',
    수: '깊고 유연하게 스며드는 기운',
  }

  const preview: PreviewSection[] = [
    {
      title: '한 줄 성향 풀이',
      body: `${safeName} 님의 일간은 ${dayStemEl}의 기운을 타고났어요. ${elTrait[dayStemEl]}을 품고 있어, 겉으로는 부드러워 보여도 속에는 분명한 심지가 있는 사람입니다.`,
    },
    {
      title: '타고난 기운(일주) 이야기',
      body: `당신의 일주는 ‘${pillars[2].stem}${pillars[2].branch}(${dayAnimal})’의 상(象)을 지녔습니다. 사람들 사이에서 은근한 존재감을 내는 자리예요. 다만 ${weak}의 기운이 옅어, 그 부분을 채워줄 인연과 환경을 만나면 운이 크게 트입니다.`,
    },
    {
      title: '오행 균형 요약',
      body: `오행 중 ${dominant}이(가) 가장 강하고 ${weak}이(가) 약합니다. ${dominant}의 강함은 추진력으로 쓰이지만, 지나치면 조급함이 되기도 해요. ${weak}을 보완하는 색·방향·사람을 가까이 두면 흐름이 한결 매끄러워집니다.`,
    },
    {
      title: '대운 흐름 한눈에',
      body: `현재 당신은 ‘${daeun[2].mood}’의 대운을 지나는 중입니다. 다가오는 ${daeun[3].age}세 전후의 대운에서 큰 ‘${daeun[3].mood}’의 문이 열립니다. 이 시기를 어떻게 준비하느냐가 이후 10년의 결을 좌우해요.`,
    },
  ]

  const bestMoney = flow.reduce((a, b) => (b.money > a.money ? b : a)).label
  const bestLove = flow.reduce((a, b) => (b.love > a.love ? b : a)).label
  const locked: LockedSection[] = [
    {
      title: '나에게 찾아올 중요한 기회 5가지',
      teaser: '첫 번째 기회는 의외로 ‘사람’을 통해 들어옵니다. 그 사람의 특징은…',
      full: `① ${bestMoney} 무렵, 오래 알던 사람을 통해 뜻밖의 제안이 들어옵니다. ② ${daeun[3].age}세 전후 대운의 ‘${daeun[3].mood}’ 흐름에서 ${dominant}의 기운을 살린 일이 크게 열려요. ③ ${weak}을(를) 보완해 주는 동업·협업 인연이 한 번 찾아옵니다. ④ 익숙한 분야가 아닌, 살짝 낯선 영역에서 재능이 인정받는 기회가 있어요. ⑤ 건강·습관을 다잡는 시기가 곧 재물·관계의 기회로 이어집니다. 이 다섯 중 최소 둘은 ‘먼저 손 내미는 쪽’이 잡습니다.`,
    },
    {
      title: '피해야 할 사람의 특징',
      teaser: '당신의 기운을 빼앗아 가는 유형이 분명히 있어요. 특히 …월에 만나는…',
      full: `당신의 ${dominant} 기운을 자기 쪽으로만 끌어쓰는 사람을 조심하세요. 말이 앞서고 약속을 가볍게 여기는 유형, 그리고 당신이 ${weak}이 약한 점을 파고들어 결정을 대신하려는 사람이 특히 그렇습니다. 감정 기복이 커서 당신을 자주 ‘맞춰주는 사람’으로 만드는 관계라면, 거리를 두는 것이 운의 흐름을 지키는 길이에요.`,
    },
    {
      title: '재물운이 상승하는 결정적 시기',
      teaser: `재성이 가장 강하게 들어오는 달은 ${bestMoney} 전후로…`,
      full: `재성이 가장 강하게 들어오는 시기는 ${bestMoney} 전후입니다. 이때는 새로운 수입원을 ‘시작’하기 좋고, 그 반대로 ${flow.reduce((a, b) => (b.money < a.money ? b : a)).label} 무렵은 큰 지출·투자를 미루는 편이 좋아요. 목돈은 한 번에 들어오기보다 ${dominant}의 기운이 강해지는 흐름을 따라 단계적으로 불어납니다. 무리한 레버리지보다 꾸준함이 당신의 재물 그릇을 키웁니다.`,
    },
    {
      title: '연애·결혼의 결정적 타이밍',
      teaser: '당신의 인연이 무르익는 해가 따로 있습니다. 그 시작은…',
      full: `애정의 기운이 가장 무르익는 달은 ${bestLove} 전후입니다. 인연은 ‘새로운 자리’보다 이미 당신 곁에 있던 관계가 깊어지는 형태로 옵니다. ${daeun[3].age}세 전후 대운에서 배우자성이 또렷해지니, 결정을 서두르기보다 이 흐름에 맞춰 진심을 표현하는 것이 좋아요. 당신이 ${weak}을(를) 채워주는 사람과 만날 때 관계가 가장 안정됩니다.`,
    },
    {
      title: '올해 조심해야 할 위기와 대처법',
      teaser: '한 번의 고비가 예정되어 있어요. 다만 미리 알면 충분히…',
      full: `‘${daeun[2].mood}’의 대운을 지나는 올해, 한 번의 고비가 건강 혹은 사람 사이에서 찾아올 수 있어요. 다만 미리 알면 충분히 넘길 수 있는 수준입니다. 무리한 확장과 즉흥적인 결정을 피하고, ${weak}의 기운을 보완하는 휴식·정리의 시간을 가지세요. 고비를 넘긴 직후가 오히려 가장 크게 도약하는 구간입니다.`,
    },
  ]

  const oneLine = `겉은 부드럽되 속은 단단한, ${dominant}의 사람`

  return { name: safeName, topic, pillars, ohaeng, daeun, flow, oneLine, dominant, weak, preview, locked }
}

// ── 결제/혜택 ────────────────────────────────────────────────────────
export const promo = {
  couponWon: 3000,
  benefitMinutes: 30, // 남은 혜택 시간(쿠폰 유효)
}

// ── 입력 폼 옵션 ─────────────────────────────────────────────────────
export const interests = ['연애', '재물', '직업', '결혼', '재회', '인간관계', '올해 운세']
export const loveStates = ['솔로', '썸 타는 중', '연애 중', '이별 직후', '재회 고민']
export const jobStates = ['학생', '직장인', '구직 중', '사업·프리랜서', '이직 고민']

// ── 유틸 ─────────────────────────────────────────────────────────────
export const byId = (id: string) => products.find((p) => p.id === id)!
export const krw = (n: number) => n.toLocaleString('ko-KR') + '원'
