import { useThemeStore } from '../stores/themeStore';

export const useTheme = () => {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  return { colors, isDark };
};
