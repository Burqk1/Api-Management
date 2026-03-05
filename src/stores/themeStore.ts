import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { Colors, ThemeColors, ThemeName } from '../constants/colors';

interface ThemeState {
  themeName: ThemeName;
  colors: ThemeColors;
  isDark: boolean;
  accentColor: string | null;
  setTheme: (theme: ThemeName) => void;
  setAccentColor: (color: string | null) => void;
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
  return { ...base, primary: accent, primaryLight: accent + '20' };
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeName: 'dark',
  colors: Colors.dark,
  isDark: true,
  accentColor: null,

  setTheme: (themeName: ThemeName) => {
    const resolved = getResolvedTheme(themeName);
    AsyncStorage.setItem('theme', themeName);
    set({
      themeName,
      colors: applyAccent(Colors[resolved], get().accentColor),
      isDark: resolved === 'dark',
    });
  },

  setAccentColor: (color: string | null) => {
    AsyncStorage.setItem('accent_color', JSON.stringify(color));
    const resolved = getResolvedTheme(get().themeName);
    set({
      accentColor: color,
      colors: applyAccent(Colors[resolved], color),
    });
  },

  initialize: async () => {
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
  },
}));
