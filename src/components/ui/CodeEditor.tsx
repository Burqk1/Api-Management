import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CodeEditorProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
  minHeight?: number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  label,
  containerStyle,
  minHeight = 150,
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
        multiline
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.editor,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            minHeight,
          },
          style,
        ]}
        {...props}
      />
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
  editor: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'monospace',
    lineHeight: 22,
  },
});
