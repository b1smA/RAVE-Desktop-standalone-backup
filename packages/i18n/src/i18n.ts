import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en_US from './locales/en_US.json';

export const resources = {
  en_US,
} as const;

type TranslationResource = Record<string, object>;
type TranslationModule = { default: TranslationResource };

const languageLoaders: Record<string, () => Promise<TranslationModule>> = {
  de_DE: () => import('./locales/de_DE.json'),
  es_ES: () => import('./locales/es_ES.json'),
  fr_FR: () => import('./locales/fr_FR.json'),
  it_IT: () => import('./locales/it_IT.json'),
  ja_JP: () => import('./locales/ja_JP.json'),
  pl_PL: () => import('./locales/pl_PL.json'),
  pt_BR: () => import('./locales/pt_BR.json'),
  ru_RU: () => import('./locales/ru_RU.json'),
  zh_CN: () => import('./locales/zh_CN.json'),
};

const pendingLanguages = new Map<string, Promise<string>>();

export const loadLanguage = async (locale: string): Promise<string> => {
  if (locale === 'en_US' || i18n.hasResourceBundle(locale, 'common')) {
    return locale;
  }

  const loader = languageLoaders[locale];
  if (!loader) {
    return 'en_US';
  }

  const existingLoad = pendingLanguages.get(locale);
  if (existingLoad) {
    return existingLoad;
  }

  const languageLoad = loader()
    .then(({ default: translations }) => {
      Object.entries(translations).forEach(([namespace, resource]) => {
        i18n.addResourceBundle(locale, namespace, resource, true, true);
      });
      return locale;
    })
    .catch(() => 'en_US')
    .finally(() => pendingLanguages.delete(locale));
  pendingLanguages.set(locale, languageLoad);

  return languageLoad;
};

i18n.use(initReactI18next).init({
  showSupportNotice: false,
  resources,
  lng: 'en_US',
  fallbackLng: 'en_US',
  defaultNS: 'common',
  ns: [
    'common',
    'navigation',
    'search',
    'artist',
    'themes',
    'settings',
    'dashboard',
    'plugins',
    'streaming',
  ],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: true,
  },
});

export default i18n;
