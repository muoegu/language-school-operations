import { createI18n } from 'vue-i18n'

import ja from './locales/ja.json'
import zhTW from './locales/zh-TW.json'

export const supportedLocales = ['ja', 'zh-TW'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

const initialLocale: SupportedLocale = (() => {
  const saved = localStorage.getItem('portfolio-locale')
  return saved === 'zh-TW' ? 'zh-TW' : 'ja'
})()

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'ja',
  messages: {
    ja,
    'zh-TW': zhTW,
  },
})
