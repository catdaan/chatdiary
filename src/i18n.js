import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';
import zhTW from './locales/zh-TW.json';
import ja from './locales/ja.json';

// Get saved language from localStorage or default to 'zh' (since the user asked for translation)
// or 'en' if we want to stick to the original default.
// Let's check navigator.language as well.
const getInitialLanguage = () => {
  const saved = localStorage.getItem('i18nextLng');
  if (saved) return saved;
  
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang) {
    if (browserLang.toLowerCase() === 'zh-tw' || browserLang.toLowerCase() === 'zh-hk') {
      return 'zh-TW';
    }
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }
    if (browserLang.startsWith('ja')) {
      return 'ja';
    }
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      'en-US': {
        translation: en
      },
      zh: {
        translation: zh
      },
      'zh-CN': {
        translation: zh
      },
      'zh-TW': {
        translation: zhTW
      },
      'zh-HK': {
        translation: zhTW
      },
      ja: {
        translation: ja
      }
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
