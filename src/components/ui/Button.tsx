import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { colors } = useTheme();

  const bgColors = {
    primary: colors.primary,
    secondary: colors.surface,
    outline: 'transparent',
    ghost: 'transparent',
  };

  const textColors = {
    primary: '#FFFFFF',
    secondary: colors.primary,
    outline: colors.primary,
    ghost: colors.primary,
  };

  const heights = { sm: 34, md: 50, lg: 56 };
  const fontSizes = { sm: 15, md: 17, lg: 19 };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.6}
      style={[
        styles.base,
        {
          backgroundColor: bgColors[variant],
          height: heights[size],
          opacity: disabled ? 0.4 : 1,
          borderRadius: 14,
        },
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: textColors[variant],
                fontSize: fontSizes[size],
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontWeight: '600',
    letterSpacing: -0.4,
  },
});
