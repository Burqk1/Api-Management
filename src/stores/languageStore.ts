import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations } from '../constants/translations';

interface LanguageState {
  language: Language;
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
  initialize: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',

  t: (key: string) => {
    const lang = get().language;
    return translations[lang][key] || translations.en[key] || key;
  },

  setLanguage: (language: Language) => {
    AsyncStorage.setItem('language', language);
    set({ language });
  },

  initialize: async () => {
    const saved = (await AsyncStorage.getItem('language')) as Language | null;
    if (saved && translations[saved]) {
      set({ language: saved });
    }
  },
}));
