import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  containerStyle,
  error,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
          },
          error && { borderWidth: 1, borderColor: colors.error },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  error: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
});
