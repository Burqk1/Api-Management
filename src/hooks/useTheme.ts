import { useThemeStore } from '../stores/themeStore';

export const useTheme = () => {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAccentColor = useThemeStore((s) => s.setAccentColor);
  return { colors, isDark, setTheme, setAccentColor };
};
