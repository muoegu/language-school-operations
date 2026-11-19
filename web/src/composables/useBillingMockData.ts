import { computed, ref } from 'vue'

export type BillingTextbook = {
  id: string
  title: string
  publisher: string
  price: number
  status: '販売中' | '取扱終了'
}

export type BillingLesson = {
  id: string
  title: string
  level: string
  durationMinutes: number
  fee: number
}

export type MockPaymentRecord = {
  id: string
  studentId: string
  purchasedAt: string
  ticketCount: number
  lessonCount: number
  remainingLessons: number
  consumedDates: Array<string | null>
  lessonAmount: number
  otherAmount: number
  amount: number
  paymentStatus: '入金済み' | '未入金'
  billingStatus: '請求済み' | '請求なし' | '入金済み'
  ticketStatus: '未使用' | '利用中' | '消化済み'
  lessonIds: string[]
  textbookIds: string[]
  note: string
}

export const TICKET_LESSONS = 5

const textbooks = ref<BillingTextbook[]>([
  {
    id: 'textbook-1',
    title: 'みんなの日本語 初級 I',
    publisher: 'スリーエーネットワーク',
    price: 2750,
    status: '販売中',
  },
  { id: 'textbook-2', title: '中級から学ぶ日本語', publisher: '研究社', price: 3080, status: '販売中' },
  { id: 'textbook-3', title: 'ニュースで学ぶ日本語', publisher: 'ポートフォリオ出版', price: 2200, status: '取扱終了' },
])

const lessons = ref<BillingLesson[]>([
  { id: 'lesson-price-1', title: 'マンツーマン会話 60分', level: '全レベル', durationMinutes: 60, fee: 4500 },
  { id: 'lesson-price-2', title: 'マンツーマン会話 90分', level: '全レベル', durationMinutes: 90, fee: 6200 },
  { id: 'lesson-price-3', title: 'ビジネス日本語', level: 'intermediate以上', durationMinutes: 60, fee: 5200 },
])

const paymentRecords = ref<MockPaymentRecord[]>([])

function ensureRecords(studentId: string) {
  if (paymentRecords.value.some((record) => record.studentId === studentId)) return
  paymentRecords.value.push({
    id: `payment-${studentId}-1`,
    studentId,
    purchasedAt: '2026-10-20T10:00:00+08:00',
    ticketCount: 1,
    lessonCount: TICKET_LESSONS,
    remainingLessons: 2,
    consumedDates: ['2026-10-25', '2026-11-01', '2026-11-08', null, null],
    lessonAmount: 22500,
    otherAmount: 2750,
    amount: 25250,
    paymentStatus: '入金済み',
    billingStatus: '請求済み',
    ticketStatus: '利用中',
    lessonIds: ['lesson-price-1'],
    textbookIds: ['textbook-1'],
    note: '初回チケット購入（ダミーデータ）',
  })
}

export function useBillingMockData() {
  function saveTextbook(input: Omit<BillingTextbook, 'id'>, id?: string) {
    if (id) {
      const index = textbooks.value.findIndex((item) => item.id === id)
      if (index >= 0) textbooks.value[index] = { id, ...input }
      return
    }
    textbooks.value.unshift({ id: `textbook-${Date.now()}`, ...input })
  }

  function deleteTextbook(id: string) {
    textbooks.value = textbooks.value.filter((item) => item.id !== id)
  }

  function saveLesson(input: Omit<BillingLesson, 'id'>, id?: string) {
    if (id) {
      const index = lessons.value.findIndex((item) => item.id === id)
      if (index >= 0) lessons.value[index] = { id, ...input }
      return
    }
    lessons.value.unshift({ id: `lesson-price-${Date.now()}`, ...input })
  }

  function deleteLesson(id: string) {
    lessons.value = lessons.value.filter((item) => item.id !== id)
  }

  const getPaymentRecords = (studentId: string) => {
    ensureRecords(studentId)
    return computed(() => paymentRecords.value.filter((record) => record.studentId === studentId))
  }

  const getRemainingLessons = (studentId: string) =>
    computed(() =>
      paymentRecords.value
        .filter((record) => record.studentId === studentId && record.paymentStatus === '入金済み')
        .reduce((total, record) => total + record.remainingLessons, 0),
    )

  function purchaseTicket(input: {
    studentId: string
    ticketCount: number
    lessonId: string
    textbookIds: string[]
    note: string
  }) {
    const lesson = lessons.value.find((item) => item.id === input.lessonId) ?? lessons.value[0]
    const textbookAmount = input.textbookIds.reduce(
      (total, id) => total + (textbooks.value.find((item) => item.id === id)?.price ?? 0),
      0,
    )
    const lessonCount = input.ticketCount * TICKET_LESSONS
    const lessonAmount = lesson.fee * input.ticketCount * TICKET_LESSONS
    paymentRecords.value.unshift({
      id: `payment-${Date.now()}`,
      studentId: input.studentId,
      purchasedAt: new Date().toISOString(),
      ticketCount: input.ticketCount,
      lessonCount,
      remainingLessons: lessonCount,
      consumedDates: Array.from({ length: lessonCount }, () => null),
      lessonAmount,
      otherAmount: textbookAmount,
      amount: lessonAmount + textbookAmount,
      paymentStatus: '入金済み',
      billingStatus: '請求済み',
      ticketStatus: '未使用',
      lessonIds: [lesson.id],
      textbookIds: input.textbookIds,
      note: input.note.trim() || 'チケット購入（ダミーデータ）',
    })
  }

  function setLessonCompleted(recordId: string, index: number, date: string) {
    const record = paymentRecords.value.find((item) => item.id === recordId)
    if (!record || index < 0 || index >= record.consumedDates.length) return
    record.consumedDates[index] = date || null
    const completedCount = record.consumedDates.filter(Boolean).length
    record.remainingLessons = record.lessonCount - completedCount
    record.ticketStatus =
      completedCount === 0 ? '未使用' : completedCount === record.lessonCount ? '消化済み' : '利用中'
  }

  return {
    textbooks,
    lessons,
    paymentRecords,
    getPaymentRecords,
    getRemainingLessons,
    purchaseTicket,
    setLessonCompleted,
    saveTextbook,
    deleteTextbook,
    saveLesson,
    deleteLesson,
  }
}
