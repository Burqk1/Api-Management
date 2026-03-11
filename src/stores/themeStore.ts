import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { Colors, ThemeColors, ThemeName } from '../constants/colors';

interface ThemeState {
  themeName: ThemeName;
  colors: ThemeColors;
  isDark: boolean;
  accentColor: string | null;
  setTheme: (theme: ThemeName) => Promise<void>;
  setAccentColor: (color: string | null) => Promise<void>;
  initialize: () => Promise<void>;
}

const getResolvedTheme = (themeName: ThemeName): 'dark' | 'light' => {
  if (themeName === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return themeName;
};

const applyAccent = (base: ThemeColors, accent: string | null): ThemeColors => {
  if (!accent) return base;
  return { ...base, primary: accent, primaryLight: accent + '33' };
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeName: 'dark',
  colors: Colors.dark,
  isDark: true,
  accentColor: null,

  setTheme: async (themeName: ThemeName) => {
    const resolved = getResolvedTheme(themeName);
    set({
      themeName,
      colors: applyAccent(Colors[resolved], get().accentColor),
      isDark: resolved === 'dark',
    });
    await AsyncStorage.setItem('theme', themeName).catch((e) =>
      console.warn('[themeStore] Failed to persist theme:', e),
    );
  },

  setAccentColor: async (color: string | null) => {
    const resolved = getResolvedTheme(get().themeName);
    set({
      accentColor: color,
      colors: applyAccent(Colors[resolved], color),
    });
    await AsyncStorage.setItem('accent_color', JSON.stringify(color)).catch((e) =>
      console.warn('[themeStore] Failed to persist accent color:', e),
    );
  },

  initialize: async () => {
    try {
      const [saved, accentSaved] = await Promise.all([
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('accent_color'),
      ]);
      const themeName = (saved as ThemeName) || 'dark';
      const accentColor = accentSaved ? JSON.parse(accentSaved) : null;
      const resolved = getResolvedTheme(themeName);
      set({
        themeName,
        accentColor,
        colors: applyAccent(Colors[resolved], accentColor),
        isDark: resolved === 'dark',
      });
    } catch (e) {
      console.warn('[themeStore] Failed to initialize:', e);
    }
  },
}));
