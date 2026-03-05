import React from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { CopyButton } from './CopyButton';

interface OutputBoxProps {
  label?: string;
  value: string;
  maxHeight?: number;
  style?: ViewStyle;
  showCopy?: boolean;
}

export const OutputBox: React.FC<OutputBoxProps> = ({
  label,
  value,
  maxHeight = 300,
  style,
  showCopy = true,
}) => {
  const { colors } = useTheme();

  return (
    <View style={style}>
      <View style={styles.header}>
        {label && (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        )}
        {showCopy && value.length > 0 && <CopyButton text={value} />}
      </View>
      <ScrollView
        style={[
          styles.box,
          {
            backgroundColor: colors.surface,
            maxHeight,
          },
        ]}
        nestedScrollEnabled
      >
        <Text
          style={[styles.text, { color: value ? colors.text : colors.textTertiary }]}
          selectable
        >
          {value || 'Output will appear here...'}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  box: {
    borderRadius: 12,
    padding: 16,
  },
  text: {
    fontSize: 15,
    fontFamily: 'monospace',
    lineHeight: 22,
  },
});
