import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  color?: string;
}

export const EmptyState: React.FC<Props> = ({ icon, title, subtitle, actionLabel, onAction, color = '#8B949E' }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.surface : colors.card }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <View style={[styles.iconInner, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons name={icon as any} size={36} color={color} />
        </View>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color + '18' }]} onPress={onAction}>
          <Text style={[styles.actionText, { color }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: -0.1,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
